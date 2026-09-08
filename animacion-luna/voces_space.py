"""Voces oficiales del proyecto: Lilith (narradora) y Dark (citas).

Se sintetizan con el generador Piper en español de HirCoir. Los ajustes
de expresividad (ritmo, variación y pausas) están calibrados para que la
narración suene natural y no monótona.
"""
import base64
import json
import urllib.request

ENDPOINT = "https://hircoir-piper-tts-spanish.hf.space/convert"

# Voces fijas del proyecto.
VOCES = {
    # Narradora principal: cálida, ritmo pausado y algo de variación melódica.
    "lilith": {
        "modelPath": "models/es_MX-lilith.onnx",
        "settings": {"speaker": 0, "noise_scale": 0.72, "length_scale": 1.08, "noise_w": 0.85},
    },
    # Voz de las citas y frases graves: más lenta y sobria.
    "dark": {
        "modelPath": "models/es_MX-dark.onnx",
        "settings": {"speaker": 0, "noise_scale": 0.65, "length_scale": 1.14, "noise_w": 0.78},
    },
}


def sintetizar(texto: str, voz: str, destino: str, reintentos: int = 3) -> str:
    """Genera un WAV con la voz indicada y lo guarda en `destino`."""
    cfg = VOCES[voz]
    cuerpo = json.dumps({
        "text": texto,
        "modelPath": cfg["modelPath"],
        "settings": cfg["settings"],
    }).encode()
    ultimo = None
    for _ in range(reintentos):
        try:
            req = urllib.request.Request(ENDPOINT, cuerpo, {"Content-Type": "application/json"})
            data = json.load(urllib.request.urlopen(req, timeout=580))
            if data.get("success"):
                audio = data["audio"].split(",")[-1]
                with open(destino, "wb") as f:
                    f.write(base64.b64decode(audio))
                return destino
            ultimo = data.get("error")
        except Exception as err:  # noqa: BLE001
            ultimo = err
    raise RuntimeError(f"No se pudo sintetizar con {voz}: {ultimo}")
