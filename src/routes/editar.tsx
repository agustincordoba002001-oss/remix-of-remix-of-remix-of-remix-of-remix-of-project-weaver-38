import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Film, Scissors, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/editar")({
  head: () => ({
    meta: [
      { title: "Subí un video para corregir — Cronos Estudio" },
      {
        name: "description",
        content:
          "Subí un video de cualquier peso, marcá el recorte, el brillo y el volumen, y dejá anotado qué querés corregir del relato.",
      },
      { property: "og:title", content: "Subí un video para corregir — Cronos Estudio" },
      {
        property: "og:description",
        content: "Revisá tu video cuadro por cuadro y anotá las correcciones antes de rearmarlo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditarPage,
});

const LOOKS = [
  { id: "original", label: "Original", filtro: "none" },
  { id: "pizarra", label: "Pizarra", filtro: "contrast(1.12) saturate(0.9) brightness(1.06)" },
  { id: "archivo", label: "Archivo", filtro: "sepia(0.35) contrast(1.1) saturate(0.85)" },
  { id: "cine", label: "Cine", filtro: "contrast(1.25) saturate(1.1) brightness(0.96)" },
] as const;

function mmss(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function EditarPage() {
  const [url, setUrl] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [peso, setPeso] = useState(0);
  const [dur, setDur] = useState(0);
  const [desde, setDesde] = useState(0);
  const [hasta, setHasta] = useState(0);
  const [vol, setVol] = useState(1);
  const [look, setLook] = useState<(typeof LOOKS)[number]["id"]>("original");
  const [notas, setNotas] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  function elegir(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      toast.error("Elegí un archivo de video (MP4, MOV, WEBM).");
      return;
    }
    if (url) URL.revokeObjectURL(url);
    setUrl(URL.createObjectURL(f));
    setNombre(f.name);
    setPeso(f.size);
    setDesde(0);
    setHasta(0);
    toast.success("Video cargado. Se queda en tu dispositivo, sin límite de peso.");
  }

  function marcarEntrada() {
    const v = videoRef.current;
    if (!v) return;
    setDesde(v.currentTime);
    toast.success(`Entrada en ${mmss(v.currentTime)}`);
  }

  function marcarSalida() {
    const v = videoRef.current;
    if (!v) return;
    setHasta(v.currentTime);
    toast.success(`Salida en ${mmss(v.currentTime)}`);
  }

  function verRecorte() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = desde;
    void v.play();
  }

  const fin = hasta > desde ? hasta : dur;

  const resumen = [
    nombre && `Video: ${nombre} (${(peso / 1024 / 1024).toFixed(1)} MB, ${mmss(dur)})`,
    `Recorte: ${mmss(desde)} a ${mmss(fin)}`,
    `Tono: ${LOOKS.find((l) => l.id === look)?.label}`,
    `Volumen del relato: ${Math.round(vol * 100)}%`,
    notas.trim() && `Correcciones: ${notas.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");

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
            Corregir un video
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl leading-[1.08] font-semibold sm:text-6xl">
            Subí el <span className="text-gold">video</span> y marcá qué corregir.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Cualquier peso y cualquier duración: el archivo se abre en tu dispositivo, no
            se sube a ningún servidor. Marcá dónde empieza y termina, elegí el tono y
            anotá los arreglos del relato.
          </p>
          <div className="rule-gold mt-8 h-px w-32 opacity-70" />
        </header>

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <Card className="border-border/70 bg-card/70 shadow-reel p-6 backdrop-blur sm:p-8">
            <div className="rounded-md border border-dashed border-border/70 bg-background/40 p-6 text-center">
              <Upload className="mx-auto h-6 w-6 text-primary" />
              <input
                id="video"
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(e) => elegir(e.target.files)}
              />
              <label
                htmlFor="video"
                className="mt-3 inline-block cursor-pointer rounded-full border border-border/70 px-4 py-2 text-sm transition-colors hover:border-primary/60 hover:text-primary"
              >
                Elegir video
              </label>
              <p className="mt-2 text-xs text-muted-foreground">
                MP4, MOV o WEBM. Sin límite de peso.
              </p>
            </div>

            {url && (
              <>
                <video
                  ref={videoRef}
                  src={url}
                  controls
                  playsInline
                  style={{ filter: LOOKS.find((l) => l.id === look)?.filtro }}
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    setDur(v.duration);
                    setHasta(v.duration);
                  }}
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget;
                    if (hasta > desde && v.currentTime >= hasta) v.pause();
                  }}
                  className="mt-6 w-full rounded-md border border-border/70 bg-black"
                />

                <p className="mt-3 text-xs text-muted-foreground">
                  {nombre} · {(peso / 1024 / 1024).toFixed(1)} MB · {mmss(dur)}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button variant="ghost" className="h-10 text-sm" onClick={marcarEntrada}>
                    <Scissors className="mr-2 h-4 w-4" /> Marcar entrada
                  </Button>
                  <Button variant="ghost" className="h-10 text-sm" onClick={marcarSalida}>
                    <Scissors className="mr-2 h-4 w-4" /> Marcar salida
                  </Button>
                  <Button variant="ghost" className="h-10 text-sm" onClick={verRecorte}>
                    Ver el recorte
                  </Button>
                  <span className="self-center text-xs text-muted-foreground">
                    {mmss(desde)} → {mmss(fin)}
                  </span>
                </div>

                <div className="mt-6">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Tono de imagen
                  </span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {LOOKS.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setLook(l.id)}
                        className={`rounded-full px-3 py-1 text-sm transition-colors ${
                          look === l.id
                            ? "bg-primary text-primary-foreground"
                            : "border border-border/70 text-muted-foreground hover:text-primary"
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="vol"
                    className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    Volumen del relato · {Math.round(vol * 100)}%
                  </label>
                  <input
                    id="vol"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={vol}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setVol(n);
                      if (videoRef.current) videoRef.current.volume = n;
                    }}
                    className="mt-3 w-full accent-primary"
                  />
                </div>

                <label className="mt-8 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Qué corregir del relato
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={5}
                  placeholder="Ej: en el minuto 3 la voz se adelanta al dibujo; cambiar la frase del final."
                  className="mt-3 w-full rounded-md border border-border/70 bg-background/60 p-3 text-base leading-relaxed"
                />

                <Button
                  className="mt-6 h-12 w-full text-base"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(resumen)
                      .then(() => toast.success("Correcciones copiadas: pegámelas en el chat"))
                      .catch(() => toast.error("No se pudo copiar. Copialo a mano."));
                  }}
                >
                  Copiar las correcciones
                </Button>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Pegá ese texto en el chat junto con el video y rearmo la versión
                  corregida con la misma voz y el mismo estilo de pizarra.
                </p>
              </>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}
