import { createServerFn } from "@tanstack/react-start";

export interface DocScene {
  image: string;
  credit: string;
  text: string;
  video?: string;
  videoStart?: number;
  mediaSource?: string;
  mediaType?: "imagen" | "video";
  /** Imagen de respaldo (archivo libre) por si la ilustración generada falla. */
  fallback?: string;
}

export interface DocResult {
  title: string;
  source: string;
  narration: string;
  scenes: DocScene[];
}

const UA = "CronosEstudio/1.0 (documental educativo)";

async function wiki(params: Record<string, string>, host: string) {
  const url = new URL(`https://${host}/w/api.php`);
  Object.entries({ format: "json", origin: "*", ...params }).forEach(([k, v]) =>
    url.searchParams.set(k, v),
  );
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error("No pudimos consultar el archivo histórico.");
  return (await res.json()) as any;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡"«])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && !s.startsWith("=="));
}

/** Texto sin acentos y en minúsculas, para comparar palabras. */
function norm(t: string) {
  return t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const STOP = new Set(
  ("de la el los las un una unos unas y o que en con por para del al se su sus como mas pero fue fueron era eran " +
    "este esta estos estas entre sobre desde hasta cuando donde tras ante bajo cada muy tambien ademas aunque " +
    "file jpg jpeg png webm ogv archivo image imagen photo foto video the of and in on at from with)")
    .split(/[\s)]+/)
    .filter(Boolean),
);

