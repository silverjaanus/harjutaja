"""Samm 1d: Fable'i ülevaatuse järel automaatne väljajätt ja helivajaduse nimekiri.

Sisend: data/items.json, data/review_out0.json, data/review_out1.json, data/variants_flagged.json
Väljund: data/items_reviewed.json (laused + märked + auto-väljajätt), data/variants.json (heli tegemiseks)
Automaatselt välja: Fable'i „rare“ ja „drop“, „confusing“ (v.a sadama), ning lemmad, mille
mõni variant on roppsõna või kõlab nagu roppsõna (Silveri reegel: roppsõnad välja).
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
D = lambda n: os.path.join(HERE, "data", n)
items = json.load(open(D("items.json"), encoding="utf-8"))["items"]
rev = {r["id"]: r for n in (0, 1) for r in json.load(open(D("review_out%d.json" % n), encoding="utf-8"))}
# Silveri otsused ülevaatuse lehelt (artifakt „Kirjutaja sõnavara“): {id: {drop, sentence}}.
# Need käivad automaatikast üle — nii satuvad tagasi võetud sõnad ka heli nimekirja.
dec = json.load(open(D("decisions.json"), encoding="utf-8")) if os.path.exists(D("decisions.json")) else {}
MILD_OK = {"pagane"}  # „pagan“ on leebe hüüatus, mitte roppsõna — pakane jääb alles
flagged = {f["string"] for f in json.load(open(D("variants_flagged.json"), encoding="utf-8"))["flagged"]} - MILD_OK
KEEP_CONFUSING = {"sadama", "lukku"}
# Silveri otsus 11. sept: need jäävad sisse, kuigi Fable märkis
SILVER_KEEP_FORMS = {"pittu", "uttu", "lukku"}
SILVER_KEEP_LEMMAS = {"lipp", "sukk", "sitikas", "kakk", "kepp"}
bad_lemmas = set()
for it in items:
    if (any(it["pre"] + o + it["post"] in flagged for o in it["options"]) or it["word"] in flagged) \
            and it["lemma"] not in SILVER_KEEP_LEMMAS:
        bad_lemmas.add(it["lemma"])
out = []
for it in items:
    r = rev.get(it["id"], {})
    it["sentence"] = r.get("sentence"); it["flag"] = r.get("flag"); it["note"] = r.get("note")
    reason = None
    if it["lemma"] in bad_lemmas:
        reason = "variant kõlab nagu roppsõna"
    elif it["word"] in SILVER_KEEP_FORMS or (it["lemma"] in SILVER_KEEP_LEMMAS and it["flag"] == "confusing"):
        reason = None
    elif it["flag"] in ("rare", "drop"):
        reason = "harv vorm" if it["flag"] == "rare" else "sobimatu"
    elif it["flag"] == "confusing" and it["word"] not in KEEP_CONFUSING:
        reason = "segadusse ajav"
    d = dec.get(it["id"])
    if d is not None:
        reason = (reason or "Silveri otsus") if d.get("drop") else None
        if d.get("sentence"):
            it["sentence"] = d["sentence"]
    it["auto_drop"] = reason
    out.append(it)
kept = [i for i in out if not i["auto_drop"]]
kind = {}
for it in kept:
    for o in it["options"]:
        w = it["pre"] + o + it["post"]
        kind[w] = "pikk" if o in ("k", "p", "t") else "ylipikk" if o in ("kk", "pp", "tt") else "lyhike"
variants = [{"word": w, "id": w.replace("õ", "6").replace("ä", "2").replace("ö", "7").replace("ü", "y"), "kind": k}
            for w, k in sorted(kind.items())]
json.dump(out, open(D("items_reviewed.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(variants, open(D("variants.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("välja lemmad:", sorted(bad_lemmas))
print("alles", len(kept), "/", len(out), "| heliklippe", len(variants))
print("auto-väljajäetud:", [(i["word"], i["auto_drop"]) for i in out if i["auto_drop"]])
