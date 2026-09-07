import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DocResult, DocScene } from "@/lib/free-doc.functions";
import { generarNarracionPiper } from "@/lib/piper";
import { VOZ_POR_DEFECTO } from "@/lib/voces";

export const DOC_STYLES = [
  { id: "anime", label: "Anime aventura", hint: "Color vibrante y acción cinematográfica" },
  { id: "documental", label: "Documental real", hint: "Color natural y limpio" },
  { id: "archivo", label: "Archivo antiguo", hint: "Sepia y grano de película" },
  { id: "ilustrado", label: "Ilustrado a tinta", hint: "Alto contraste, trazo" },
  { id: "pintura", label: "Pintura viva", hint: "Óleo cálido y saturado" },
] as const;

export type DocStyle = (typeof DOC_STYLES)[number]["id"];

export const MOTION_STYLES = [
  { id: "suave", label: "Suave", hint: "Cámara lenta y fundidos cruzados" },
  { id: "dinamico", label: "Dinámico", hint: "Paneos rápidos y cortes con energía" },
  { id: "epico", label: "Épico", hint: "Planos largos, solemnes y lentos" },
] as const;

export type DocMotion = (typeof MOTION_STYLES)[number]["id"];

/** Formas en que la escena se "pinta" al entrar. Todas son rápidas. */
export const PAINT_STYLES = [
  { id: "ninguno", label: "Sin pintado", hint: "La imagen entra con un fundido simple" },
  { id: "pincel", label: "Pincelada veloz", hint: "Una brocha cruza y deja la escena pintada" },
  { id: "diagonal", label: "Brochazo diagonal", hint: "El más rápido: un solo trazo en diagonal" },
  { id: "aguada", label: "Aguada al centro", hint: "La pintura se abre desde el medio" },
  { id: "renglones", label: "Pasadas de brocha", hint: "Se pinta de arriba abajo, renglón por renglón" },
  { id: "boceto", label: "Boceto y color", hint: "Primero el lápiz, enseguida el color" },
] as const;

export type DocPaint = (typeof PAINT_STYLES)[number]["id"];

const PAINT: Record<
  Exclude<DocPaint, "ninguno">,
  { cls: string; dur: number; hand: string; orbit?: boolean; sketch?: boolean }
> = {
  pincel: { cls: "paint-brush", dur: 0.9, hand: "handSweepFast 0.9s linear both" },
  diagonal: { cls: "paint-diagonal", dur: 0.65, hand: "handDiagFast 0.65s linear both" },
  aguada: { cls: "paint-spread", dur: 1, hand: "handSpinFast 1s linear both", orbit: true },
  renglones: { cls: "paint-rows", dur: 1.2, hand: "handRowsFast 1.2s linear both" },
  boceto: { cls: "paint-brush", dur: 0.6, hand: "handSweepFast 0.6s linear both", sketch: true },
};

const MANO = "/demo/mano-lapiz.png";

const FILTERS: Record<DocStyle, string> = {
  anime: "saturate(1.28) contrast(1.14) brightness(1.03)",
  documental: "saturate(1.05) contrast(1.05)",
  archivo: "sepia(0.75) contrast(1.15) brightness(0.95)",
  ilustrado: "grayscale(1) contrast(1.6) brightness(1.05)",
  pintura: "saturate(1.5) contrast(1.12) hue-rotate(-8deg)",
};

// Cada estilo de animación elige sus movimientos de cámara, sus transiciones
// y la duración del plano (boost suma o resta segundos a la duración estimada).
const MOTION: Record<DocMotion, { cams: number[]; trans: number[]; boost: number }> = {
  suave: { cams: [0, 2, 5, 8], trans: [0, 2, 0, 2], boost: 4 },
  dinamico: { cams: [1, 4, 6, 3], trans: [1, 3, 1, 3], boost: -3 },
  epico: { cams: [0, 8, 2, 5], trans: [0, 0, 2, 0], boost: 10 },
};

