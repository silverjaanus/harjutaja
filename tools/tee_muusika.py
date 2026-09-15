"""Harjutaja taustamuusika generaator (raamistiku etapp 6, 15. sept 2026).

Lood on tehtud siin, numpy-ga, mitte alla laaditud: nii pole litsentsimuret ja
iga lugu on korratav. Lugu on vaikne ja aeglane, sest laps mõtleb samal ajal.
Iga lugu kordub sujuvalt (lõpp sulandub algusesse).

Loo vahetamine: pane moodulisse uus fail (nt korrutaja/muusika-3.mp3) ja lisa
see mooduli HMuusika.init({ src: [...] }) loendisse; tõsta sw.js VERSION.
NB: anna muudetud loole ALATI uus number. sw.js hoiab mp3-faile vahemälus
igavesti, nii et sama nimega uus fail ei jõuaks kunagi telefoni.
Uue loo tegemiseks lisa see LOOD alla ja käivita:
    python3 tools/tee_muusika.py            # kõik lood
    python3 tools/tee_muusika.py korrutaja-1
Vaja: numpy, ffmpeg.
"""
import os
import subprocess
import sys
import numpy as np

SR = 32000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NOODID = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def hz(nimi):
    """'A4' -> 440.0"""
    n, o = nimi[:-1], int(nimi[-1])
    return 440.0 * 2 ** ((NOODID[n] + 12 * (o + 1) - 69) / 12)


def ymbrik(n, a, d, s, r, kestus):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    lopp = kestus
    e = e * np.clip(1 - (t - lopp) / max(r, 1e-4), 0, 1)
    return e


def pill(f, kestus, liik, tugevus=1.0):
    r = {'pad': 1.2, 'klokk': 1.6, 'marimba': 0.5, 'bass': 0.3, 'kell': 2.2}[liik]
    n = int((kestus + r) * SR)
    t = np.arange(n) / SR
    if liik == 'pad':
        x = sum(np.sin(2 * np.pi * f * m * t + k) / (m ** 1.6)
                for m, k in [(1, 0), (2, 1.3), (3, 2.1)])
        x += 0.6 * np.sin(2 * np.pi * f * 1.004 * t)
        e = ymbrik(n, 0.9, 1.0, 0.8, r, kestus)
        x *= 0.35
    elif liik == 'klokk':      # pehme elektriklaver (FM)
        mod = np.sin(2 * np.pi * f * 2 * t) * 1.2 * np.exp(-t * 3)
        x = np.sin(2 * np.pi * f * t + mod)
        e = ymbrik(n, 0.005, 0.9, 0.25, r, kestus)
    elif liik == 'marimba':
        x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 20)
        e = ymbrik(n, 0.003, 0.35, 0.0, r, kestus)
    elif liik == 'kell':       # klaasikõla
        x = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 2)
             + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 4))
        e = ymbrik(n, 0.004, 1.4, 0.0, r, kestus)
    else:                      # bass
        x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2 * t)
        e = ymbrik(n, 0.02, 0.6, 0.5, r, kestus)
    return x * e * tugevus


def kaja(x, viivitus=0.33, tagasi=0.35, segu=0.25):
    d = int(viivitus * SR)
    y = x.copy()
    for i in range(1, 6):
        if d * i >= len(x):
            break
        y[d * i:] += x[:-d * i] * (tagasi ** i) * segu
    # pehme "ruum": paar lühikest viivitust
    for ms, g in [(0.029, 0.18), (0.041, 0.15), (0.053, 0.12)]:
        k = int(ms * SR)
        y[k:] += x[:-k] * g
    return y


