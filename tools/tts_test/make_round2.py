"""Teise vooru testilehe ehitamine pilves: out2 (stage'itud) -> normaliseeritud koopiad -> leht."""
import json, os, shutil, statistics, sys
import tts_test as t, normalize_closure as nc

SRC = sys.argv[1]            # stage'itud out2 kaust
DST = sys.argv[2]            # töökaust lehe jaoks
shutil.rmtree(DST, ignore_errors=True)
kind_of = {}
for pre, post, opts, _ in t.TRIPLETS:
    for o in opts.split("|"):
        kind_of[pre + o + post] = "pikk" if o in ("k", "p", "t") else "ylipikk" if o in ("kk", "pp", "tt") else None
report = {}
for v in t.VOICES:
    os.makedirs(f"{DST}/{v}"); os.makedirs(f"{DST}/{v}N")
    stats = {"pikk": [], "ylipikk": []}
    for w in t.all_strings():
        src = f"{SRC}/{v}/{t.slug(w)}.mp3"
        shutil.copy(src, f"{DST}/{v}/{t.slug(w)}.mp3")
        k = kind_of[w]
        if not k:
            shutil.copy(src, f"{DST}/{v}N/{t.slug(w)}.mp3"); continue
        s = nc.read(src)
        out, before = nc.normalize(s, k)
        stats[k].append((round(before * 1000), w))
        nc.write(out, f"{DST}/{v}N/{t.slug(w)}.mp3")
    report[v] = stats
for v, st in report.items():
    for k, arr in st.items():
        ms = [a for a, _ in arr]
        print(f"{v:6s} {k:8s} mediaan {statistics.median(ms):4.0f} ms  vahemik {min(ms)}–{max(ms)}  ", sorted(arr))
names = {}
for v in t.VOICES:
    names[v] = v + " · nagu Gemini tegi"; names[v + "N"] = v + " · paus ühtlustatud"
json.dump({"voices": [x for v in t.VOICES for x in (v, v + "N")], "items": t.items(), "names": names,
           "note": "Seekord on kaks häält, kumbki kahes versioonis: üks nii, nagu Gemini selle tegi, "
                   "teises on sulghääliku paus ühtlustatud. Kumba parasjagu kuuled, seda ei öelda."},
          open(f"{DST}/test.json", "w", encoding="utf-8"), ensure_ascii=False)
