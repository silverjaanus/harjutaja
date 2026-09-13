"""Kirjutaja ehitus: kirjutaja/data.js (ainult sõnad, mille kõigil variantidel on heli) ja sw.js versioon.

Sisend: tools/wordbank/data/items_reviewed.json, valikuliselt tools/wordbank/data/decisions.json
(Silveri otsused ülevaatuse lehelt: {id: {drop, sentence}}), heli kaustas kirjutaja/audio.
Kasutus: python tools/build_kirjutaja.py
"""
import json, os, re, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
P = lambda *a: os.path.join(ROOT, *a)
slug = lambda w: w.replace("õ", "6").replace("ä", "2").replace("ö", "7").replace("ü", "y")

items = json.load(open(P("tools", "wordbank", "data", "items_reviewed.json"), encoding="utf-8"))
dec_path = P("tools", "wordbank", "data", "decisions.json")
dec = json.load(open(dec_path, encoding="utf-8")) if os.path.exists(dec_path) else {}
audio = {f[:-4] for f in os.listdir(P("kirjutaja", "audio")) if f.endswith(".mp3")}

keep, total = [], 0
for it in items:
    d = dec.get(it["id"], {})
    drop = d.get("drop", bool(it.get("auto_drop")))
    if drop:
        continue
    total += 1
    sentence = d.get("sentence") or it.get("sentence")
    if not all(slug(it["pre"] + o + it["post"]) in audio for o in it["options"]):
        continue
    keep.append({k: it[k] for k in ("id", "word", "lemma", "pre", "post", "answer", "options")} | {"sentence": sentence})

stamp = time.strftime("%Y%m%d%H%M")
js = "window.KIRJUTAJA_DATA = " + json.dumps({"version": stamp, "total": total, "items": keep}, ensure_ascii=False) + ";\n"
open(P("kirjutaja", "data.js"), "w", encoding="utf-8").write(js)

# core/config.js: Supabase URL ja avalik võti kõigile moodulitele ühest kohast.
# Korrutaja saab need build.py kaudu otse index.html-i sisse; Kirjutaja ja
# järgmised moodulid on staatilised failid ja loevad selle skripti.
cfg_src = P("korrutaja", "config.json")
if os.path.exists(cfg_src):
    cfg = json.load(open(cfg_src, encoding="utf-8"))
    open(P("core", "config.js"), "w", encoding="utf-8").write(
        "/* Genereeritud: python tools/build_kirjutaja.py. Ära muuda käsitsi. */\n"
        "window.HARJUTAJA_SB = " + json.dumps({"url": cfg.get("url", ""), "key": cfg.get("key", "")}) + ";\n")

sw_path = P("sw.js")
sw = open(sw_path, encoding="utf-8").read()
sw = re.sub(r"const VERSION = '[^']*';", "const VERSION = 'h-%s';" % stamp, sw)
open(sw_path, "w", encoding="utf-8").write(sw)
print("sõnu mängus %d / %d, heliklippe %d, versioon %s" % (len(keep), total, len(audio), stamp))
