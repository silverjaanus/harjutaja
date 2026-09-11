"""Kirjutaja häälte test: 13 kolmiku kõik 39 varianti kahe Gemini häälega.

Käivitamine: python tts_test.py
Vajab GEMINI_API_KEY (Windowsi kasutaja keskkonnamuutuja) ja ffmpeg-i.
Tulemus: out2/<hääl>/<sõna>.mp3 ja out2/test.json. Paralleelsus: TTS_WORKERS (vaikimisi 4).
Iga sõna küsitakse eraldi päringuga (partiides jättis Gemini sõnu vahele), mitu korraga.
Olemasolevad korras failid jäetakse vahele.
"""
import base64, json, os, random, shutil, subprocess, sys, time, wave
import requests

MODEL = "gemini-3.1-flash-tts-preview"
URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent" % MODEL
VOICES = ["Charon", "Kore"]
PAUSE = int(os.environ.get("TTS_PAUSE", "30"))  # sekundit päringute vahel; tasulisel tasemel piisab 3-st
RATE = 24000
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out2")

STYLE_LIST = ("Loe need eesti keele sõnad ette ükshaaval, selgelt ja loomulikult, nagu "
              "õpetaja, aga tavalises tempos ja ilma sõna silpideks jaotamata. Hääldus on puhas eesti keel. "
              "Mõni sõna on meelega väljamõeldud — loe needki täpselt nii, nagu kirjas, eesti keele "
              "hääldusega. Iga sõna järel tee pikk paus. Ära loe midagi muud peale sõnade.\n\n")
STYLE_ONE = ("Loe see eesti keele sõna ette selgelt ja loomulikult, tavalises tempos ja ilma "
             "silpideks jaotamata. Kui see pole päris sõna, loe see täpselt nii, nagu kirjas, eesti "
             "keele hääldusega. Ära loe midagi muud.\n\n")

# Kolmikud: (algus, lõpp, lünga variandid, päris sõnad). Heli tehakse KÕIGILE variantidele,
# ka mittesõnadele (api, nugu) — laps peab kuulma, miks need ei sobi.
# Päris sõnade märge on siin ainult selleks, et teada, milliseid sõnu küsida;
# äpis tuleb sõna staatus sõnaraamatust (Ekilex), mitte sellest nimekirjast.
TRIPLETS = [
    ("ka", "i", "b|p|pp", "b|p|pp"),    # kabi, kapi, kappi
    ("ti", "u", "g|k|kk", "g|k|kk"),    # tigu, tiku, tikku
    ("lu", "u", "g|k|kk", "g|k|kk"),    # lugu, luku, lukku
    ("la", "i", "g|k|kk", "g|k|kk"),    # lagi, laki, lakki
    ("tu", "i", "g|k|kk", "g|k|kk"),    # tugi, tuki, tukki
    ("lõ", "u", "b|p|pp", "b|p|pp"),    # lõbu, lõpu, lõppu
    ("ku", "e", "g|k|kk", "k|kk"),      # kuke, kukke
    ("nu", "u", "g|k|kk", "k|kk"),      # nuku, nukku
    ("ko", "i", "d|t|tt", "t|tt"),      # koti, kotti
    ("se", "a", "b|p|pp", "p|pp"),      # sepa, seppa
    ("a", "i", "b|p|pp", "b|pp"),       # abi, appi
    ("tu", "a", "b|p|pp", "b|pp"),      # tuba, tuppa
    ("sõ", "a", "d|t|tt", "d|tt"),      # sõda, sõtta
]


def slug(word):
    return word.replace("õ", "6").replace("ä", "2").replace("ö", "7").replace("ü", "y")


def all_strings():
    out = []
    for pre, post, opts, _ in TRIPLETS:
        for o in opts.split("|"):
            out.append(pre + o + post)
    return out


def items():
    res = []
    for pre, post, opts, real in TRIPLETS:
        for o in real.split("|"):
            w = pre + o + post
            res.append({"id": slug(w), "word": w, "pre": pre, "post": post,
                        "options": opts.split("|"), "answer": o})
    return res

def get_key():
    k = os.environ.get("GEMINI_API_KEY")
    if k:
        return k
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h:
            return winreg.QueryValueEx(h, "GEMINI_API_KEY")[0]
    except Exception:
        sys.exit("GEMINI_API_KEY puudub")


