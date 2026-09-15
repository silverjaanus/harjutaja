"""Keele mooduli heli: õpitavad read ja üksikud sõnad Gemini TTS-iga.

Read: üks päring rea kohta (lause on liiga pikk, et vaikuste järgi lõigata).
Sõnad: kümme sõna päringus, lõikus n-1 pikima vaikuse kohalt (tts_test.split_words).
Lühikesi abisõnu (a, an, the, to, at, in, is) ei tehta: need on lõikamiseks liiga
lühikesed ja mängus loeb neid ette brauseri enda hääl.

Kontroll: iga päringu heli kirjutab eraldi tekstimudel üles ja see peab
klappima oodatud tekstiga (väiketähed, kirjavahemärgid maha).
Olemasolevad failid jäetakse vahele — skripti võib korduvalt käivitada.

Sisend: keel/tunnid.js. Väljund: keel/audio/<rea id>.mp3, keel/audio/s/<sõna>.mp3.
Kasutus: python tools/keel_audio.py [--max-requests 30] [--voice Kore] [--dry]
"""
import argparse, base64, io, os, re, shutil, sys, time, wave
import requests

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "tts_test"))
import tts_test as T  # request_pcm, split_words, cut, trim, write_mp3, valid_mp3, get_key, RATE

OUT = os.path.join(ROOT, "keel", "audio")
OUT_S = os.path.join(OUT, "s")
LOG = os.path.join(ROOT, "tools", "keel_audio.log")
CHECK_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"]
LYHIKESED = {"a", "an", "the", "to", "at", "in", "is"}

STYLE_LINE = ("Read this English sentence aloud for a young child who is learning English. "
              "Use clear British English at a calm, natural pace, without pausing between the words. "
              "Read only the sentence, nothing else:\n")
STYLE_WORDS = ("Read these English words aloud one at a time, clearly, in British English. "
               "Make a long pause of about one second after each word. Read only the words, nothing else:\n")


def log(msg):
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def lae_read():
    src = open(os.path.join(ROOT, "keel", "tunnid.js"), encoding="utf-8").read()
    return [{"id": m.group(1), "en": m.group(2)}
            for m in re.finditer(r'\{\s*id:\s*"([^"]+)",\s*en:\s*"([^"]+)"', src)]


def puhas(s):
    s = s.lower().replace("’", "'")
    return " ".join(re.sub(r"[^a-z' ]", " ", s).split())


def sona_fail(w):
    return re.sub(r"[^a-z]", "", w.lower())


def sonad(read):
    out = []
    for r in read:
        for w in puhas(r["en"]).split():
            if w not in LYHIKESED and w not in out:
                out.append(w)
    return out


def wav_bytes(pcm):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(T.RATE); w.writeframes(pcm)
    return buf.getvalue()


def transcribe(pcm, key, mitu=None):
    if mitu:
        prompt = ("This audio contains %d English words read one at a time. Write them exactly as you hear them, "
                  "in order, one word per line, lowercase, no numbers or punctuation. Nothing else." % mitu)
    else:
        prompt = "Write down exactly the English sentence you hear in this audio. Nothing else."
    body = {"contents": [{"parts": [{"text": prompt},
                                    {"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(wav_bytes(pcm)).decode()}}]}]}
    for model in CHECK_MODELS:
        url = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent" % model
        r = requests.post(url, headers={"x-goog-api-key": key}, json=body, timeout=120)
        if r.status_code == 200:
            try:
                return r.json()["candidates"][0]["content"]["parts"][0]["text"]
            except Exception:
                return None
        log("  kontrollmudel %s: HTTP %d" % (model, r.status_code))
    return None


class Limiit(Exception):
    pass


def tts(text, voice, key, st, limit):
    if st["tts"] >= limit:
        raise Limiit()
    st["tts"] += 1
    return T.request_pcm(text, voice, key)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-requests", type=int, default=30)
    ap.add_argument("--voice", default="Kore")
    ap.add_argument("--batch", type=int, default=10)
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    os.makedirs(OUT_S, exist_ok=True)
    ffmpeg = shutil.which("ffmpeg") or sys.exit("ffmpeg puudub")
    read = lae_read()
    koik_sonad = sonad(read)
    puudu_r = [r for r in read if not T.valid_mp3(os.path.join(OUT, r["id"] + ".mp3"), ffmpeg)]
    puudu_s = [w for w in koik_sonad if not T.valid_mp3(os.path.join(OUT_S, sona_fail(w) + ".mp3"), ffmpeg)]
    log("read %d (puudu %d), sõnad %d (puudu %d), hääl %s" % (len(read), len(puudu_r), len(koik_sonad), len(puudu_s), a.voice))
    if a.dry:
        log("  puuduvad read: %s" % [r["id"] for r in puudu_r])
        log("  puuduvad sõnad: %s" % puudu_s)
        return
    key = T.get_key()
    st = {"tts": 0}
    try:
        for r in puudu_r:
            for katse in (1, 2):
                pcm = T.trim(tts(STYLE_LINE + r["en"], a.voice, key, st, a.max_requests))
                kuulis = transcribe(pcm, key)
                if kuulis is not None and puhas(kuulis) != puhas(r["en"]):
                    log("  %s: kuulis '%s' (katse %d)" % (r["id"], kuulis.strip(), katse))
                    continue
                path = os.path.join(OUT, r["id"] + ".mp3")
                T.write_mp3(pcm, path + ".part.mp3", ffmpeg); os.replace(path + ".part.mp3", path)
                log("  %s valmis%s" % (r["id"], "" if kuulis is not None else " (kontrollimata)"))
                break
        for i in range(0, len(puudu_s), a.batch):
            partii = puudu_s[i:i + a.batch]
            for katse in (1, 2):
                pcm = tts(STYLE_WORDS + "\n".join(w + "." for w in partii), a.voice, key, st, a.max_requests)
                osad = T.split_words(pcm, len(partii))
                if not osad:
                    log("  lõikus ei klapi: %s (katse %d)" % (partii, katse)); continue
                kuulis = transcribe(pcm, key, len(partii))
                kuulis = [puhas(x) for x in (kuulis or "").splitlines() if x.strip()]
                if len(kuulis) != len(partii):
                    log("  kontroll kuulis %d sõna %d-st (katse %d)" % (len(kuulis), len(partii), katse)); continue
                for w, h, (x, y) in zip(partii, kuulis, osad):
                    if h != w:
                        log("  jätan vahele %s (kuulis %s)" % (w, h)); continue
                    path = os.path.join(OUT_S, sona_fail(w) + ".mp3")
                    T.write_mp3(T.cut(pcm, x, y), path + ".part.mp3", ffmpeg); os.replace(path + ".part.mp3", path)
                log("  partii valmis: %s" % partii)
                break
    except Limiit:
        log("PEATUS: selle käivituse päringulimiit (%d) täis" % a.max_requests)
    log("TTS päringuid %d" % st["tts"])
    jaak_r = [r["id"] for r in read if not T.valid_mp3(os.path.join(OUT, r["id"] + ".mp3"), ffmpeg)]
    jaak_s = [w for w in koik_sonad if not T.valid_mp3(os.path.join(OUT_S, sona_fail(w) + ".mp3"), ffmpeg)]
    log("PUUDU read: %s; sõnad: %s" % (jaak_r or "-", jaak_s or "-"))


if __name__ == "__main__":
    main()
