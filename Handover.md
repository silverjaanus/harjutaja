# Handover — Harjutaja

Uuendatud: 11. september 2026

## Current Goal

Harjutaja on eestikeelne õppemängude äpp lastele. Esimene kasutaja on Mia, kes käib 3. klassis. Äpis on moodulid: Korrutaja (live), Kirjutaja (ehitamisel), Kell ja Keel (plaanis). Praegune eesmärk on Kirjutaja v1 — õigekirjamäng, kus laps kuulab lauset ja valib lünka õige tähe (g / k / kk, b / p / pp, d / t / tt).

Täisplaan on Claude'i projektis failis `claude/kirjutaja-plaan.md`, taust ja reeglid failis `claude/kirjutaja-ideed.md`, kogu terviku ülevaade failis `claude/harjutaja-ulevaade.md`.

## Completed Steps

- Kontseptsioon, õppekava ja õigekirjareeglite kontroll (Fable) — `kirjutaja-ideed.md`.
- Otsused: hääl Gemini TTS; vale vastuse järel loetakse ette kõik variandid; terviku nimi Harjutaja; logo blueprint-kalligraafia kollase aktsendiga (visandid: kalligraafiline K, TeX Gyre Chorus font, konstruktsiooniringid arvutatud tähe kõveratest).
- Arhitektuur: valik A — uus repo `harjutaja`, Korrutaja jääb praegu oma repos puutumata ja kolib hiljem.
- Häälte test kolmes voorus (`tools/tts_test/`: tts_test.py, normalize_closure.py, make_round2.py, page/). Testileht: artifakt „Kirjutaja häälte test“, tulemused selle andmebaasis `results`.
- Projekti ülevaade kogu skoobiga: Claude'i projektis `claude/harjutaja-ulevaade.md`.

## In Progress

**Samm 0 (hääl) tehtud:** Gemini Kore + `normalize_closure.py`, kuulamistest 32/32.

**Samm 1 (sõnapank) peaaegu tehtud:** `tools/wordbank/`: `candidates.py` (sagedusloend → 2383 kandidaati) → käsitsi valitud 166 lapsele tuttavat lemmat `data/lemmas.txt` → `fetch_forms.py` (Ekilex: vormid, välte märgid, tähendus; `data/ekilex_forms.json`) → `extract.py` (lünk 1./2. silbi piiril, välde kontrollitud Ekilexi `\``-märgiga, 0 vastuolu) → Fable kirjutas igale vormile lause ja märgistas harvad/segadusse ajavad (`data/review_out*.json`), Fable kontrollis 936 varianti roppsõnade suhtes (`data/variants_flagged.json`) → `finalize.py` → `data/items_reviewed.json` (381 vormi, 23 auto-väljas; lemmad kakk, kepp, lipp, sitikas, sukk välja roppsõnade kõla tõttu; pakane jäi, „pagane“ on leebe) ja `data/variants.json` (900 heliklippi).

**Silveri ülevaatus käib:** artifakt „Kirjutaja sõnavara“ (https://claude.ai/code/artifact/c1f3ae72-0275-4e05-8729-8e5bc3108b4a), otsused andmebaasi kogus `decisions` (doc id = vormi id: drop, sentence, edited). Loe `read_db`-ga ja rakenda enne heli genereerimist.

**Samm 3 (heli) blokeeritud päevalimiidiga:** `gemini-3.1-flash-tts` tasulisel Tier 1 tasemel on **100 päringut päevas** (projekti ja mudeli kohta), minutis ~10. 11. sept kulus kõik ära (tehtud 21 klippi kaustas `kirjutaja/audio`). Lahendus: partiid ~12 sõna päringus + n−1 pikima vaikuse lõikus + automaatne kontroll (partii heli transkribeeritakse eraldi tekstimudeliga, võrreldakse sõnade kaashäälikuskeletti) → 900 klippi ~80 päringuga, mahub ühe päeva limiiti.

**Järgmine täpne tegevus:** (1) loe Silveri otsused, uuenda `variants.json`; (2) kirjuta `tools/audio/gen_audio.py` partiireziimi ümber koos kontrolliga; (3) käivita pärast limiidi lähtestumist. Paralleelselt: GitHubi repo `harjutaja` (Windowsis on `gh` olemas) ja Verceli projekt; siis Squarespace DNS CNAME `harjutaja` → Verceli antud väärtus (korrutaja on `e25cb360d0a03c56.vercel-dns-017.com`, projektipõhine). Squarespace küsib kirje lisamisel e-posti koodi — Silver sisestab ise.

## Key Context

- Kohalik kaust: `C:\Users\Silver\Documents\GitHub\harjutaja` (ühendatud Cowork'i sessiooniga). GitHubi repot ega Vercelit veel pole.
- Gemini: mudel `gemini-3.1-flash-tts-preview`, REST `generateContent`, päis `x-goog-api-key`, vastus toores PCM 24 kHz 16-bit mono. Võti Windowsi kasutaja keskkonnamuutujas `GEMINI_API_KEY` (skript loeb registrist, kui protsessil seda pole). Tasuta tase: 30 s paus päringute vahel, päevalimiit olemas.
- Sõnad küsitakse kümnekaupa ühe päringuga ja lõigatakse **n−1 pikima vaikuse** kohalt (`split_words`). Esimene versioon lõikas lühikeste vaikuste järgi ja tükeldas sõnu sulghääliku sulu kohalt — need klipid on kaustas `out\_to_delete` (kustutamiseks). Kontroll: sõnavahed peavad olema selgelt pikemad kui vaikused sõna sees ja iga tükk 0,3–1,6 s, muidu küsitakse ükshaaval.
- Stiiliviip „nagu õpetaja loeb etteütlust“ pani Gemini sõnu silpideks jaotama; nüüd „tavalises tempos ja ilma sõna silpideks jaotamata“. Üksiku sõna viip (`STYLE_ONE`) on endiselt etteütluse sõnastusega.
- Pilvekonteinerist ei pääse ligi Ekilexile, PyPI-le ega TartuNLP-le (proxy 403) — need sammud käivad Windowsis Desktop Commanderiga.
- Korrutaja: repo `C:\Users\Silver\Documents\GitHub\korrutaja`, live korrutaja.silverjaanus.com, Vercel. Git push käib Desktop Commanderiga.
- Kolme nupu reegel kehtib ainult lühikese täishääliku järel, täishäälikute vahel, 1. ja 2. silbi piiril. Pika täishääliku järel, s/h kõrval, sõna alguses ja lõpus lünka ei tehta.
- Järgmised sammud plaanist: sõnapank Ekilexi API kaudu (vaja Silveri tasuta API-võtit, keskkonnamuutuja `EKILEX_API_KEY`), laused, heli, äpp, avaldamine harjutaja.silverjaanus.com.
