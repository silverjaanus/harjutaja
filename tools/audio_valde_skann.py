# -*- coding: utf-8 -*-
"""Valdeskann: motdab iga klipi taishaaliku ja sulghaaliku pikkuse ning
votab kokku, millised kolmikud kailduvad ootuspardsest mustrist.

Ootus: kolmikus (lyhike -> pikk -> ylipikk) peab pikenema SULGHAALIK,
mitte taishaalik. Kui taishaalik pikeneb palju, on klipp toenaoliselt
valesti loetud (nagu 'rata' -> 'raata').

Loeb ainult. Valjund: tools/audio_valde_skann.json ja .txt, logi .log.
"""
import json, os, re, subprocess, sys, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "tools", "wordbank", "data", "items_reviewed.json")
LOG = os.path.join(ROOT, "tools", "audio_valde_skann.log")
KINDS = ["lyhike", "pikk", "ylipikk"]

def log(msg):
    line = str(msg) + "\n"
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line)
    sys.stdout.write(line)
    sys.stdout.flush()

def measure(path):
    """Tagastab (taishaalik_s, sulg_s) voi None, kui sulgu ei leitud."""
    if not os.path.exists(path):
        return None
    cmd = ["ffmpeg", "-hide_banner", "-nostats", "-i", path,
           "-af", "silencedetect=noise=-40dB:d=0.03", "-f", "null", "-"]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=60,
                           encoding="utf-8", errors="replace")
    except Exception:
        return None
    out = (r.stderr or "") + (r.stdout or "")
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    if not starts or not ends:
        return None
    # algusvaikus
    lead = ends[0] if starts[0] < 0.01 else 0.0
    # esimene vaikus parast koneealgust = sulghaaliku sulg
    for i, s in enumerate(starts):
        if s > lead + 0.01:
            if i >= len(ends):
                return None
            return (s - lead, ends[i] - s)
    return None


def families():
    """(pre, post) -> {kind: sona}. Uks pere = uks kolmik."""
    items = json.load(open(DATA, encoding="utf-8"))
    fam = {}
    for it in items:
        opts = it.get("options") or []
        if len(opts) != 3:
            continue
        key = (it["pre"], it["post"])
        trio = {KINDS[i]: it["pre"] + opts[i] + it["post"] for i in range(3)}
        fam[key] = trio
    return fam

def scan(folder, words):
    """Motdab koik sonad uhes kaustas, kaheksa lohiku kaupa korraga."""
    res = {}
    paths = {w: os.path.join(ROOT, folder, w + ".mp3") for w in words}
    done = 0
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(measure, p): w for w, p in paths.items()}
        for fut in cf.as_completed(futs):
            res[futs[fut]] = fut.result()
            done += 1
            if done % 100 == 0:
                log("  %s: motdetud %d / %d" % (folder, done, len(paths)))
    return res

def ratios(trio, m):
    """Taishaaliku ja sulu suhted lyhikese vormi suhtes."""
    base = m.get(trio["lyhike"])
    out = {}
    for k in ("pikk", "ylipikk"):
        cur = m.get(trio[k])
        if not base or not cur or base[0] <= 0 or base[1] <= 0:
            out[k] = None
        else:
            out[k] = (cur[0] / base[0], cur[1] / base[1])
    return out


# Lavendid. V_MAX: taishaalik ei tohi pikas vormis olla ule selle korra
# pikem kui lyhikeses. S_MIN: sulg peab olema vahemalt nii mitu korda pikem.
V_MAX = 1.30
S_MIN = 1.40

def main():
    open(LOG, "w", encoding="utf-8").close()
    fam = families()
    words = sorted({w for t in fam.values() for w in t.values()})
    log("peresid %d, sonu %d" % (len(fam), len(words)))
    log("moodan Kore (kirjutaja/audio) ...")
    kore = scan(os.path.join("kirjutaja", "audio"), words)
    log("moodan Charon (kirjutaja/audio2) ...")
    charon = scan(os.path.join("kirjutaja", "audio2"), words)

    rows = []
    for (pre, post), trio in sorted(fam.items()):
        rk, rc = ratios(trio, kore), ratios(trio, charon)
        for k in ("pikk", "ylipikk"):
            a, b = rk[k], rc[k]
            if not a:
                continue
            # Ainult taishaaliku kriteerium. Sulu suhet EI kasutata:
            # lyhikese vormi g/b/d ei ole vaikus, seega see suhe on prugi.
            if a[0] <= V_MAX:
                continue
            why = [u"täishäälik %.2fx pikem" % a[0]]
            if b and b[0] <= V_MAX:
                why.append(u"Charonil korras (%.2fx)" % b[0])
            elif b:
                why.append(u"Charonil samuti pikk (%.2fx)" % b[0])
            else:
                why.append(u"Charoni klippi pole")
            if why:
                # jarjestus: mida suurem taishaaliku suhe, seda kahtlasem
                rows.append({"sona": trio[k], "vorm": k, "trio": trio,
                             "lyhike": trio["lyhike"],
                             "taishaalik": round(a[0], 2), "sulg": round(a[1], 2),
                             "charon_taishaalik": round(b[0], 2) if b else None,
                             "pohjus": ", ".join(why), "skoor": round(a[0], 3)})
    rows.sort(key=lambda r: -r["skoor"])

    json.dump({"lavendid": {"V_MAX": V_MAX, "S_MIN": S_MIN},
               "kahtlased": rows},
              open(os.path.join(ROOT, "tools", "audio_valde_skann.json"), "w",
                   encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(os.path.join(ROOT, "tools", "audio_valde_skann.txt"), "w",
              encoding="utf-8") as f:
        f.write("KAHTLASED KLIPID (%d), koige kahtlasem enne\n\n" % len(rows))
        for r in rows:
            f.write("%-14s (%-8s vs %-14s)  %s\n"
                    % (r["sona"], r["vorm"], r["lyhike"], r["pohjus"]))
    log("KAHTLASI %d / %d klippi" % (len(rows), len(words)))
    log("VALMIS")

if __name__ == "__main__":
    main()
