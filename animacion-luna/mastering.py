"""Cadena de masterización de voz del proyecto.

Toma el WAV crudo de Piper (22.05 kHz, algo apagado y con siseos) y lo deja
con sonido de estudio: 48 kHz, sin ruido de fondo, graves limpios, cuerpo en
medios, brillo controlado y volumen parejo.
"""
import subprocess

SR_MASTER = 48000

# Ajustes por voz: Elena (narradora) necesita más cuerpo y aire controlado;
# Dark (citas) necesita claridad en medios sin engordar los graves.
PERFILES = {
    "elena": (
        "highpass=f=85,"
        "anlmdn=s=0.0004:p=0.004:r=0.008,"
        "equalizer=f=200:t=q:w=1.0:g=1.2,"       # algo de cuerpo, sin engordar
        "equalizer=f=430:t=q:w=1.2:g=-2.0,"      # saca el tono de cajón
        "equalizer=f=2600:t=q:w=1.2:g=2.2,"      # dicción y consonantes
        "equalizer=f=5200:t=q:w=1.4:g=1.0,"      # aire discreto
        "lowpass=f=15000,"
        "deesser=i=0.50:m=0.5:f=0.30,"
        "acompressor=threshold=-20dB:ratio=2.2:attack=15:release=220:makeup=1.5,"
        "alimiter=limit=0.89:level=disabled"
    ),
    "dark": (
        "highpass=f=70,"
        "equalizer=f=180:t=q:w=1.0:g=-0.8,"      # controla el exceso de pecho
        "equalizer=f=380:t=q:w=1.1:g=-1.4,"      # abre la zona turbia
        "equalizer=f=2200:t=q:w=1.0:g=1.2,"      # claridad sin aspereza
        "equalizer=f=4800:t=q:w=1.2:g=0.4,"
        "lowpass=f=14500,"
        "deesser=i=0.30:m=0.35:f=0.28,"
        "acompressor=threshold=-16dB:ratio=1.55:attack=28:release=260:makeup=1.0,"
        "alimiter=limit=0.82:level=disabled"
    ),
}


def masterizar(entrada: str, salida: str, voz: str, sr: int = SR_MASTER) -> str:
    """Aplica la cadena de estudio a un WAV de voz y lo deja a `sr` Hz mono."""
    objetivo = "-21" if voz == "dark" else "-19"
    cadena = PERFILES[voz] + f",loudnorm=I={objetivo}:TP=-4.0:LRA=10,aresample={sr}:resampler=soxr:precision=28"
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", entrada,
         "-af", cadena, "-ar", str(sr), "-ac", "1", "-c:a", "pcm_s16le", salida],
        check=True,
    )
    return salida
