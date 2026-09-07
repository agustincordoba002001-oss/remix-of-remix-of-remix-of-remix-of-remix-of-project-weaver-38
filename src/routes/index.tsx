import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Film, Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { DOC_STYLES, DocPlayer, MOTION_STYLES, type DocMotion, type DocPaint, type DocStyle } from "@/components/DocPlayer";
import { SelectorPintado, SelectorVoz } from "@/components/Controles";
import { VOZ_POR_DEFECTO } from "@/lib/voces";
import { buildDocumentary, type DocResult } from "@/lib/free-doc.functions";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cronos — Documentales de historia gratis e ilimitados" },
      {
        name: "description",
        content:
          "Escribí un tema histórico y Cronos arma un documental narrado en español con imágenes y videos reales de archivos libres. Sin créditos de uso.",
      },
      {
        property: "og:title",
        content: "Cronos — Documentales de historia gratis e ilimitados",
      },
      {
        property: "og:description",
        content:
          "De una idea a un documental narrado en español, con imágenes históricas y videos reales de archivos libres.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const IDEAS: string[] = [
  "Colón llegando a América en 1492",
  "La caída del Muro de Berlín",
  "El cruce de los Andes por San Martín",
  "La erupción del Vesubio sobre Pompeya",
];

function Index() {
  const [topic, setTopic] = useState("Colón llegando a América en 1492");
  const [style, setStyle] = useState<DocStyle>("anime");
  const [motion, setMotion] = useState<DocMotion>("suave");
  const [paint, setPaint] = useState<DocPaint>("pincel");
  const [voz, setVoz] = useState<string>(VOZ_POR_DEFECTO);
  const [imageSource, setImageSource] = useState<"archivo" | "generada">("generada");

  const [scenes, setScenes] = useState(6);
  const [doc, setDoc] = useState<DocResult | null>(null);
  const [archive, setArchive] = useState<DocResult[]>([]);

  const build = useServerFn(buildDocumentary);

  const start = useMutation({
    mutationFn: () => build({ data: { topic, sceneCount: scenes, visualStyle: style, imageSource } }),
    onSuccess: (res) => {
      setDoc(res);
      setArchive((a) => [res, ...a.filter((d) => d.title !== res.title)].slice(0, 6));
      toast.success(`Documental listo: ${res.title}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="min-h-screen">
      <Toaster />
      <div className="grain-overlay">
        <header className="mx-auto max-w-5xl px-6 pt-16 pb-10">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-muted-foreground">
            <Film className="h-4 w-4 text-primary" />
            Cronos Estudio
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl leading-[1.05] font-semibold sm:text-7xl">
            Documentales de <span className="text-gold flicker">historia</span>, gratis
            e ilimitados.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground">
            Escribí un hecho histórico. Cronos arma el relato y combina imágenes con
            videos reales de archivos libres, siguiendo lo que cuenta la voz en español.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/subir"
              className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-sm transition-colors hover:border-primary/60 hover:text-primary"
            >
              <Upload className="h-4 w-4" /> ¿Ya tenés guion e imágenes? Subilos acá
            </Link>
            <Link
              to="/animaciones"
              className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-sm transition-colors hover:border-primary/60 hover:text-primary"
            >
              Animaciones de dibujo a mano
            </Link>
          </div>

          <div className="rule-gold mt-10 h-px w-32 opacity-70" />

        </header>

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <Card className="border-border/70 bg-card/70 shadow-reel p-6 backdrop-blur sm:p-8">
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Tema del documental
            </label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Colón llegando a América"
              className="mt-3 h-14 border-border/70 bg-background/60 font-display text-lg"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {IDEAS.map((idea) => (
                <button
                  key={idea}
                  onClick={() => setTopic(idea)}
                  className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                >
                  {idea}
                </button>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-4">
              {DOC_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`rounded-md border p-4 text-left transition-all ${
                    style === s.id
                      ? "border-primary bg-primary/10"
                      : "border-border/70 hover:border-primary/50"
                  }`}
                >
                  <span className="block font-display text-base">{s.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {s.hint}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Imágenes
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setImageSource("archivo")}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      imageSource === "archivo"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/70 text-muted-foreground hover:text-primary"
                    }`}
                  >
                    De archivo libre
                  </button>
                  <button
                    onClick={() => setImageSource("generada")}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      imageSource === "generada"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/70 text-muted-foreground hover:text-primary"
                    }`}
                  >
                    Ilustradas por IA
                  </button>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {imageSource === "generada"
                    ? "Ilustraciones creadas con IA, todas con el mismo estilo visual del documental."
                    : "Fotos, obras y videos reales de Wikimedia Commons, con autor y licencia visibles."}
                </p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Animación
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {MOTION_STYLES.map((mt) => (
                    <button
                      key={mt.id}
                      onClick={() => setMotion(mt.id)}
                      className={`rounded-full px-3 py-1 text-sm transition-colors ${
                        motion === mt.id
                          ? "bg-primary text-primary-foreground"
                          : "border border-border/70 text-muted-foreground hover:text-primary"
                      }`}
                    >
                      {mt.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {MOTION_STYLES.find((x) => x.id === motion)?.hint}. Sin subtítulos: el
                  relato es solo voz.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <SelectorPintado paint={paint} onChange={setPaint} />
            </div>

            <div className="mt-6">
              <SelectorVoz voz={voz} onChange={setVoz} />
            </div>



            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Escenas
                </span>
                {[4, 6, 8, 10].map((v) => (
                  <button
                    key={v}
                    onClick={() => setScenes(v)}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      scenes === v
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/70 text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <Button
                size="lg"
                disabled={start.isPending || topic.trim().length < 4}
                onClick={() => start.mutate()}
                className="gap-2"
              >
                {start.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {start.isPending
                  ? imageSource === "generada"
                    ? "Creando el material visual…"
                    : "Buscando imágenes y videos libres…"
                  : "Generar documental"}
              </Button>
            </div>
          </Card>

          {doc && (
            <div className="mt-8">
              <DocPlayer doc={doc} style={style} motion={motion} paint={paint} voz={voz} />
              <div className="mt-6 rounded-md border border-border/60 bg-card/60 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Relato completo
                </p>
                <p className="mt-3 font-display text-lg leading-relaxed">
                  {doc.narration}
                </p>
                <a
                  href={doc.source}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-xs text-primary underline"
                >
                  Fuente del texto y material libre
                </a>
              </div>
            </div>
          )}

          {archive.length > 1 && (
            <div className="mt-20">
              <h2 className="text-2xl font-semibold">Archivo del estudio</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {archive.map((d) => (
                  <button
                    key={d.title}
                    onClick={() => setDoc(d)}
                    className="overflow-hidden rounded-md border border-border/70 bg-card/70 text-left transition-colors hover:border-primary/60"
                  >
                    <div className="aspect-video bg-background/80">
                      <img
                        src={d.scenes[0]!.image}
                        alt={d.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <p className="font-display text-base">{d.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {d.scenes.length} escenas
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
