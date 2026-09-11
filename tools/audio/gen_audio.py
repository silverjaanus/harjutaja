"""Kirjutaja heli: iga variant eraldi Gemini päringuga (hääl Kore), siis sulghääliku pausi ühtlustus.

Sisend: tools/wordbank/data/variants.json — [{word, id, kind: lyhike|pikk|ylipikk}]
Väljund: kirjutaja/audio_raw/<id>.mp3 (Gemini) ja kirjutaja/audio/<id>.mp3 (ühtlustatud, äpis kasutatav).
Kasutus: python gen_audio.py   (TTS_WORKERS vaikimisi 5; olemasolevad korras failid jäetakse vahele)
Häälte test (11. sept 2026): Kore + ühtlustus 32/32 õigesti; Gemini enda ülipikk on liiga lühike.
"""
import json, os, shutil, sys
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "tts_test"))
import tts_test as T              # request_pcm, trim, write_mp3, valid_mp3, get_key
import normalize_closure as NC    # read, normalize, write

VOICE = "Kore"
RAW = os.path.join(ROOT, "kirjutaja", "audio_raw")
OUT = os.path.join(ROOT, "kirjutaja", "audio")


def make(v, key, ffmpeg):
    raw = os.path.join(RAW, v["id"] + ".mp3")
    if not T.valid_mp3(raw, ffmpeg):
        pcm = T.request_pcm(T.STYLE_ONE + v["word"] + ".", VOICE, key)
        tmp = raw + ".part.mp3"
        T.write_mp3(T.trim(pcm), tmp, ffmpeg)
        os.replace(tmp, raw)
    out = os.path.join(OUT, v["id"] + ".mp3")
    if v["kind"] == "lyhike":
        shutil.copy(raw, out)
    else:
        s, _ = NC.normalize(NC.read(raw), v["kind"])
        NC.write(s, out)
    return v["word"]


def main():
    ffmpeg = shutil.which("ffmpeg") or sys.exit("ffmpeg puudub")
    key = T.get_key()
    os.makedirs(RAW, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    variants = json.load(open(os.path.join(ROOT, "tools", "wordbank", "data", "variants.json"), encoding="utf-8"))
    todo = [v for v in variants if not T.valid_mp3(os.path.join(OUT, v["id"] + ".mp3"), ffmpeg)]
    print("teha %d / %d" % (len(todo), len(variants)), flush=True)
    done = 0
    with ThreadPoolExecutor(max_workers=int(os.environ.get("TTS_WORKERS", "5"))) as ex:
        futs = {ex.submit(make, v, key, ffmpeg): v for v in todo}
        for f in as_completed(futs):
            try:
                f.result(); done += 1
                if done % 25 == 0:
                    print("  %d tehtud" % done, flush=True)
            except Exception as e:
                print("  VIGA %s: %s" % (futs[f]["word"], e), flush=True)
    missing = [v["word"] for v in variants if not T.valid_mp3(os.path.join(OUT, v["id"] + ".mp3"), ffmpeg)]
    print("PUUDU: %s" % missing if missing else "VALMIS", flush=True)


if __name__ == "__main__":
    main()
