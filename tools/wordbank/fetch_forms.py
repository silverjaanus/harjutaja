"""Samm 1b: Ekilexist sõnavormid, välte märgid ja lühitähendus iga lemma kohta.

Sisend: data/lemmas.txt (tühikute või reavahetustega eraldatud lemmad).
Väljund: data/ekilex_forms.json — {lemma: [{wordId, homonymNr, meaning, paradigms: [{wordClass, forms: [...]}]}]}
Vajab EKILEX_API_KEY (Windowsi kasutaja keskkonnamuutuja; loetakse ka registrist).
Olemasolevad lemmad jäetakse vahele, nii et katkestuse järel võib uuesti käivitada.
"""
import json, os, sys, time, urllib.parse
import requests

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "data", "ekilex_forms.json")
BASE = "https://ekilex.ee/api"


def get_key():
    k = os.environ.get("EKILEX_API_KEY")
    if k:
        return k
    import winreg
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h:
        return winreg.QueryValueEx(h, "EKILEX_API_KEY")[0]


S = requests.Session()


def api(path):
    for attempt in range(3):
        r = S.get(BASE + path, timeout=30)
        if r.status_code == 200:
            time.sleep(0.25)
            return r.json()
        print("  HTTP %d %s" % (r.status_code, path), flush=True)
        time.sleep(3)
    return None


def first_meaning(details):
    try:
        for lex in details.get("lexemes", []):
            for d in (lex.get("meaning") or {}).get("definitions", []) or []:
                if d.get("lang") == "est" and d.get("value"):
                    return d["value"]
    except Exception:
        pass
    return None


def main():
    S.headers["ekilex-api-key"] = get_key()
    lemmas = open(os.path.join(HERE, "data", "lemmas.txt"), encoding="utf-8").read().split()
    data = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
    for i, lemma in enumerate(lemmas):
        if lemma in data:
            continue
        res = api("/word/search/%s/eki" % urllib.parse.quote(lemma)) or {}
        words = [w for w in res.get("words", []) if w.get("wordValue") == lemma and w.get("lang") == "est"]
        entry = []
        for w in words:
            pars = api("/paradigm/details/%d" % w["wordId"]) or []
            det = api("/word/details/%d" % w["wordId"]) or {}
            entry.append({"wordId": w["wordId"], "homonymNr": w.get("homonymNr"), "meaning": first_meaning(det),
                          "paradigms": [{"wordClass": p.get("wordClass"), "inflectionType": p.get("inflectionType"),
                                         "forms": [{k: f.get(k) for k in ("value", "morphCode", "displayForm",
                                                                          "displayLevel", "questionable")}
                                                   for f in p.get("paradigmForms", [])]} for p in pars]})
        data[lemma] = entry
        print("%d/%d %s: %d homonüümi" % (i + 1, len(lemmas), lemma, len(entry)), flush=True)
        if (i + 1) % 10 == 0:
            json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("VALMIS", len(data), flush=True)


if __name__ == "__main__":
    main()