function estimateSeconds(text: string) {
  return Math.max(4, Math.min(14, Math.round(text.split(/\s+/).length / 2.6)));
}

function SceneImage({
  scene,
  index,
  docTitle,
  style,
  cam,
  dur,
}: {
  scene: DocScene;
  index: number;
  docTitle: string;
  style: DocStyle;
  cam: string;
  dur: number;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      key={scene.image}
      src={scene.image}
      alt={`${docTitle} — escena ${index + 1}`}
      loading={index === 0 ? "eager" : "lazy"}
      onLoad={() => setLoaded(true)}
      onError={(e) => {
        const el = e.currentTarget;
        if (scene.fallback && !el.getAttribute("data-fb")) {
          el.setAttribute("data-fb", "1");
          el.src = scene.fallback; // si la ilustración generada falla, usamos la de archivo
        } else {
          setLoaded(true);
        }
      }}
      className={`relative h-full w-full object-contain will-change-transform transition-opacity duration-700 ${
        loaded ? `opacity-100 ${cam}` : "opacity-0"
      }`}
      style={
        {
          filter: FILTERS[style],
          "--cam-dur": `${dur}s`,
        } as React.CSSProperties
      }
    />
  );
}

/** Capa que "pinta" la escena activa: la máscara de pintura y la mano. */
function PaintOverlay({ scene, paint, runKey }: { scene: DocScene; paint: DocPaint; runKey: number }) {
  if (paint === "ninguno") return null;
  const p = PAINT[paint];
  const src = scene.fallback ?? scene.image;

  return (
    <div key={`paint-${runKey}`} className="pointer-events-none absolute inset-0 z-[6]">
      {p.sketch && (
        <img
          src={src}
          alt=""
          aria-hidden
          className="draw-layer paint-base paint-ink draw-sketch"
          style={{ "--paint-dur": `${p.dur}s` } as React.CSSProperties}
        />
      )}
      {p.orbit ? (
        <div className="absolute inset-0" style={{ animation: p.hand }}>
          <img src={MANO} alt="" aria-hidden className="paint-hand" style={{ left: "44%", top: "-4%" }} />
        </div>
      ) : (
        <img src={MANO} alt="" aria-hidden className="paint-hand" style={{ animation: p.hand }} />
      )}
    </div>
  );
}

