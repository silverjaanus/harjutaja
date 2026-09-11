"""Kirjutaja heli partiidena: 12 sõna ühe Gemini TTS päringuga, lõikus vaikuste kohalt, automaatne kontroll.

Miks partiid: gemini-3.1-flash-tts lubab tasulisel Tier 1 tasemel 100 päringut päevas.
Kontroll: partii heli transkribeerib eraldi tekstimudel (teine limiit) ja iga sõna kaashäälikuskelett
(topelttähed kokku, g→k, b→p, d→t) peab klappima oodatuga — nii ei satu sõna vale faili alla.
Pikkust (kapi/kappi) transkriptsioon ei kontrolli — selle eest hoolitseb sulu ühtlustus.

Sisend: tools/wordbank/data/variants.json. Väljund: kirjutaja/audio_raw/<id>.mp3, kirjutaja/audio/<id>.mp3.
Kasutus: python tools/audio_gen.py [--max-requests 95] [--batch 12]
"""
import argparse, base64, io, json, os, random, re, shutil, sys, time, wave
import requests

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "tts_test"))
import tts_test as T             # request_pcm, split_words, cut, trim, write_mp3, valid_mp3, get_key, STYLE_LIST, STYLE_ONE
import normalize_closure as NC   # read, normalize, write

VOICE = "Kore"
CHECK_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"]
RAW = os.path.join(ROOT, "kirjutaja", "audio_raw")
OUT = os.path.join(ROOT, "kirjutaja", "audio")
LOG = os.path.join(ROOT, "tools", "audio_gen.log")
used = {"tts": 0}


def log(msg):
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True)
    open(LOG, "a", encoding="utf-8").write(line + "\n")


def skeleton(w):
    w = w.lower().strip(" .,!?;:\"'")
    w = w.replace("g", "k").replace("b", "p").replace("d", "t")
    return re.sub(r"(.)\1+", r"\1", w)


def wav_bytes(pcm):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(T.RATE); w.writeframes(pcm)
    return buf.getvalue()


def transcribe(pcm, n, key):
    prompt = ("Selles helis loetakse ükshaaval ette %d eestikeelset sõna (mõned on väljamõeldud). "
              "Kirjuta need täpselt nii, nagu kuuled, järjekorras, iga sõna eraldi real, ilma numbrite ja "
              "kirjavahemärkideta. Ära lisa midagi muud." % n)
    body = {"contents": [{"parts": [{"text": prompt},
                                    {"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(wav_bytes(pcm)).decode()}}]}]}
    for model in CHECK_MODELS:
        url = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent" % model
        r = requests.post(url, headers={"x-goog-api-key": key}, json=body, timeout=120)
        if r.status_code == 200:
            try:
                text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
                return [x.strip() for x in text.splitlines() if x.strip()]
            except Exception:
                return None
        log("  kontrollmudel %s: HTTP %d" % (model, r.status_code))
    return None


def save(v, pcm_part, ffmpeg):
    raw = os.path.join(RAW, v["id"] + ".mp3")
    tmp = raw + ".part.mp3"
    T.write_mp3(pcm_part, tmp, ffmpeg); os.replace(tmp, raw)
    out = os.path.join(OUT, v["id"] + ".mp3")
    if v["kind"] == "lyhike":
        shutil.copy(raw, out)
    else:
        s, _ = NC.normalize(NC.read(raw), v["kind"])
        NC.write(s, out)


def tts(text, key, limit):
    if used["tts"] >= limit:
        raise RuntimeError("päeva päringulimiit (%d) täis" % limit)
    used["tts"] += 1
    return T.request_pcm(text, VOICE, key)


def do_batch(batch, key, ffmpeg, limit):
    """Tagastab edukalt tehtud variandid. Proovib partiina kuni kaks korda."""
    for attempt in (1, 2):
        pcm = tts(T.STYLE_LIST + "\n".join(v["word"] + "." for v in batch), key, limit)
        segs = T.split_words(pcm, len(batch))
        if not segs:
            log("  lõikus ei klapi (katse %d)" % attempt); continue
        heard = transcribe(pcm, len(batch), key)
        if not heard or len(heard) != len(batch):
            log("  kontroll: kuulis %s sõna (katse %d)" % (len(heard) if heard else "0", attempt)); continue
        bad = [(v["word"], h) for v, h in zip(batch, heard) if skeleton(v["word"]) != skeleton(h)]
        if bad:
            log("  kontroll ei klapi: %s (katse %d)" % (bad, attempt)); continue
        for v, (a, b) in zip(batch, segs):
            save(v, T.cut(pcm, a, b), ffmpeg)
        return batch
    return []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-requests", type=int, default=95)
    ap.add_argument("--batch", type=int, default=12)
    a = ap.parse_args()
    ffmpeg = shutil.which("ffmpeg") or sys.exit("ffmpeg puudub")
    key = T.get_key()
    os.makedirs(RAW, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    variants = json.load(open(os.path.join(ROOT, "tools", "wordbank", "data", "variants.json"), encoding="utf-8"))
    todo = [v for v in variants if not T.valid_mp3(os.path.join(OUT, v["id"] + ".mp3"), ffmpeg)]
    random.Random(1).shuffle(todo)
    log("teha %d / %d, partii %d, päringuid kuni %d" % (len(todo), len(variants), a.batch, a.max_requests))
    done = 0
    try:
        i = 0
        while i < len(todo):
            batch = todo[i:i + a.batch]; i += a.batch
            ok = do_batch(batch, key, ffmpeg, a.max_requests)
            if not ok and len(batch) > 3:
                half = len(batch) // 2          # kaks väiksemat partiid
                ok = do_batch(batch[:half], key, ffmpeg, a.max_requests) + do_batch(batch[half:], key, ffmpeg, a.max_requests)
            done += len(ok)
            log("  tehtud %d (TTS päringuid %d)" % (done, used["tts"]))
            time.sleep(int(os.environ.get("TTS_PAUSE", "7")))
    except (RuntimeError, SystemExit) as e:
        log("PEATUS: %s" % e)
    missing = [v["word"] for v in variants if not T.valid_mp3(os.path.join(OUT, v["id"] + ".mp3"), ffmpeg)]
    log("VALMIS" if not missing else "PUUDU %d: %s" % (len(missing), " ".join(missing[:60])))


if __name__ == "__main__":
    main()