def lugu(tempo, akordid, meloodia, pillid, tahti_kordus=4, seemne=1, bassi=True):
    """akordid: tahtide kaupa noodinimede loendid; meloodia: (lööginr, noot, kestus löökides)."""
    rng = np.random.default_rng(seemne)
    loog = 60.0 / tempo
    tahte = len(akordid) * tahti_kordus
    pikkus = tahte * 4 * loog
    buf = np.zeros(int((pikkus + 6) * SR))

    def lisa(x, algus):
        i = int(algus * SR)
        j = min(len(buf), i + len(x))
        buf[i:j] += x[:j - i]

    for k in range(tahti_kordus):
        for a, akord in enumerate(akordid):
            t0 = (k * len(akordid) + a) * 4 * loog
            for nimi in akord:
                lisa(pill(hz(nimi), 4 * loog, 'pad', 0.07), t0)
            if bassi:
                juur = akord[0][:-1] + '2'
                lisa(pill(hz(juur), 1.6 * loog, 'bass', 0.07), t0)
                lisa(pill(hz(juur), 1.2 * loog, 'bass', 0.045), t0 + 2.5 * loog)
    # meloodia: igal kordusel veidi erinev (mõni noot jääb ära, tugevus kõigub)
    for k in range(tahti_kordus):
        for (lk, noot, kest) in meloodia:
            if k % 2 == 1 and rng.random() < 0.3:
                continue
            t0 = k * len(akordid) * 4 * loog + lk * loog + rng.normal(0, 0.006)
            liik = pillid[k % len(pillid)]
            lisa(pill(hz(noot), kest * loog, liik, 0.35 * (0.8 + 0.3 * rng.random())), max(0, t0))
    buf = kaja(buf, viivitus=loog * 0.75)
    n = int(pikkus * SR)
    # sujuv kordus: saba sulandub algusesse
    saba = buf[n:n + 4 * SR]
    buf = buf[:n].copy()
    buf[:len(saba)] += saba
    # Tase: keskmiselt umbes -31 dB (Kella lugu on -34 dB), tipp alla -1 dB.
    rms = np.sqrt(np.mean(buf ** 2))
    buf *= 10 ** (-31 / 20) / rms
    tipp = np.max(np.abs(buf))
    if tipp > 0.89:
        buf *= 0.89 / tipp
    return buf


LOOD = {
    # Korrutaja: C-duur, rahulik, elektriklaver + marimba
    'korrutaja-1': dict(
        tempo=76, seemne=3, pillid=['klokk', 'marimba'],
        akordid=[['C3', 'E3', 'G3'], ['A2', 'C3', 'E3'], ['F2', 'A2', 'C3'], ['G2', 'B2', 'D3']],
        meloodia=[(0, 'E5', 1), (1, 'G5', 1), (2, 'C6', 2), (4.5, 'A5', 1), (6, 'E5', 2),
                  (8, 'F5', 1), (9, 'A5', 1), (10, 'C6', 1.5), (12, 'D5', 1), (13, 'G5', 1), (14, 'B5', 2)]),
    'korrutaja-2': dict(
        tempo=70, seemne=7, pillid=['marimba', 'kell'],
        akordid=[['F2', 'A2', 'C3'], ['D3', 'F3', 'A3'], ['A#2', 'D3', 'F3'], ['C3', 'E3', 'G3']],
        meloodia=[(0, 'A5', 1.5), (2, 'C6', 1), (3, 'F5', 1), (4, 'D5', 2), (6.5, 'F5', 1),
                  (8, 'D5', 1), (9, 'F5', 1), (10, 'A#5', 2), (12, 'C6', 1), (13.5, 'G5', 2)]),
    # Teisendaja: D-duur, natuke liikuvam, klaasikõla
    'teisendaja-1': dict(
        tempo=84, seemne=11, pillid=['kell', 'klokk'],
        akordid=[['D3', 'F#3', 'A3'], ['B2', 'D3', 'F#3'], ['G2', 'B2', 'D3'], ['A2', 'C#3', 'E3']],
        meloodia=[(0, 'F#5', 1), (1, 'A5', 1), (2, 'D6', 1), (3, 'A5', 1), (4.5, 'B5', 1.5), (6, 'F#5', 2),
                  (8, 'G5', 1), (9, 'B5', 1), (10, 'D6', 2), (12, 'E5', 1), (13, 'A5', 1), (14, 'C#6', 2)]),
    'teisendaja-2': dict(
        tempo=78, seemne=5, pillid=['klokk', 'marimba'],
        akordid=[['G2', 'B2', 'D3'], ['E3', 'G3', 'B3'], ['C3', 'E3', 'G3'], ['D3', 'F#3', 'A3']],
        meloodia=[(0, 'B5', 1), (1.5, 'D6', 1), (3, 'G5', 1), (4, 'E5', 2), (6, 'G5', 1),
                  (8, 'E5', 1), (9, 'G5', 1), (10, 'C6', 2), (12, 'A5', 1), (13, 'F#5', 1), (14, 'D5', 2)]),
}


def kirjuta(nimi, x):
    moodul, nr = nimi.split('-')
    siht = os.path.join(ROOT, moodul, f'muusika-{nr}.mp3')
    pcm = (x * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-codec:a', 'libmp3lame', '-b:a', '64k', '-ar', '32000', siht], input=pcm, check=True)
    print(siht, os.path.getsize(siht) // 1024, 'KB', round(len(x) / SR, 1), 's')


if __name__ == '__main__':
    valik = sys.argv[1:] or list(LOOD)
    for nimi in valik:
        kirjuta(nimi, lugu(**LOOD[nimi]))