export function DocPlayer({
  doc,
  style,
  motion = "suave",
  paint = "ninguno",
  voz = VOZ_POR_DEFECTO,
}: {
  doc: DocResult;
  style: DocStyle;
  motion?: DocMotion;
  paint?: DocPaint;
  voz?: string;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const [failedVideos, setFailedVideos] = useState<Set<number>>(() => new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const scene = doc.scenes[index]!;

  // El clip acompaña a la voz: si el relato se pausa o termina, el video se
  // detiene también (antes seguía corriendo solo).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) void v.play().catch(() => {});
    else v.pause();
  }, [playing, index]);

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    setIndex((i) => (i + 1 < doc.scenes.length ? i + 1 : i));
    setPlaying((p) => (index + 1 < doc.scenes.length ? p : false));
  }, [doc.scenes.length, index]);

  /** Salta a una escena concreta (adelantar o volver atrás) y sigue narrando. */
  const goTo = useCallback(
    (i: number) => {
      stopSpeech();
      setIndex(Math.max(0, Math.min(doc.scenes.length - 1, i)));
      setPlaying(true);
    },
    [doc.scenes.length, stopSpeech],
  );

  // Reset when a new documentary arrives
  useEffect(() => {
    setIndex(0);
    setPlaying(true);
    setFailedVideos(new Set());
    return stopSpeech;
  }, [doc, stopSpeech]);

  /** Si la voz de estudio no está disponible, narramos con la del navegador. */
  const fallbackSpeech = useCallback(
    (text: string) => {
      const seconds = estimateSeconds(text);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "es-ES";
        u.rate = 0.95;
        const v = window.speechSynthesis
          .getVoices()
          .find((sv) => sv.lang?.toLowerCase().startsWith("es"));
        if (v) u.voice = v;
        u.onend = () => {
          timerRef.current = setTimeout(advance, 400);
        };
        window.speechSynthesis.speak(u);
        return;
      }
      timerRef.current = setTimeout(advance, seconds * 1000);
    },
    [advance],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    stopSpeech();
    setLoadingVoice(false);
    if (!playing) return;

    if (muted) {
      timerRef.current = setTimeout(advance, estimateSeconds(scene.text) * 1000);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    let cancelled = false;
    const a = audioRef.current;
    if (!a) {
      fallbackSpeech(scene.text);
      return;
    }

    setLoadingVoice(true);
    void generarNarracionPiper(scene.text, voz)
      .then((src) => {
        if (cancelled) {
          URL.revokeObjectURL(src);
          return;
        }
        objectUrlRef.current = src;
        a.src = src;
        a.load();
        return a.play();
      })
      .then(() => {
        if (!cancelled) setLoadingVoice(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadingVoice(false);
        fallbackSpeech(scene.text);
      });

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, playing, muted, scene.text, voz, doc.scenes, advance, fallbackSpeech, stopSpeech]);

  const finished = index === doc.scenes.length - 1 && !playing;

  const isAnime = style === "anime";
  const m = MOTION[motion];

  return (
    <div className="overflow-hidden rounded-md border border-border/70 bg-background/80">
      <audio
        ref={audioRef}
        className="hidden"
        preload="auto"
        onEnded={() => {
          timerRef.current = setTimeout(advance, 350);
        }}
        onError={() => {
          if (playing && !muted) fallbackSpeech(scene.text);
        }}
      />
      <div className="relative aspect-video w-full overflow-hidden bg-foreground">
        {doc.scenes.map((s, i) => (
          <div
            key={s.image + i}
            className={`scene-shot scene-transition-${m.trans[i % m.trans.length]} absolute inset-0 ${
              i === index ? "scene-active" : "scene-inactive"
            }`}
          >
            <img
              src={s.fallback ?? s.image}
              alt=""
              aria-hidden
              loading="lazy"
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
            />
            {s.video && i === index && !failedVideos.has(i) ? (
              <video
                key={`v-${i}`}
                ref={(el) => {
                  if (i === index) videoRef.current = el;
                }}
                src={s.videoStart ? `${s.video}#t=${s.videoStart}` : s.video}
                autoPlay={playing}
                muted
                loop
                playsInline
                preload="auto"
                poster={s.image || undefined}
                onError={() => {
                  setFailedVideos((current) => {
                    const next = new Set(current);
                    next.add(i);
                    return next;
                  });
                }}
                className="video-drift video-reveal relative h-full w-full object-cover will-change-transform"
                style={{ filter: FILTERS[style] }}
              />
            ) : (
              <div
                className={
                  i === index && paint !== "ninguno"
                    ? `paint-base ${PAINT[paint as Exclude<DocPaint, "ninguno">].cls} absolute inset-0`
                    : "absolute inset-0"
                }
                style={
                  i === index && paint !== "ninguno"
                    ? ({
                        "--paint-dur": `${PAINT[paint as Exclude<DocPaint, "ninguno">].dur}s`,
                      } as React.CSSProperties)
                    : undefined
                }
                key={i === index ? `wrap-${index}-${paint}` : `wrap-${i}`}
              >
                <SceneImage
                  scene={s}
                  index={i}
                  docTitle={doc.title}
                  style={style}
                  cam={`cam-${m.cams[i % m.cams.length]}`}
                  dur={Math.max(6, estimateSeconds(s.text) + m.boost)}
                />
              </div>
            )}
          </div>
        ))}
        {!scene.video && <PaintOverlay scene={scene} paint={paint} runKey={index} />}
        <div className="cinema-grade pointer-events-none absolute inset-0" />
        {isAnime && (
          <div key={`slash-${index}`} className="anime-slash pointer-events-none absolute inset-0" />
        )}
        <div key={`sweep-${index}`} className="scene-sweep pointer-events-none absolute inset-0" />
        <div className="film-grain-anim pointer-events-none absolute inset-0" />
        {isAnime && <div className="speed-lines pointer-events-none absolute inset-0" />}
        {style === "archivo" && (
          <>
            <div className="film-flicker pointer-events-none absolute inset-0" />
            <div className="film-gate pointer-events-none absolute inset-x-0 top-0" />
          </>
        )}

        {/* Barras cinematográficas */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[7] h-[6%] bg-black" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[7] h-[6%] bg-black" />

        {/* Línea de tiempo: se puede tocar para adelantar o volver a una escena */}
        <div className="absolute inset-x-0 top-[6%] z-[9] flex gap-1 px-2 pt-1">
          {doc.scenes.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir a la escena ${i + 1}`}
              onClick={() => goTo(i)}
              className="group h-3 flex-1 cursor-pointer bg-transparent"
            >
              <span
                className={`block h-[3px] w-full rounded-full transition-all duration-300 group-hover:h-[5px] ${
                  i <= index ? "bg-primary" : "bg-white/25"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Rótulo de apertura */}
        {index === 0 && (
          <div
            key={`title-${doc.title}`}
            className="title-card pointer-events-none absolute inset-0 z-[8] flex flex-col items-center justify-center px-8 text-center"
          >
            <p className="text-[10px] uppercase tracking-[0.45em] text-white/60">Cronos Estudio</p>
            <h3 className="mt-2 max-w-[85%] text-balance text-2xl font-semibold leading-tight text-white drop-shadow-lg sm:text-4xl">
              {doc.title}
            </h3>
            <span className="mt-3 h-px w-16 bg-primary" />
          </div>
        )}

        {/* Crédito discreto de cada escena (sin subtítulos: el relato es solo voz) */}
        <div className="absolute bottom-[7%] right-3 z-[8] max-w-[62%] text-right text-[9px] uppercase tracking-[0.18em] text-white/55">
          <span className="mr-1 text-primary">{scene.video && !failedVideos.has(index) ? "Video real" : "Imagen"}</span>
          {scene.mediaSource ? (
            <a
              key={`cred-${index}`}
              href={scene.mediaSource}
              target="_blank"
              rel="noreferrer"
              className="line-clamp-1 underline decoration-white/30 underline-offset-2 hover:text-white"
            >
              {scene.credit}
            </a>
          ) : (
            <span key={`cred-${index}`} className="line-clamp-1">{scene.credit}</span>
          )}
        </div>
      </div>

      {doc.scenes[index + 1]?.video && !failedVideos.has(index + 1) && (
        <video
          aria-hidden
          src={doc.scenes[index + 1]?.video}
          preload="metadata"
          muted
          className="hidden"
        />
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 p-4">
        <Button
          size="sm"
          variant="outline"
          aria-label="Escena anterior"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="gap-1"
        >
          <SkipBack className="h-4 w-4" />
          Atrás
        </Button>
        <Button
          size="sm"
          onClick={() => {
            if (finished) setIndex(0);
            setPlaying((p) => !p);
          }}
          className="gap-2"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Pausar" : finished ? "Ver de nuevo" : "Reproducir"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-label="Adelantar a la escena siguiente"
          onClick={() => goTo(index + 1)}
          disabled={index >= doc.scenes.length - 1}
          className="gap-1"
        >
          Adelantar
          <SkipForward className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => setMuted((m2) => !m2)} className="gap-2">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {muted ? "Sin relato" : "Con relato"}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setIndex(0);
            setPlaying(true);
          }}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reiniciar
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {loadingVoice ? "Preparando la voz… · " : ""}Escena {index + 1} de {doc.scenes.length}
        </span>
      </div>
    </div>
  );
}
