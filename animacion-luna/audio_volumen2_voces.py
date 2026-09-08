"""Narración oficial del Volumen 2 con las voces fijas Dark (narrador único).

Genera /tmp/luna/v2_2min.wav y /tmp/luna/marks_v2_2min.json, que consume
build_volumen2_2min.py.
"""
import json
import os
import re
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voces_space import sintetizar  # noqa: E402
from mastering import masterizar  # noqa: E402

SR = 48000
TMP = '/tmp/luna'
os.makedirs(TMP, exist_ok=True)
os.makedirs('/tmp/voces_seg', exist_ok=True)

# Guion original del video (18 frases). D = narrador Dark, X = cita en Dark.
# La puntuación y algunas grafías están adaptadas únicamente para guiar la
# pronunciación del sintetizador; el sentido y el texto mostrado no cambian.
# REGLA 1: todo nombre en inglés se escribe tal como suena en español
# (Kennedy -> "Quénedi", Shepard -> "Shéperd", White -> "Uáit", Chaffee ->
# "Cháfi", Grissom -> "Grísom", NASA -> "Nása", Apollo -> "Apolo",
# Nixon -> "Nícson", Washington -> "Washintong", Spider-Man -> "Espaiderman").
# REGLA 2: las fechas y los años van SIEMPRE en cifras ("25 de mayo de 1961",
# "Apolo 11"), nunca escritos en letras: así se pronuncian de corrido.
segs = [
 ("D", "Salí una noche al patio... y mirá para arriba. Ahí está: la Luna.", 0.45),
 ("D", "La misma que vieron los egipcios, los romanos... y tu bisabuelo. Blanca. Quieta. Inalcanzable.", 0.50),
 ("D", "Y en apenas ocho años, un grupo de ingenieros, con reglas de cálculo y café frío, la pisó.", 0.55),
 ("D", "Todo arranca el 25 de mayo de 1961, cuando Quénedi se para frente al Congreso y promete algo enorme:", 0.40),
 ("X", "Esta nación debe poner un hombre en la Luna antes del fin de la década, y devolverlo sano y salvo.", 0.55),
 ("D", "La sala aplaude. En la Nása... varios ingenieros se ponen pálidos.", 0.45),
 ("D", "Porque Estados Unidos tenía apenas quince minutos de experiencia en vuelo tripulado. Quince minutos: un salto corto de Álan Shéperd.", 0.45),
 ("D", "Los soviéticos ya le habían dado la vuelta completa al planeta con Iúri Gagárin. Iban ganando... y por mucho.", 0.45),
 ("D", "La carrera espacial no la movía la curiosidad. La movía el miedo: el que llegara primero, mandaba en el cielo.", 0.60),
 ("D", "Pero casi nadie cuenta cómo empezó de verdad ese camino. Empezó... con tres muertos.", 0.60),
 ("D", "Ellos eran Vércheil Gas Grísom: veterano, y el segundo estadounidense en el espacio.", 0.35),
 ("D", "Ed Uáit: el primer norteamericano en caminar fuera de la nave.", 0.35),
 ("D", "Y Róyer Cháfi: joven, ingeniero, a punto de volar por primera vez.", 0.50),
 ("D", "Es el 27 de enero de 1967, y ni siquiera era un lanzamiento: era un ensayo en tierra, con la cápsula del Apolo 1 cerrada, y llena de oxígeno puro a presión.", 0.45),
 ("D", "Un cable pelado hizo una chispa. En oxígeno puro, todo lo que toca el fuego se convierte en combustible.", 0.45),
 ("D", "La escotilla se abría hacia adentro, y tardaba minutos en ceder. Los tres murieron en menos de treinta segundos.", 0.65),
 ("X", "Este es un negocio riesgoso.", 0.45),
 ("D", "Lo había advertido Grísom meses antes. Después de ese incendio, la Nása rediseñó la nave entera. Y esa tragedia, aunque duela decirlo, fue lo que hizo posible llegar a la Luna.", 0.0),
]



def leer_wav(path):
    with wave.open(path, 'rb') as w:
        n = w.getnframes()
        raw = w.readframes(n)
        sr = w.getframerate()
        ch = w.getnchannels()
    a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0
    if ch > 1:
        a = a.reshape(-1, ch).mean(axis=1)
    if sr != SR:
        m = int(len(a) * SR / sr)
        a = np.interp(np.linspace(0, len(a) - 1, m), np.arange(len(a)), a).astype(np.float32)
    return a


def recortar_silencio(a, umbral=0.012):
    idx = np.where(np.abs(a) > umbral)[0]
    if len(idx) == 0:
        return a
    ini = max(0, idx[0] - int(0.04 * SR))
    fin = min(len(a), idx[-1] + int(0.10 * SR))
    return a[ini:fin]


parts = [np.zeros(int(0.35 * SR), np.float32)]
marks = []
tcur = 0.35
DRAMATICAS = ('muertos', 'murieron', 'miedo', 'tragedia', 'incendio',
              'pálidos', 'riesgoso', 'inalcanzable')
AGILES = ('porque', 'los soviéticos', 'la sala', 'todo arranca')


