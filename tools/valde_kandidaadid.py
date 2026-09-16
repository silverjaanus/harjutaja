"""Viimased vigased Kirjutaja klipid: mitu kandidaati igale sõnale, Silver valib kõrva järgi.

Miks: putuka, puttuka, jutukas ja vikkurit tulid kahel korral tavalise partiina valesti
(hääl venitas täishäälikut). Siin proovitakse kolme eri viisi:
  A = kogu kolmik ühes päringus (lühike, pikk, ülipikk kõrvuti – hääl kuuleb vahet),
  B = üks sõna üksi,
  C = üks sõna üksi koos hääldusjuhisega (täishäälikud lühikesed, pikk on sulghäälik).
Väljund: kirjutaja/kandidaadid/<hääl>/<id>_<A|B|C>.mp3 (sama sulu ühtlustusega kui mängus)
ja tools/valde_kandidaadid.json (mõõdetud täishääliku suhe lühikese vormi suhtes).
Kuulamisleht: tools/valde_kandidaadid.html. Kasutus: python tools/valde_kandidaadid.py
"""
import json, os, shutil, sys, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "tts_test"))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import tts_test as T
import normalize_closure as NC
import audio_valde_skann as S

SIHID = {  # hääl -> [(kolmik (lühike, pikk, ülipikk), sihtvormid)]
    "Kore": [(("puduka", "putuka", "puttuka"), ["pikk", "ylipikk"]),
             (("judukas", "jutukas", "juttukas"), ["pikk"]),
             (("vigurit", "vikurit", "vikkurit"), ["ylipikk"])],
    "Charon": [(("puduka", "putuka", "puttuka"), ["pikk", "ylipikk"])],
}
KAUST = {"Kore": "audio", "Charon": "audio2"}
VORM = ["lyhike", "pikk", "ylipikk"]
JUHIS = ("Loe see eesti keele sõna ette selgelt ja loomulikult, tavalises tempos. "
         "Kõik täishäälikud selles sõnas on LÜHIKESED – ära venita ühtegi täishäälikut. "
         "Pikk on ainult sulghäälik (k, p või t): selle ees on väike paus, nagu sõnades „kapi“ ja „kappi“. "
         "Ära loe midagi muud.\n\n")


def salvesta(pcm, vorm, tee, ffmpeg):
    toores = tee + ".raw.mp3"
    T.write_mp3(pcm, toores, ffmpeg)
    if vorm == "lyhike":
        os.replace(toores, tee)
    else:
        heli, _ = NC.normalize(NC.read(toores), vorm)
        NC.write(heli, tee)
        os.remove(toores)


def main():
    ffmpeg = shutil.which("ffmpeg") or sys.exit("ffmpeg puudub")
    key = T.get_key()
    tulemus = []
    for haal, pered in SIHID.items():
        kaust = os.path.join(ROOT, "kirjutaja", "kandidaadid", haal)
        os.makedirs(kaust, exist_ok=True)
        for trio, vormid in pered:
            lyh = S.measure(os.path.join(ROOT, "kirjutaja", KAUST[haal], T.slug(trio[0]) + ".mp3"))
            print(haal, trio, flush=True)
            # A: kogu kolmik ühes päringus
            pcm = T.request_pcm(T.STYLE_LIST + "\n".join(w + "." for w in trio), haal, key)
            osad = T.split_words(pcm, 3)
            for v in vormid:
                i = VORM.index(v); w = trio[i]; sid = T.slug(w)
                failid = {}
                if osad:
                    a, b = osad[i]
                    salvesta(T.cut(pcm, a, b), v, os.path.join(kaust, sid + "_A.mp3"), ffmpeg)
                    failid["A"] = sid + "_A.mp3"
                else:
                    print("  A: lõikus ei klappinud", flush=True)
                time.sleep(5)
                for k, stiil in (("B", T.STYLE_ONE), ("C", JUHIS)):
                    p1 = T.request_pcm(stiil + w + ".", haal, key)
                    salvesta(T.trim(p1), v, os.path.join(kaust, sid + "_" + k + ".mp3"), ffmpeg)
                    failid[k] = sid + "_" + k + ".mp3"
                    time.sleep(5)
                suhted = {}
                for k, f in failid.items():
                    m = S.measure(os.path.join(kaust, f))
                    suhted[k] = round(m[0] / lyh[0], 2) if (m and lyh and lyh[0] > 0) else None
                print("  %s %s: %s" % (haal, w, suhted), flush=True)
                tulemus.append({"haal": haal, "kaust": KAUST[haal], "sona": w, "id": sid, "vorm": v,
                                "trio": {VORM[j]: T.slug(trio[j]) for j in range(3)},
                                "kandidaadid": failid, "suhe": suhted})
    json.dump({"sihid": tulemus}, open(os.path.join(ROOT, "tools", "valde_kandidaadid.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("VALMIS", flush=True)


if __name__ == "__main__":
    main()
