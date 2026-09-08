import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ENDPOINT = "https://hircoir-piper-tts-spanish.hf.space/convert";

/** Voz fija del proyecto: Dark. Los ajustes replican la calibración del video. */
const MODELO = "models/es_MX-dark.onnx";

const esquema = z.object({
  texto: z.string().min(1).max(600),
  ritmo: z.number().min(0.9).max(1.2).optional(),
  claridad: z.number().min(0.4).max(0.8).optional(),
});

export const generarFrase = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => esquema.parse(data))
  .handler(async ({ data }) => {
    const body = JSON.stringify({
      text: data.texto,
      modelPath: MODELO,
      settings: {
        speaker: 0,
        noise_scale: data.claridad ?? 0.58,
        length_scale: data.ritmo ?? 1.06,
        noise_w: 0.7,
      },
    });

    let ultimo = "sin respuesta";
    for (let intento = 0; intento < 3; intento++) {
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const json = (await res.json()) as {
          success?: boolean;
          audio?: string;
          error?: string;
        };
        // El servicio responde { audio: "data:audio/wav;base64,..." }, a veces sin "success".
        if (json.audio && json.success !== false) {
          const audio = json.audio.includes(",") ? json.audio.split(",").pop()! : json.audio;
          return { audio: `data:audio/wav;base64,${audio}` };
        }
        ultimo = json.error ?? `respuesta inválida (${res.status})`;
      } catch (err) {
        ultimo = err instanceof Error ? err.message : String(err);
      }
    }
    throw new Error(`No se pudo generar la voz: ${ultimo}`);
  });