def ritmo(txt: str, gap: float) -> float:
    """Velocidad acorde a lo que se narra: los datos van ágiles y las frases
    con carga emocional se dicen más despacio."""
    t = txt.lower()
    v = 0.99
    if any(k in t for k in DRAMATICAS):
        v += 0.055
    if any(t.startswith(k) for k in AGILES):
        v -= 0.035
    if len(txt) > 140:            # frases largas: no arrastrarlas
        v -= 0.025
    # fechas y cifras: se dicen de corrido, sin trabarse
    # Las fechas se escriben en cifras (25 de mayo de 1961) porque así el
    # generador las dice de corrido y natural, sin trabarse.
    if re.search(r'\d', t):
        v -= 0.04
    return round(min(1.07, max(0.94, v)), 3)


def nivelar(a, objetivo=0.073, techo=0.68):
    """Deja todas las frases al mismo volumen percibido (RMS) sin saturar."""
    activo = a[np.abs(a) > 0.01]
    rms = float(np.sqrt(np.mean(activo ** 2))) if len(activo) else 1e-6
    g = objetivo / max(1e-6, rms)
    pico = float(np.abs(a).max()) or 1e-6
    g = min(g, techo / pico)
    return a * g


for i, (who, txt, gap) in enumerate(segs):
    voz = 'dark'  # narración completa con una sola voz
    # Expresividad frase a frase, acorde al contenido de cada línea.
    ajustes = {
        'length_scale': ritmo(txt, gap),
        'noise_scale': round(0.48 + (i % 3) * 0.01, 3),
        'noise_w': round(0.60 + (i % 2) * 0.02, 3),
    }
    raw = f'/tmp/voces_seg/v3_{i:02d}_{voz}.wav'
    dst = f'/tmp/voces_seg/v3_{i:02d}_{voz}_master.wav'
    if not os.path.exists(raw):
        sintetizar(txt, voz, raw, ajustes=ajustes)
    if not os.path.exists(dst):
        masterizar(raw, dst, voz)
    a = recortar_silencio(leer_wav(dst))
    a = nivelar(a, 0.079 if who == 'D' else 0.076)
    # pequeño respiro al final de cada frase para que no suene atropellada
    fade = int(0.05 * SR)
    a[:fade] *= np.linspace(0, 1, fade)
    a[-fade:] *= np.linspace(1, 0, fade)
    marks.append(dict(who=who, t0=tcur, t1=tcur + len(a) / SR, txt=txt))
    tcur += len(a) / SR + gap
    parts.append(a)
    parts.append(np.zeros(int(gap * SR), np.float32))

voz = np.concatenate(parts)
T = len(voz) / SR + 1.2
n = int(T * SR)

# Música espacial: drone grave, pad suspendido y destellos lejanos.
mus = np.zeros(n, np.float32)
tt_all = np.arange(n) / SR
mus += np.sin(2 * np.pi * 55.0 * tt_all) * 0.10 + np.sin(2 * np.pi * 55.4 * tt_all) * 0.08
mus += np.sin(2 * np.pi * 110.0 * tt_all) * 0.05 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * tt_all))
chords = [[220.00, 293.66, 329.63], [196.00, 261.63, 329.63],
          [174.61, 261.63, 349.23], [164.81, 246.94, 329.63]]
bar = 12.0
for i in range(int(T / bar) + 1):
    ch = chords[i % 4]
    s0 = int(i * bar * SR)
    if s0 >= n:
        break
    d = min(int(bar * SR), n - s0)
    tt = np.arange(d) / SR
    env = np.minimum(1, tt / 4.0) * np.minimum(1, (bar - tt) / 4.0)
    for f in ch:
        mus[s0:s0 + d] += np.sin(2 * np.pi * f * tt + 0.6 * np.sin(2 * np.pi * 0.12 * tt)) * env * 0.045
rng = np.random.default_rng(7)
for k in range(int(T / 3.5)):
    s0 = int((k * 3.5 + rng.uniform(0, 2.0)) * SR)
    if s0 >= n:
        break
    d = min(int(2.2 * SR), n - s0)
    tt = np.arange(d) / SR
    f = float(rng.choice([880.0, 1046.5, 1318.5, 1567.98]))
    mus[s0:s0 + d] += np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.6) * 0.018
k = 20
mus = np.convolve(mus, np.ones(k, np.float32) / k, mode='same')
mus *= 0.12
fade = int(3.5 * SR)
mus[:fade] *= np.linspace(0, 1, fade)
mus[-fade:] *= np.linspace(1, 0, fade)

# La música se aparta cuando entra la voz (ducking suave), para que la
# narración se escuche siempre clara y la mezcla no sature.
env = np.zeros(n, np.float32)
env[:len(voz)] = np.abs(voz[:n])
w = int(0.25 * SR)
env = np.convolve(env, np.ones(w, np.float32) / w, mode='same')
duck = 1.0 - 0.62 * np.clip(env / 0.09, 0, 1)
w2 = int(0.35 * SR)
duck = np.convolve(duck, np.ones(w2, np.float32) / w2, mode='same')
mus *= duck

out = mus.copy()
out[:len(voz)] += voz
pico = float(np.abs(out).max())
if pico > 0.76:
    out *= 0.76 / pico
out = np.clip(out, -1, 1)
with wave.open(f'{TMP}/v2_2min.wav', 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
json.dump(marks, open(f'{TMP}/marks_v2_2min.json', 'w'), ensure_ascii=False, indent=1)
print('dur', round(T, 2))
