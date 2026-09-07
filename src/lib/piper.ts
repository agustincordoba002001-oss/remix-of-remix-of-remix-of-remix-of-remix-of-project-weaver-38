import type { ProgressCallback } from "@mintplex-labs/piper-tts-web";

import { VOCES, buscarVoz } from "@/lib/voces";

export interface ProgresoPiper {
  porcentaje: number;
  generando: boolean;
}

let modeloActivo: string | null = null;

/** Genera un WAV íntegramente en el navegador con Piper (voces neuronales offline). */
export async function generarNarracionPiper(
  text: string,
  vozId: string,
  onProgress?: (progress: ProgresoPiper) => void,
): Promise<string> {
  const voz = buscarVoz(vozId);
  const piper = await import("@mintplex-labs/piper-tts-web");

  // Al cambiar de modelo, forzamos que la sesión reutilizada se reinicialice.
  if (modeloActivo !== voz.modelo) {
    piper.TtsSession._instance = null;
    modeloActivo = voz.modelo;
  }

  const config = {
    text: text.replace(/\s+/g, " ").trim(),
    voiceId: voz.modelo,
    // Algunos modelos (p. ej. Sharvard) son multi-hablante; speakerId selecciona el locutor.
    ...(voz.speakerId === undefined ? {} : { speakerId: voz.speakerId }),
  };

  const callback: ProgressCallback | undefined = onProgress
    ? ({ url, loaded, total }) => {
        const generando = url === piper.INFERENCE_PROGRESS_URL;
        onProgress({
          generando,
          porcentaje: total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0,
        });
      }
    : undefined;

  const blob = await piper.predict(config, callback);

  onProgress?.({ porcentaje: 100, generando: true });
  return URL.createObjectURL(blob);
}

interface PiperAlmacen {
  download: (voiceId: string, callback?: ProgressCallback) => Promise<void>;
  stored: () => Promise<string[]>;
  remove: (voiceId: string) => Promise<void>;
}

async function almacen(): Promise<PiperAlmacen> {
  return (await import("@mintplex-labs/piper-tts-web")) as unknown as PiperAlmacen;
}

/** Modelos de voz ya guardados en este dispositivo (ids de VOCES). */
export async function vocesDescargadas(): Promise<string[]> {
  try {
    const { stored } = await almacen();
    const modelos = await stored();
    return VOCES.filter((v) => modelos.includes(v.modelo)).map((v) => v.id);
  } catch {
    return [];
  }
}

/** Descarga y guarda el modelo de una voz para que luego suene al instante. */
export async function descargarVoz(
  vozId: string,
  onProgress?: (porcentaje: number) => void,
): Promise<void> {
  const voz = buscarVoz(vozId);
  const { download } = await almacen();
  await download(voz.modelo, ({ loaded, total }) => {
    if (total > 0) onProgress?.(Math.min(100, Math.round((loaded / total) * 100)));
  });
  onProgress?.(100);
}

/** Borra el modelo guardado para liberar espacio. */
export async function borrarVoz(vozId: string): Promise<void> {
  const voz = buscarVoz(vozId);
  const { remove } = await almacen();
  await remove(voz.modelo);
}
