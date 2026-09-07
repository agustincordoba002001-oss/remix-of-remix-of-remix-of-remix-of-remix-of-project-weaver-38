import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, PencilLine, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/animaciones")({
  head: () => ({
    meta: [
      { title: "Animaciones de dibujo a mano — Cronos Estudio" },
      {
        name: "description",
        content:
          "Seis pruebas de animación en las que una mano con lápiz va dibujando la ilustración de cada escena, para elegir cuál usar en el documental.",
      },
      { property: "og:title", content: "Animaciones de dibujo a mano — Cronos Estudio" },
      {
        property: "og:description",
        content: "Seis maneras distintas de que una mano dibuje cada escena del documental.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnimacionesPage,
});

const IMG = "/guion/alunizaje/003.jpg";
const MANO = "/demo/mano-lapiz.png";

interface Variante {
  id: string;
  label: string;
  hint: string;
  /** clase de pintado rápido */
  paint?: string;
  /** duración del pintado en segundos */
  dur?: number;
  /** dibuja primero una capa a lápiz */
  sketch?: boolean;
  /** animación antigua basada en clip-path */
  legacyColor?: string;
  /** animación de la mano */
  hand: string;
  /** la mano gira alrededor del centro */
  orbit?: boolean;
}

const VARIANTES: Variante[] = [
  {
    id: "pincel",
    label: "1 · Pincelada veloz",
    hint: "Una brocha cruza la escena en menos de un segundo y la deja pintada.",
    paint: "paint-brush",
    dur: 0.9,
    hand: "handSweepFast 0.9s linear both",
  },
  {
    id: "diagonal",
    label: "2 · Brochazo diagonal",
    hint: "El más rápido de todos: un solo trazo en diagonal.",
    paint: "paint-diagonal",
    dur: 0.65,
    hand: "handDiagFast 0.65s linear both",
  },
  {
    id: "aguada",
    label: "3 · Aguada al centro",
    hint: "La pintura se abre desde el medio mientras la mano gira.",
    paint: "paint-spread",
    dur: 1,
    hand: "handSpinFast 1s linear both",
    orbit: true,
  },
  {
    id: "renglones",
    label: "4 · Pasadas de brocha",
    hint: "Se pinta de arriba abajo con pasadas rápidas, renglón por renglón.",
    paint: "paint-rows",
    dur: 1.2,
    hand: "handRowsFast 1.2s linear both",
  },
  {
    id: "boceto",
    label: "5 · Boceto y color al toque",
    hint: "Aparece el lápiz y enseguida entra el color encima.",
    paint: "paint-brush",
    dur: 0.6,
    sketch: true,
    hand: "handSweepFast 0.6s linear both",
  },
  {
    id: "trazo",
    label: "6 · Trazo continuo (clásico)",
    hint: "La versión anterior, más lenta y prolija, por si la preferís.",
    legacyColor: "drawWipeX 4s linear both",
    hand: "handX 4s linear both, handOut 600ms ease 4s both",
  },
];

function Muestra({ v, run }: { v: Variante; run: number }) {
  const paintStyle = { "--paint-dur": `${v.dur ?? 1}s` } as React.CSSProperties;
  return (
    <div key={run} className="draw-stage aspect-video w-full rounded-md border border-border/70 bg-[#f6f1e6]">
      {v.sketch && (
        <img
          src={IMG}
          alt=""
          aria-hidden
          className="draw-layer paint-base paint-ink draw-sketch"
          style={paintStyle}
        />
      )}
      <img
        src={IMG}
        alt="Escena del documental pintándose a mano"
        className={`draw-layer ${v.paint ? `paint-base ${v.paint}` : ""}`}
        style={v.paint ? paintStyle : { animation: v.legacyColor }}
      />
      {v.orbit ? (
        <div className="absolute inset-0 z-[5]" style={{ animation: v.hand }}>
          <img src={MANO} alt="" aria-hidden className="paint-hand" style={{ left: "44%", top: "-4%" }} />
        </div>
      ) : (
        <img src={MANO} alt="" aria-hidden className="paint-hand" style={{ animation: v.hand }} />
      )}
    </div>
  );
}

function AnimacionesPage() {
  const [run, setRun] = useState(0);

  return (
    <main className="min-h-screen">
      <div className="grain-overlay">
        <header className="mx-auto max-w-5xl px-6 pt-16 pb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
          <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-muted-foreground">
            <PencilLine className="h-4 w-4 text-primary" />
            Pruebas de dibujo
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl leading-[1.08] font-semibold sm:text-6xl">
            Una mano que <span className="text-gold">dibuja</span> cada escena.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Seis maneras distintas de que la ilustración aparezca dibujada en vivo, con la
            misma escena del alunizaje. Mirá las seis y decime cuál te gusta.
          </p>
          <Button onClick={() => setRun((r) => r + 1)} className="mt-6 gap-2">
            <RotateCcw className="h-4 w-4" /> Ver de nuevo
          </Button>
          <div className="rule-gold mt-8 h-px w-32 opacity-70" />
        </header>

        <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 sm:grid-cols-2">
          {VARIANTES.map((v) => (
            <Card key={v.id} className="border-border/70 bg-card/70 shadow-reel p-4 backdrop-blur">
              <Muestra v={v} run={run} />
              <h2 className="mt-4 text-base font-medium">{v.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{v.hint}</p>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