def request_pcm(text, voice, key):
    body = {"contents": [{"parts": [{"text": text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    for attempt in range(4):
        r = requests.post(URL, headers={"x-goog-api-key": key}, json=body, timeout=300)
        if r.status_code == 200:
            cand = (r.json().get("candidates") or [{}])[0]
            parts = cand.get("content", {}).get("parts")
            if parts and "inlineData" in parts[0]:
                return base64.b64decode(parts[0]["inlineData"]["data"])
            print("  heli puudub (finishReason=%s), proovin uuesti 30 s pärast" % cand.get("finishReason"), flush=True)
            time.sleep(30)
            continue
        if r.status_code == 429:
            if "PerDay" in r.text or "per_day" in r.text.lower():
                sys.exit("Gemini päevalimiit täis. Käivita homme uuesti, tehtud failid jäävad alles.")
            print("  minutilimiit, ootan 70 s", flush=True)
            time.sleep(70)
            continue
        print("  HTTP %d: %s" % (r.status_code, r.text[:300]), flush=True)
        time.sleep(10)
    raise RuntimeError("päring ebaõnnestus")


def samples(pcm):
    return memoryview(pcm).cast("h")


def split_words(pcm, n_expected):
    """Lõika partii sõnadeks n-1 kõige pikema vaikuse kohalt.

    Sõnade vahel on sekundipikkused pausid, sõna sees (sulghääliku sulg) alla 0,3 s.
    Kui pikimad vaikused ei eristu selgelt ülejäänutest, tagastab None.
    """
    s = samples(pcm)
    frame = RATE // 50  # 20 ms
    energy = [max(abs(x) for x in s[i:i + frame]) for i in range(0, len(s) - frame, frame)]
    thr = 300
    loud = [e > thr for e in energy]
    if not any(loud):
        return None
    first = loud.index(True); last = len(loud) - 1 - loud[::-1].index(True)
    gaps, run_start = [], None  # (pikkus, algus, lõpp) kaadrites
    for i in range(first, last + 1):
        if not loud[i]:
            if run_start is None:
                run_start = i
        elif run_start is not None:
            gaps.append((i - run_start, run_start, i)); run_start = None
    if len(gaps) < n_expected - 1:
        return None
    gaps.sort(reverse=True)
    chosen = gaps[:n_expected - 1]
    shortest = chosen[-1][0] if chosen else 0
    longest_rest = gaps[n_expected - 1][0] if len(gaps) >= n_expected else 0
    if n_expected > 1 and (shortest < 30 or shortest < 1.5 * max(longest_rest, 1)):
        return None  # sõnavahed ei ole selgelt pikemad kui vaikused sõna sees
    cuts = sorted((a, b) for _, a, b in chosen)
    # iga tükk peab olema ühe sõna pikkune (0,3–1,6 s), muidu on partii segi
    bounds, prev = [], first
    for a, b in cuts:
        bounds.append((prev, a)); prev = b
    bounds.append((prev, last + 1))
    if any(not (15 <= b - a <= 80) for a, b in bounds):
        return None
    return [(a * frame, b * frame) for a, b in bounds]


def write_mp3(pcm_part, path, ffmpeg):
    s = samples(pcm_part)
    peak = max(1, max(abs(x) for x in s))
    gain = min(8.0, 29000 / peak)
    tmp = path + ".wav"
    with wave.open(tmp, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(pcm_part)
    subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", tmp, "-af", "volume=%.3f" % gain,
                    "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "64k", path], check=True)
    os.remove(tmp)


def cut(pcm, a, b):
    a = max(0, a - RATE * 8 // 100)  # 80 ms enne
    b = min(len(pcm) // 2, b + RATE * 15 // 100)  # 150 ms pärast
    return pcm[a * 2:b * 2]


def trim(pcm):
    s = samples(pcm); n = len(s)
    first = next((i for i in range(n) if abs(s[i]) > 300), 0)
    last = next((i for i in range(n - 1, -1, -1) if abs(s[i]) > 300), n - 1)
    return cut(pcm, first, last)


def valid_mp3(path, ffmpeg):
    """Fail on olemas ja dekodeerub vähemalt 0,2 s heliks (katkestatud kirjutamine ei loe)."""
    if not os.path.exists(path) or os.path.getsize(path) < 1500:
        return False
    r = subprocess.run([ffmpeg, "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", "8000", "-"],
                       capture_output=True)
    return r.returncode == 0 and len(r.stdout) > 2 * 8000 * 0.2


def make_one(word, voice, key, ffmpeg, vdir):
    pcm = request_pcm(STYLE_ONE + word + ".", voice, key)
    path = os.path.join(vdir, slug(word) + ".mp3")
    tmp = path + ".part.mp3"
    write_mp3(trim(pcm), tmp, ffmpeg)
    os.replace(tmp, path)
    return word


def main():
    from concurrent.futures import ThreadPoolExecutor, as_completed
    key = get_key()
    ffmpeg = shutil.which("ffmpeg") or sys.exit("ffmpeg puudub")
    workers = int(os.environ.get("TTS_WORKERS", "4"))
    strings = all_strings()
    for voice in VOICES:
        vdir = os.path.join(OUT, voice); os.makedirs(vdir, exist_ok=True)
        todo = [w for w in strings if not valid_mp3(os.path.join(vdir, slug(w) + ".mp3"), ffmpeg)]
        print("%s: teha %d sõna (%d paralleelselt)" % (voice, len(todo), workers), flush=True)
        with ThreadPoolExecutor(max_workers=workers) as ex:
            futs = {ex.submit(make_one, w, voice, key, ffmpeg, vdir): w for w in todo}
            for f in as_completed(futs):
                try:
                    print("  " + f.result(), flush=True)
                except Exception as e:
                    print("  VIGA %s: %s" % (futs[f], e), flush=True)
    missing = [(v, w) for v in VOICES for w in strings
               if not valid_mp3(os.path.join(OUT, v, slug(w) + ".mp3"), ffmpeg)]
    json.dump({"voices": VOICES, "items": items()},
              open(os.path.join(OUT, "test.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("PUUDU: %s" % missing if missing else "VALMIS", flush=True)


if __name__ == "__main__":
    main()
