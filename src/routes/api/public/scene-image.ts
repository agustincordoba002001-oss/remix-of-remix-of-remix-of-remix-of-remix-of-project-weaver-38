import { createFileRoute } from "@tanstack/react-router";

/**
 * Genera la ilustración de una escena usando un servicio gratuito e ilimitado
 * (Pollinations, sin API key ni consumo de créditos) y devuelve el PNG.
 * El proxy vive en el servidor para que el navegador no dependa de CORS ni de
 * reintentos del servicio externo.
 */
export const Route = createFileRoute("/api/public/scene-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const prompt = (url.searchParams.get("p") ?? "").slice(0, 900).trim();
        if (!prompt) return new Response("Missing prompt", { status: 400 });

        const seed = Number(url.searchParams.get("s") ?? url.searchParams.get("i") ?? 1) || 1;

        const target =
          `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
          `?width=1280&height=720&nologo=true&seed=${seed}&model=flux`;

        // Servicio gratuito: puede tardar o fallar puntualmente, reintentamos.
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const upstream = await fetch(target, {
              headers: { Accept: "image/*", "User-Agent": "CronosEstudio/1.0" },
            });
            if (upstream.ok && upstream.body) {
              return new Response(upstream.body, {
                headers: {
                  "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
                  "Cache-Control": "public, max-age=31536000, immutable",
                },
              });
            }
          } catch {
            // reintentamos
          }
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }

        return new Response("Image service unavailable", { status: 503 });
      },
    },
  },
});
