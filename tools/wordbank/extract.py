"""Samm 1c: Ekilexi vormidest lüngaga harjutussõnad.

Sisend: data/ekilex_forms.json (fetch_forms.py väljund).
Väljund: data/items.json — iga harjutussõna: vorm, lemma, käändevorm, lünk, variandid, õige vastus, tähendus.

Reegel (Fable'i kontrollitud): lünk on ainult esimese ja teise silbi piiril, kui enne on
üks lühike täishäälik ja pärast täishäälik: ka_i -> b / p / pp. Pika täishääliku või
diftongi järel, kaashäälikuühendis, sõna alguses ja lõpus lünka ei tehta.
Välde kontrollitakse Ekilexi hääldusmärgist: ` (tagurpidi ülakoma) = III välde.
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
V = "aeiouõäöü"
PAT = re.compile(r"^([bcdfghjklmnprsšzžtv]*[" + V + r"])(kk|pp|tt|k|p|t|g|b|d)([" + V + r"].*)$")
SERIES = {"k": ["g", "k", "kk"], "p": ["b", "p", "pp"], "t": ["d", "t", "tt"]}
SERIES_OF = {"g": "k", "k": "k", "kk": "k", "b": "p", "p": "p", "pp": "p", "d": "t", "t": "t", "tt": "t"}
WANTED = {"SgN", "SgG", "SgP", "SgAdt", "PlN", "PlP"}
PRIMARY = {"SgN", "SgG", "SgP", "SgAdt"}  # mitmust ainult siis, kui ainsusest tuleb alla kahe vormi
MORPH_ET = {"SgN": "ainsuse nimetav", "SgG": "ainsuse omastav", "SgP": "ainsuse osastav",
            "SgAdt": "lühike sisseütlev", "PlN": "mitmuse nimetav", "PlP": "mitmuse osastav"}


def slug(w):
    return w.replace("õ", "6").replace("ä", "2").replace("ö", "7").replace("ü", "y")


def main():
    data = json.load(open(os.path.join(HERE, "data", "ekilex_forms.json"), encoding="utf-8"))
    items, problems, seen = [], [], set()
    for lemma, homs in data.items():
        if not homs:
            problems.append((lemma, "Ekilexist ei leitud")); continue
        h = sorted(homs, key=lambda x: x.get("homonymNr") or 99)[0]
        mine = []
        for par in h["paradigms"][:1]:
            for f in par["forms"]:
                if f["morphCode"] not in WANTED or f.get("questionable") or (f.get("displayLevel") or 9) > 2:
                    continue
                val = f["value"]
                m = PAT.match(val)
                if not m or val in seen or val.endswith("sid"):
                    continue
                pre, gap, post = m.groups()
                q3_mark = "`" in (f.get("displayForm") or "")
                expected_q3 = gap in ("kk", "pp", "tt")
                if q3_mark != expected_q3:
                    problems.append((val, "välde ei klapi: " + (f.get("displayForm") or "")))
                    continue
                seen.add(val)
                opts = SERIES[SERIES_OF[gap]]
                mine.append({"id": slug(val), "word": val, "lemma": lemma, "morph": f["morphCode"],
                              "morph_et": MORPH_ET[f["morphCode"]], "pre": pre, "post": post,
                              "options": opts, "answer": gap,
                              "length": {"g": "lühike", "b": "lühike", "d": "lühike"}.get(gap, "ülipikk" if expected_q3 else "pikk"),
                              "meaning": h.get("meaning"), "displayForm": f.get("displayForm")})
        prim = [x for x in mine if x["morph"] in PRIMARY]
        items.extend(prim if len(prim) >= 2 else mine[:3])
    variants = sorted({it["pre"] + o + it["post"] for it in items for o in it["options"]})
    json.dump({"items": items, "variants": variants}, open(os.path.join(HERE, "data", "items.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    by_len = {}
    for it in items:
        by_len[it["length"]] = by_len.get(it["length"], 0) + 1
    print("harjutussõnu", len(items), by_len, "| heliklippe vaja", len(variants))
    print("probleemid", len(problems), problems[:30])


if __name__ == "__main__":
    main()
