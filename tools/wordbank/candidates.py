"""Samm 1a: sagedusloendist kandidaatsõnad, mille esimese silbi lühikese täishääliku järel on sulghäälik.

Sisend: data/lemmafreq-min5.csv (Arvi Tavasti lemmade sagedusloend, eesti keele ühendkorpus 2017).
Väljund: data/candidates.tsv — lemma, sõnaliik, sagedus.
Muster: (kaashäälikud) + üks täishäälik + k|p|t|g|b|d|kk|pp|tt + täishäälik või sõna lõpp.
Nii tulevad sisse kapp, kabi, tigu, lõpp, sõda, abi; välja jäävad kauba, paat (pikk täishäälik või diftong).
"""
import csv, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
V = "aeiouõäöü"
PAT = re.compile(r"^[bcdfghjklmnprsšzžtv]*[" + V + r"](kk|pp|tt|k|p|t|g|b|d)([" + V + r"]|$)")
POS = {"s": "nimisõna", "a": "omadussõna"}
rows = []
with open(os.path.join(HERE, "data", "lemmafreq-min5.csv"), encoding="utf-8") as f:
    for line in f:
        try:
            key, freq = line.rstrip("\n").split("\t")
            lemma, pos = key.rsplit("-", 1)
        except ValueError:
            continue
        if pos not in POS or not (3 <= len(lemma) <= 8) or not lemma.isalpha() or lemma != lemma.lower():
            continue
        if PAT.match(lemma) and int(freq) >= 300:
            rows.append((lemma, pos, int(freq)))
rows.sort(key=lambda r: -r[2])
with open(os.path.join(HERE, "data", "candidates.tsv"), "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter="\t"); w.writerow(["lemma", "pos", "freq"]); w.writerows(rows)
print(len(rows), "kandidaati; esimesed:", ", ".join(r[0] for r in rows[:40]))