/** Palabras significativas de un texto (para medir si una imagen o clip encaja). */
function keywords(text: string): string[] {
  return norm(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
}

/**
 * Mide cuánto tiene que ver un archivo (por su nombre y metadatos) con el texto
 * de una escena: cuenta palabras clave compartidas, con más peso a las raras.
 */
function relevance(assetName: string, sceneKeywords: string[]): number {
  const bag = new Set(keywords(assetName));
  let score = 0;
  for (const w of new Set(sceneKeywords)) {
    if (bag.has(w)) score += 6;
    else if ([...bag].some((b) => b.startsWith(w.slice(0, 5)) || w.startsWith(b.slice(0, 5)))) score += 2;
  }
  return score;
}


// Tratamientos de estilo para las ilustraciones generadas (IA gratuita e
// ilimitada vía Pollinations: sin API key, sin créditos, sin límite de usos).
const ART_STYLE: Record<string, string> = {
  anime: "ilustración estilo anime de aventura, colores vibrantes, luz cinematográfica",
  documental: "fotografía documental realista, luz natural",
  archivo: "fotografía antigua en sepia, película vintage con grano",
  ilustrado: "ilustración a tinta de alto contraste, grabado histórico",
  pintura: "pintura al óleo cálida y saturada, pinceladas visibles",
};

export const buildDocumentary = createServerFn({ method: "POST" })
  .inputValidator((input: { topic: string; sceneCount?: number; visualStyle?: string; imageSource?: string }) => ({
    topic: String(input.topic ?? "").slice(0, 160).trim(),
    sceneCount: Math.min(Math.max(input.sceneCount ?? 6, 3), 10),
    visualStyle: String(input.visualStyle ?? "documental").slice(0, 30),
    imageSource: input.imageSource === "generada" ? ("generada" as const) : ("archivo" as const),
  }))
  .handler(async ({ data }): Promise<DocResult> => {
    if (data.topic.length < 3) throw new Error("Escribí un tema más largo.");

    // 1. Find the best matching Wikipedia article (Spanish)
    const search = await wiki(
      { action: "query", list: "search", srsearch: data.topic, srlimit: "1" },
      "es.wikipedia.org",
    );
    const title: string | undefined = search?.query?.search?.[0]?.title;
    if (!title)
      throw new Error("No encontramos información histórica sobre ese tema.");

    // 2. Get the article text
    const extractRes = await wiki(
      {
        action: "query",
        prop: "extracts",
        explaintext: "1",
        redirects: "1",
        titles: title,
      },
      "es.wikipedia.org",
    );
    const pages = extractRes?.query?.pages ?? {};
    const page: any = Object.values(pages)[0];
    const sentences = splitSentences(String(page?.extract ?? ""));
    if (!sentences.length)
      throw new Error("El archivo no tiene texto suficiente para este tema.");

    // 3. Free public-domain / Creative Commons images from Wikimedia Commons
    type Candidate = {
      image: string;
      credit: string;
      score: number;
      key: string;
      name: string;
      source?: string;
    };
    const candidates: Candidate[] = [];

    const JUNK =
      /(logo|icon|flag|bandera|coat[_ ]of[_ ]arms|escudo|seal|signature|firma|map|mapa|diagram|chart|graf|stub|banner|disambig|question_book|commons-|wikidata|wiki[_ ]?letter|barnstar|symbol|button|plaque|placa|qr[_ ]code|blank|template|edit-|arrow|star_|ambox|spectrum|graph|timeline|locator|compass|osm|satellite_map)/i;

    const GOOD =
      /(portrait|retrato|painting|pintura|oleo|óleo|photo|foto|fotograf|battle|batalla|monument|monumento|statue|estatua|ruins|ruinas|temple|templo|palace|palacio|castle|castillo|city|ciudad|landscape|paisaje|scene|escena|museum|museo|fresco|mural|engraving|grabado|illustration|ilustraci)/i;

    let relaxed = false;

    const pushFile = (info: any, fileTitle = "") => {
      const url: string | undefined = info?.thumburl ?? info?.url;
      if (!url) return;
      // Commons appends tracking params (?utm_...) — test the extension on the clean path
      const clean = String(info?.url ?? "").split("?")[0]!;
      if (!/\.(jpe?g|png|webp)$/i.test(clean)) return;
      const name = String(fileTitle) + " " + clean;
      if (JUNK.test(name)) return;

      const w = Number(info?.width ?? 0);
      const h = Number(info?.height ?? 0);
      const ratio = w && h ? w / h : 1.5;
      if (!relaxed) {
        if (w < 1200 || h < 800) return; // pedimos imágenes realmente nítidas
        if (ratio < 0.85 || ratio > 2.2) return; // recortes raros se ven mal a pantalla completa
      } else if (w && h && (w < 640 || h < 420)) return;

      const key = clean.split("/").pop()!.toLowerCase();
      if (candidates.some((c) => c.key === key)) return;

      // Puntuación: resolución, encuadre apaisado y pistas de contenido útil
      const megapixels = Math.min((w * h) / 1_000_000, 24);
      let score = megapixels * 3;
      score += ratio >= 1.3 && ratio <= 1.9 ? 14 : ratio >= 1 ? 6 : 0;
      if (GOOD.test(name)) score += 10;
      if (/\.(jpe?g)$/i.test(clean)) score += 2;

      const artist = String(info?.extmetadata?.Artist?.value ?? "")
        .replace(/<[^>]*>/g, "")
        .trim();
      const license = String(info?.extmetadata?.LicenseShortName?.value ?? "");
      const description = String(info?.extmetadata?.ImageDescription?.value ?? "")
        .replace(/<[^>]*>/g, " ")
        .slice(0, 300);
      const source = String(info?.descriptionurl ?? "").trim();
      candidates.push({
        image: url,
        key,
        score,
        // Nombre + descripción: es lo que usamos para saber a qué escena pertenece
        name: `${fileTitle} ${clean.split("/").pop()} ${description}`.replace(/[_%]/g, " "),
        credit: [artist, license, "Wikimedia Commons"].filter(Boolean).join(" · "),
        ...(source ? { source } : {}),
      });
    };

    const target = data.sceneCount * 4;

    // 3a. Commons keyword search (Spanish title + raw topic). Every source is free.
    for (const q of [title, data.topic]) {
      if (candidates.length >= target) break;
      try {
        const commons = await wiki(
          {
            action: "query",
            generator: "search",
            gsrsearch: `${q} filetype:bitmap`,
            gsrnamespace: "6",
            gsrlimit: "50",
            prop: "imageinfo",
            iiprop: "url|size|extmetadata",
            iiurlwidth: "2560",
          },
          "commons.wikimedia.org",
        );
        for (const f of Object.values(commons?.query?.pages ?? {}) as any[]) {
          pushFile(f?.imageinfo?.[0], String(f?.title ?? ""));
        }
      } catch {
        /* keep trying other sources */
      }
    }

    // 3b. Images embedded in the Wikipedia articles themselves (es + en)
    if (candidates.length < target) {
      const articleHosts: [string, string][] = [["es.wikipedia.org", title]];
      try {
        const enSearch = await wiki(
          { action: "query", list: "search", srsearch: data.topic, srlimit: "1" },
          "en.wikipedia.org",
        );
        const enTitle = enSearch?.query?.search?.[0]?.title;
        if (enTitle) articleHosts.push(["en.wikipedia.org", enTitle]);
      } catch {
        /* optional */
      }

      for (const [host, pageTitle] of articleHosts) {
        if (candidates.length >= target) break;
        try {
          const imgs = await wiki(
            {
              action: "query",
              titles: pageTitle,
              redirects: "1",
              generator: "images",
              gimlimit: "40",
              prop: "imageinfo",
              iiprop: "url|size|extmetadata",
              iiurlwidth: "2560",
            },
            host,
          );
          for (const f of Object.values(imgs?.query?.pages ?? {}) as any[]) {
            if (/\.svg$/i.test(String(f?.title ?? ""))) continue;
            pushFile(f?.imageinfo?.[0], String(f?.title ?? ""));
          }
        } catch {
          /* keep trying */
        }
      }
    }

    // 3b-bis. Relaxed pass if the quality filter left us short
    if (candidates.length < 3) {
      relaxed = true;
      try {
        const commons = await wiki(
          {
            action: "query",
            generator: "search",
            gsrsearch: `${title} filetype:bitmap`,
            gsrnamespace: "6",
            gsrlimit: "50",
            prop: "imageinfo",
            iiprop: "url|size|extmetadata",
            iiurlwidth: "2560",
          },
          "commons.wikimedia.org",
        );
        for (const f of Object.values(commons?.query?.pages ?? {}) as any[]) {
          pushFile(f?.imageinfo?.[0], String(f?.title ?? ""));
        }
      } catch {
        /* no hay más fuentes libres disponibles */
      }
    }





    // 4. Videos libres (Wikimedia Commons) — gratis e ilimitados.
    type Clip = {
      url: string;
      credit: string;
      duration: number;
      name: string;
      topical: number;
      source: string;
      formatScore: number;
    };
    const clips: Clip[] = [];
    const topicKw = keywords(`${title} ${data.topic}`);
    const mainKw = topicKw.slice(0, 4).join(" ");

    /** Busca clips libres para una consulta y guarda los que hablan del tema. */
    const harvestVideos = async (q: string) => {
      if (!q.trim()) return;
      try {
        const vids = await wiki(
          {
            action: "query",
            generator: "search",
            gsrsearch: `${q} filetype:video`,
            gsrnamespace: "6",
            gsrlimit: "20",
            prop: "imageinfo",
            iiprop: "url|size|mime|mediatype|extmetadata",
          },
          "commons.wikimedia.org",
        );
        for (const f of Object.values(vids?.query?.pages ?? {}) as any[]) {
          const info = f?.imageinfo?.[0];
          const original = String(info?.url ?? "").split("?")[0]!;
          // Sólo formatos reproducibles de forma nativa en navegadores modernos.
          if (!/\.(webm|ogv|ogg|mp4)$/i.test(original)) continue;
          const duration = Number(info?.duration ?? 0);
          if (duration < 5) continue;
          // Usamos el archivo que Commons confirma en la respuesta. Construir a mano
          // una URL transcodificada produce enlaces 404 cuando esa variante no existe.
          const url = original;
          if (clips.some((c) => c.url === url)) continue;
          const artist = String(info?.extmetadata?.Artist?.value ?? "")
            .replace(/<[^>]*>/g, "")
            .trim();
          const license = String(info?.extmetadata?.LicenseShortName?.value ?? "");
          const vdesc = String(info?.extmetadata?.ImageDescription?.value ?? "")
            .replace(/<[^>]*>/g, " ")
            .slice(0, 300);
          const name = `${String(f?.title ?? "")} ${original.split("/").pop() ?? ""} ${vdesc}`.replace(/[_%]/g, " ");
          // Descarte definitivo de clips ajenos al tema: si el video no comparte
          // ninguna palabra fuerte con el título/tema, no entra al documental.
          const topical = relevance(name, topicKw);
          if (topical < 6) continue;
          clips.push({
            url,
            duration,
            name,
            topical,
            credit: [artist, license, "Wikimedia Commons"].filter(Boolean).join(" · "),
            source: String(info?.descriptionurl ?? "") || `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(f?.title ?? ""))}`,
            formatScore: /\.mp4$/i.test(original) ? 3 : /\.webm$/i.test(original) ? 2 : 1,
          });
        }
      } catch {
        /* los videos son un extra opcional */
      }
    };

    for (const q of [title, data.topic, mainKw].filter((q, i, arr) => q && arr.indexOf(q) === i)) {
      if (clips.length >= 10) break;
      await harvestVideos(q);
    }


    const count = Math.min(data.sceneCount, Math.max(candidates.length, 3));

    // 5. Guion: repartimos las frases a lo largo de todo el artículo (arranque,
    // desarrollo y cierre) en vez de tomar sólo las primeras.
    const step = sentences.length > count ? sentences.length / count : 1;
    const script = Array.from(
      { length: count },
      (_, i) => sentences[Math.min(sentences.length - 1, Math.floor(i * step))]!,
    );

    // 6. Emparejamiento inteligente: cada escena se queda con la imagen o el
    // clip cuyo nombre y descripción mejor coinciden con lo que narra la voz.
    const sceneKw = script.map((t) => [...keywords(t), ...topicKw]);

    // 6-bis. Búsqueda dedicada por escena: tomamos el tiempo necesario para
    // pedirle a Commons material de lo que dice CADA frase (no sólo del tema
    // general). Así las imágenes y los clips acompañan de verdad al relato.
    const sceneQueries = script.map((t, i) => {
      const own = keywords(t)
        .filter((w) => !topicKw.includes(w))
        .slice(0, 3)
        .join(" ");
      return `${title} ${own || (sceneKw[i] ?? []).slice(0, 3).join(" ")}`.trim();
    });

    for (const q of [...new Set(sceneQueries)]) {
      try {
        const extra = await wiki(
          {
            action: "query",
            generator: "search",
            gsrsearch: `${q} filetype:bitmap`,
            gsrnamespace: "6",
            gsrlimit: "20",
            prop: "imageinfo",
            iiprop: "url|size|extmetadata",
            iiurlwidth: "2560",
          },
          "commons.wikimedia.org",
        );
        for (const f of Object.values(extra?.query?.pages ?? {}) as any[]) {
          pushFile(f?.imageinfo?.[0], String(f?.title ?? ""));
        }
      } catch {
        /* seguimos con lo que ya tenemos */
      }
      if (clips.length < 10) await harvestVideos(q);
    }

    const images = candidates.sort((a, b) => b.score - a.score);

    if (!images.length && data.imageSource !== "generada")
      throw new Error(
        "No encontramos imágenes libres adecuadas para ese tema. Probá con un hecho o personaje histórico más específico.",
      );


    const usedImages = new Set<string>();
    const chosenImages = sceneKw.map((kw, i) => {
      const best = images
        .filter((c) => !usedImages.has(c.key))
        .map((c) => {
          const r = relevance(c.name, kw);
          return { c, r, s: r * 10 + c.score / 12 };
        })
        .sort((a, b) => b.s - a.s)[0];
      if (best) usedImages.add(best.c.key);
      return best?.c ?? images[i % Math.max(images.length, 1)];
    });

    // Videos: todos los clips ya pasaron el filtro de tema, así que repartimos
    // los mejores por escena (sin repetir) y sólo cuando el clip tiene algo que
    // ver con la frase que se narra en ese momento.
    const maxVideos = Math.min(clips.length, Math.max(1, Math.round(count * 0.55)));
    const pairs = sceneKw
      .flatMap((kw, i) =>
        clips.map((c) => ({
          i,
          c,
          r: relevance(c.name, kw) + c.topical / 2 + c.formatScore,
        })),
      )
      .filter((p) => p.r >= 6)
      .sort((a, b) => b.r - a.r);


    const videoFor = new Map<number, Clip>();
    const usedClips = new Set<string>();
    // Primera pasada: separar los clips para que el montaje respire y alterne
    // naturalmente con fotografías u obras de archivo.
    for (const p of pairs) {
      if (videoFor.size >= maxVideos) break;
      if (videoFor.has(p.i) || usedClips.has(p.c.url)) continue;
      if (videoFor.has(p.i - 1) || videoFor.has(p.i + 1)) continue;
      videoFor.set(p.i, p.c);
      usedClips.add(p.c.url);
    }
    // Si hay pocos planos, completamos por relevancia aunque queden contiguos.
    for (const p of pairs) {
      if (videoFor.size >= maxVideos) break;
      if (videoFor.has(p.i) || usedClips.has(p.c.url)) continue;
      videoFor.set(p.i, p.c);
      usedClips.add(p.c.url);
    }

    const scenes: DocScene[] = script.map((text, i) => {
      const img = chosenImages[i];
      const clip = videoFor.get(i);

      const mediaSource = clip?.source ?? img?.source;
      return {
        image: img?.image ?? "",
        credit: clip ? clip.credit : (img?.credit ?? "Cronos Estudio"),
        text,
        ...(mediaSource ? { mediaSource } : {}),
        mediaType: clip ? "video" : "imagen",
        ...(clip
          ? {
              video: clip.url,
              videoStart:
                clip.duration > 30
                  ? Math.floor((clip.duration / 4) * (1 + (i % 3))) % Math.floor(clip.duration - 12)
                  : 0,
            }
          : {}),
      };
    });


    // Modo "ilustración generada": las imágenes se crean en el servidor con un
    // "estilo fijo" compartido por todas las escenas, así el documental entero
    // mantiene la misma dirección de arte. La foto de archivo queda de respaldo.
    if (data.imageSource === "generada") {
      const look = ART_STYLE[data.visualStyle] ?? "ilustración histórica cinematográfica";
      const styleLock =
        `Serie de ilustraciones de un mismo documental sobre "${title}". ` +
        `Dirección de arte idéntica en todas las escenas: ${look}. ` +
        "Misma paleta de colores, misma iluminación, mismo trazo y misma coherencia de personajes y vestuario en toda la serie. " +
        "Encuadre cinematográfico horizontal 16:9, sin texto, sin letras, sin marca de agua, sin bordes ni collage.";
      // Variedad de planos como en un montaje profesional: apertura amplia,
      // planos medios, detalles y cierre. Cada escena pide un plano distinto.
      const SHOTS = [
        "plano general muy amplio de establecimiento, gran profundidad",
        "plano medio de los protagonistas en acción",
        "primer plano de un detalle significativo, poca profundidad de campo",
        "plano contrapicado dramático",
        "plano general lateral con luz de contraluz",
        "plano cenital que muestra la escena completa",
      ];
      scenes.forEach((s, i) => {
        const prompt =
          `${styleLock} Escena ${i + 1} de ${scenes.length}, ${SHOTS[i % SHOTS.length]}. ` +
          `Lo que ocurre en esta escena: ${s.text.slice(0, 300)} ` +
          `La imagen debe mostrar exactamente ese momento, ambientado en el contexto histórico de ${title}, ` +
          "con vestuario, arquitectura y objetos correctos de la época.";
        if (s.image) s.fallback = s.image;
        s.image = `/api/public/scene-image?p=${encodeURIComponent(prompt)}&i=${i}`;
        s.credit = "Ilustración generada · Cronos Estudio";
      });
    }



    return {
      title,
      source: `https://es.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      narration: scenes.map((s) => s.text).join(" "),
      scenes,
    };
  });
