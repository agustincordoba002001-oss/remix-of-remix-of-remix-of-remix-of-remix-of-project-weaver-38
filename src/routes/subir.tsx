import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Film, ImagePlus, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import {
  DOC_STYLES,
  DocPlayer,
  MOTION_STYLES,
  type DocMotion,
  type DocPaint,
  type DocStyle,
} from "@/components/DocPlayer";
import { SelectorPintado, SelectorVoz } from "@/components/Controles";
import { VOZ_POR_DEFECTO } from "@/lib/voces";
import type { DocResult, DocScene } from "@/lib/free-doc.functions";
import {
  GUION_ALUNIZAJE,
  GUION_ALUNIZAJE_TEXTO,
  GUION_ALUNIZAJE_TITULO,
} from "@/lib/guion-alunizaje";



export const Route = createFileRoute("/subir")({
  head: () => ({
    meta: [
      { title: "Subí tu guion e imágenes — Cronos Estudio" },
      {
        name: "description",
        content:
          "Pegá tu guion, subí tus imágenes en orden y Cronos las convierte en un documental narrado en español, con movimiento de cámara y fundidos.",
      },
      { property: "og:title", content: "Subí tu guion e imágenes — Cronos Estudio" },
      {
        property: "og:description",
        content:
          "De un guion propio y tus imágenes a un video narrado en español, listo para reproducir.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubirPage,
});

const EJEMPLO = `Salí una noche al patio y mirá para arriba. Ahí está: la Luna.

Y de golpe, en ocho años, unos tipos con reglas de cálculo y café frío la tocaron.

Empieza el 25 de mayo de 1961, cuando Kennedy se para frente al Congreso.`;

/** Corta el guion en escenas: primero por línea en blanco, si no por párrafo. */
function partirGuion(texto: string): string[] {
  const limpio = texto.replace(/\r/g, "").trim();
  if (!limpio) return [];
  const bloques = limpio
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (bloques.length > 1) return bloques;
  return limpio
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);
}

interface Subida {
  name: string;
  url: string;
}

function SubirPage() {
  const [titulo, setTitulo] = useState("Mi documental");
  const [guion, setGuion] = useState(EJEMPLO);
  const [imagenes, setImagenes] = useState<Subida[]>([]);
  const [style, setStyle] = useState<DocStyle>("documental");
  const [motion, setMotion] = useState<DocMotion>("suave");
  const [paint, setPaint] = useState<DocPaint>("pincel");
  const [voz, setVoz] = useState<string>(VOZ_POR_DEFECTO);

  const [doc, setDoc] = useState<DocResult | null>(null);

  const partes = useMemo(() => partirGuion(guion), [guion]);

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const nuevas = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }))
      .map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    if (nuevas.length === 0) {
      toast.error("Elegí archivos de imagen (JPG o PNG).");
      return;
    }
    setImagenes((prev) => [...prev, ...nuevas]);
    toast.success(`${nuevas.length} imágenes agregadas`);
  }

  function armar() {
    if (partes.length === 0) {
      toast.error("Pegá el guion primero.");
      return;
    }
    if (imagenes.length === 0) {
      toast.error("Subí al menos una imagen.");
      return;
    }
    const scenes: DocScene[] = partes.map((text, i) => ({
      text,
      image: imagenes[Math.min(i, imagenes.length - 1)]!.url,
      credit: "Imagen propia",
    }));
    setDoc({
      title: titulo.trim() || "Mi documental",
      source: "Guion e imágenes propias",
      narration: partes.join(" "),
      scenes,
    });
    toast.success("Video narrado listo");
  }

  return (
    <main className="min-h-screen">
      <Toaster />
      <div className="grain-overlay">
        <header className="mx-auto max-w-5xl px-6 pt-16 pb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
          <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-muted-foreground">
            <Film className="h-4 w-4 text-primary" />
            Tu material
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl leading-[1.08] font-semibold sm:text-6xl">
            Subí tu <span className="text-gold">guion</span> y tus imágenes.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Pegá el texto separando cada escena con un renglón en blanco, subí las
            imágenes en orden y Cronos lo cuenta en voz alta con movimiento de
            cámara y fundidos.
          </p>
          <div className="rule-gold mt-8 h-px w-32 opacity-70" />
        </header>

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <Card className="border-border/70 bg-card/70 shadow-reel p-6 backdrop-blur sm:p-8">
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Título
            </label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="El alunizaje"
              className="mt-3 h-12 border-border/70 bg-background/60 font-display text-lg"
            />

            <label className="mt-8 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Guion — una escena por párrafo
            </label>
            <Textarea
              value={guion}
              onChange={(e) => setGuion(e.target.value)}
              rows={10}
              className="mt-3 border-border/70 bg-background/60 text-base leading-relaxed"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {partes.length} escenas detectadas · {imagenes.length} imágenes subidas
            </p>

            <label className="mt-8 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Imágenes en orden
            </label>
            <div className="mt-3 rounded-md border border-dashed border-border/70 bg-background/40 p-6 text-center">
              <ImagePlus className="mx-auto h-6 w-6 text-primary" />
              <input
                id="fotos"
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => onFiles(e.target.files)}
              />
              <label
                htmlFor="fotos"
                className="mt-3 inline-block cursor-pointer rounded-full border border-border/70 px-4 py-2 text-sm transition-colors hover:border-primary/60 hover:text-primary"
              >
                Elegir imágenes
              </label>
              <p className="mt-2 text-xs text-muted-foreground">
                Se ordenan por nombre de archivo. Si hay menos imágenes que escenas,
                la última se repite.
              </p>
            </div>

            {imagenes.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {imagenes.map((img, i) => (
                  <div key={img.url} className="relative">
                    <img
                      src={img.url}
                      alt={`Imagen ${i + 1}: ${img.name}`}
                      className="h-16 w-24 rounded border border-border/70 object-cover"
                    />
                    <span className="absolute left-1 top-1 rounded bg-background/80 px-1 text-[10px]">
                      {i + 1}
                    </span>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  className="h-16 text-xs"
                  onClick={() => setImagenes([])}
                >
                  Quitar todas
                </Button>
              </div>
            )}

            <div className="mt-8 grid gap-3 sm:grid-cols-5">
              {DOC_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`rounded-md border p-4 text-left transition-all ${
                    style === s.id ? "border-primary bg-primary/10" : "border-border/70"
                  }`}
                >
                  <span className="block text-sm font-medium">{s.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{s.hint}</span>
                </button>
              ))}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {MOTION_STYLES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMotion(m.id)}
                  className={`rounded-md border p-4 text-left transition-all ${
                    motion === m.id ? "border-primary bg-primary/10" : "border-border/70"
                  }`}
                >
                  <span className="block text-sm font-medium">{m.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{m.hint}</span>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <SelectorPintado paint={paint} onChange={setPaint} />
            </div>

            <div className="mt-6">
              <SelectorVoz voz={voz} onChange={setVoz} />
            </div>



            <Button onClick={armar} className="mt-8 h-12 w-full text-base">
              <Play className="mr-2 h-4 w-4" /> Armar video narrado
            </Button>

            <Button
              variant="ghost"
              className="mt-3 h-10 w-full text-sm"
              onClick={() => {
                setTitulo(GUION_ALUNIZAJE_TITULO);
                setGuion(GUION_ALUNIZAJE_TEXTO);
                setImagenes(
                  GUION_ALUNIZAJE.map((e) => ({
                    name: `Escena ${e.n}`,
                    url: e.imagen,
                  })),
                );
                toast.success("Guion modelo cargado: 105 escenas ilustradas");
              }}
            >
              Cargar el guion modelo del alunizaje (105 escenas)
            </Button>

          </Card>

          {doc && (
            <div className="mt-10">
              <h2 className="mb-4 font-display text-2xl">{doc.title}</h2>
              <DocPlayer doc={doc} style={style} motion={motion} paint={paint} voz={voz} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
