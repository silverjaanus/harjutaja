"""Sulghääliku sulu pikkuse ühtlustamine: pikk (k/p/t) ~160 ms, ülipikk (kk/pp/tt) ~380 ms.

Gemini hääldab II ja III väldet ebaühtlaselt (mõõdetud: II välde 180–480 ms, III 370–560 ms).
Skript leiab sõna seest pikima vaikse lõigu (sulg) ja asendab selle keskosa vaikusega nii,
et sulg saab sihtpikkuse. Algus ja lõpp (20 ms) jäävad alles, et üleminek kõlaks loomulikult.
Kasutus: python normalize_closure.py SISEND.mp3 VÄLJUND.mp3 {pikk|ylipikk}
"""
import array, subprocess, sys

RATE = 24000
TARGET = {"pikk": 0.16, "ylipikk": 0.38}


def read(path):
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(RATE), "-"],
                       capture_output=True, check=True)
    return array.array("h", r.stdout)


def closure(s):
    fr = RATE // 100
    e = [max(abs(x) for x in s[i:i + fr]) for i in range(0, len(s) - fr, fr)]
    thr = max(e) * 0.06
    loud = [x > thr for x in e]
    a = loud.index(True); b = len(loud) - 1 - loud[::-1].index(True)
    best, run = (0, 0), None
    for i in range(a, b + 1):
        if not loud[i]:
            run = i if run is None else run
        elif run is not None:
            if i - run > best[1] - best[0]:
                best = (run, i)
            run = None
    return best[0] * fr, best[1] * fr


def normalize(s, kind):
    c0, c1 = closure(s)
    keep = int(0.02 * RATE)
    target = int(TARGET[kind] * RATE)
    if c1 - c0 < 2 * keep:
        return s, (c1 - c0) / RATE
    head, tail = s[:c0 + keep], s[c1 - keep:]
    mid = max(0, target - 2 * keep)
    return head + array.array("h", [0] * mid) + tail, (c1 - c0) / RATE


def write(s, path):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(RATE), "-ac", "1", "-i", "-",
                    "-codec:a", "libmp3lame", "-b:a", "64k", path], input=s.tobytes(), check=True)


if __name__ == "__main__":
    src, dst, kind = sys.argv[1:4]
    out, before = normalize(read(src), kind)
    write(out, dst)
    print("%s: sulg %.0f ms -> %.0f ms" % (dst, before * 1000, TARGET[kind] * 1000))
