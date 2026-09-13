# -*- coding: utf-8 -*-
"""Otsib koodifailidest kirillitsat ja muid segadust tekitavaid tähemärke.

Taust: 2026-09 sattus kell/app.js-i kirillitsa 'a' funktsiooni nimes. `node --check`
ei kurda, sest see on korrektne identifikaatori täht, aga väljakutse ebaõnnestub
alles jooksutamisel. Seetõttu käib see skann iga suurema muudatuse järel.

Kasutus:  python tools/scan_homoglyphs.py [kaust või fail ...]
"""
import io
import os
import sys
import unicodedata

LUBATUD = set("äöüõšžÄÖÜÕŠŽ")          # eesti tähed
LUBATUD |= set("…„“”‚’‘—–·•→←↑↓×÷−°€±≈≤≥")  # kirjavahemärgid ja sümbolid stringides
LUBATUD |= set("✕‹›⟳✓★☆  ")      # nuppude ikoonid ja kitsas tühik
LAIENDID = (".js", ".html", ".css", ".json", ".webmanifest")
VAHELE = ("node_modules", ".git", "__pycache__", "tools\\audio", "tools/audio")


def failid(juured):
    for juur in juured:
        if os.path.isfile(juur):
            yield juur
            continue
        for kaust, alamkaustad, nimed in os.walk(juur):
            if any(v in kaust for v in VAHELE):
                continue
            for n in nimed:
                if n.endswith(LAIENDID):
                    yield os.path.join(kaust, n)


def kontrolli(tee):
    leiud = []
    with io.open(tee, encoding="utf-8") as f:
        for nr, rida in enumerate(f, 1):
            for veerg, ch in enumerate(rida, 1):
                if ord(ch) < 128 or ch in LUBATUD:
                    continue
                try:
                    nimi = unicodedata.name(ch)
                except ValueError:
                    nimi = "?"
                leiud.append((nr, veerg, ch, nimi, rida.rstrip()[:100]))
    return leiud


def main():
    juured = sys.argv[1:] or ["."]
    kokku = 0
    for tee in failid(juured):
        for nr, veerg, ch, nimi, rida in kontrolli(tee):
            kokku += 1
            print("%s:%d:%d  %r U+%04X  %s" % (tee, nr, veerg, ch, ord(ch), nimi))
            print("    " + rida)
    if kokku:
        print("\nKAHTLASI MARKE: %d" % kokku)
    else:
        print("PUHAS")
    return 1 if kokku else 0


if __name__ == "__main__":
    sys.exit(main())
