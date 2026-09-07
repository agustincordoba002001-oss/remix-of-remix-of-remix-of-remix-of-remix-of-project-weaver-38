import { useEffect, useRef, useState } from "react";
import { Check, Download, Loader2, Trash2, Volume2 } from "lucide-react";

import { PAINT_STYLES, type DocPaint } from "@/components/DocPlayer";
import { borrarVoz, descargarVoz, generarNarracionPiper, vocesDescargadas } from "@/lib/piper";
import { ACENTOS_DISPONIBLES, VOCES, buscarVoz } from "@/lib/voces";


const FRASE_PRUEBA =
  "El veinte de julio de mil novecientos sesenta y nueve, el mundo entero contuvo la respiración.";

/** Elegir la voz del relato, con prueba de audio antes de generar el video. */
export function SelectorVoz({ voz, onChange }: { voz: string; onChange: (id: string) => void }) {
  const [probando, setProbando] = useState<string | null>(null);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [acento, setAcento] = useState<string>(buscarVoz(voz).acento);
  const [listas, setListas] = useState<string[]>([]);
  const [bajando, setBajando] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    void vocesDescargadas().then(setListas);
  }, []);

  async function asegurarVoz(id: string) {
    if (listas.includes(id) || bajando[id] !== undefined) return;
    setError(null);
    setBajando((b) => ({ ...b, [id]: 0 }));
    try {
      await descargarVoz(id, (p) => setBajando((b) => ({ ...b, [id]: p })));
      setListas(await vocesDescargadas());
    } catch {
      setError("No se pudo descargar esta voz. Revisá la conexión e intentá de nuevo.");
    } finally {
      setBajando(({ [id]: _quitada, ...resto }) => resto);
    }
  }

  async function quitarVoz(id: string) {
    await borrarVoz(id);
    setListas(await vocesDescargadas());
  }

  function elegir(id: string) {
    onChange(id);
    void asegurarVoz(id);
  }

  async function probar(id: string) {
    const a = audioRef.current;
    if (!a) return;
    await asegurarVoz(id);
    setProbando(id);
    setProgreso(0);
    setError(null);
    try {
      const anterior = a.src;
      const src = await generarNarracionPiper(FRASE_PRUEBA, id, ({ porcentaje }) => {
        setProgreso(porcentaje);
      });
      if (anterior.startsWith("blob:")) URL.revokeObjectURL(anterior);
      a.src = src;
      await a.play();
    } catch {
      setProbando(null);
      setError("Piper no pudo preparar esta voz en este navegador.");
    }
  }

  const lista = VOCES.filter((v) => v.acento === acento);

  return (
    <div>
      <audio
        ref={audioRef}
        className="hidden"
        onPlaying={() => setProbando((p) => p)}
        onEnded={() => setProbando(null)}
        onError={() => setProbando(null)}
      />
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Voz del relato
      </span>
      <div className="mt-3 flex flex-wrap gap-2">
        {ACENTOS_DISPONIBLES.map((a) => (
          <button
            key={a}
            onClick={() => setAcento(a)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              acento === a
                ? "bg-primary text-primary-foreground"
                : "border border-border/70 text-muted-foreground hover:text-primary"
            }`}
          >
            {a}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {lista.map((v) => {
          const descargando = bajando[v.id];
          const guardada = listas.includes(v.id);
          return (
            <div
              key={v.id}
              className={`rounded-md border p-3 transition-all ${
                voz === v.id ? "border-primary bg-primary/10" : "border-border/70 hover:border-primary/50"
              }`}
            >
              <button onClick={() => elegir(v.id)} className="block w-full text-left">
                <span className="flex items-center gap-1 text-sm font-medium">
                  {v.label}
                  {guardada && <Check className="h-3 w-3 text-primary" />}
                </span>
                <span className="mt-1 block text-xs leading-snug text-muted-foreground">{v.hint}</span>
              </button>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => probar(v.id)}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  {probando === v.id && progreso < 100 ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                  {probando === v.id && progreso < 100 ? `${progreso}%` : "Escuchar"}
                </button>
                {descargando !== undefined ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Descargando {descargando}%
                  </span>
                ) : guardada ? (
                  <button
                    onClick={() => void quitarVoz(v.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Borrar
                  </button>
                ) : (
                  <button
                    onClick={() => void asegurarVoz(v.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
                  >
                    <Download className="h-3 w-3" />
                    Descargar {v.descargaMb} MB
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        {listas.length} de {VOCES.length} voces ya guardadas en este dispositivo. Al elegir una voz se
        descarga sola una única vez ({buscarVoz(voz).descargaMb} MB aprox.) y después el relato se narra
        al instante, sin créditos ni límites.
      </p>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

    </div>
  );
}

/** Elegir cómo se "pinta" cada escena al entrar. */
export function SelectorPintado({
  paint,
  onChange,
}: {
  paint: DocPaint;
  onChange: (id: DocPaint) => void;
}) {
  return (
    <div>
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Dibujado de la escena
      </span>
      <div className="mt-3 flex flex-wrap gap-2">
        {PAINT_STYLES.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              paint === p.id
                ? "bg-primary text-primary-foreground"
                : "border border-border/70 text-muted-foreground hover:text-primary"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        {PAINT_STYLES.find((p) => p.id === paint)?.hint}
      </p>
    </div>
  );
}
