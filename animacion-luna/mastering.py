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
        "highpass=f=80,"
        "anlmdn=s=0.0006:p=0.004:r=0.008,"
        "equalizer=f=140:t=q:w=1.0:g=1.5,"
        "equalizer=f=350:t=q:w=1.2:g=-2.0,"
        "equalizer=f=2000:t=q:w=1.0:g=2.2,"
        "equalizer=f=4000:t=q:w=1.1:g=2.4,"
        "deesser=i=0.35:m=0.5:f=0.30,"
        "aexciter=level_in=1:level_out=1:amount=1.2:drive=5:blend=0.6:freq=7000,"
        "acompressor=threshold=-20dB:ratio=3.0:attack=10:release=200:makeup=2.4,"
        "alimiter=limit=0.94"
    ),
}


def masterizar(entrada: str, salida: str, voz: str, sr: int = SR_MASTER) -> str:
    """Aplica la cadena de estudio a un WAV de voz y lo deja a `sr` Hz mono."""
    cadena = PERFILES[voz] + f",loudnorm=I=-19:TP=-3.0:LRA=8,aresample={sr}:resampler=soxr:precision=28"
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", entrada,
         "-af", cadena, "-ar", str(sr), "-ac", "1", "-c:a", "pcm_s16le", salida],
        check=True,
    )
    return salida
