# Handover — Harjutaja

Uuendatud: 12. september 2026

## Current Goal

Harjutaja on eestikeelne õppemängude äpp lastele. Esimene kasutaja on Mia, kes käib 3. klassis. Äpis on moodulid: Korrutaja (live), Kirjutaja (ehitamisel), Kell ja Keel (plaanis). Praegune eesmärk on Kirjutaja v1 — õigekirjamäng, kus laps kuulab lauset ja valib lünka õige tähe (g / k / kk, b / p / pp, d / t / tt).

Täisplaan on Claude'i projektis failis `claude/kirjutaja-plaan.md`, taust ja reeglid failis `claude/kirjutaja-ideed.md`, kogu terviku ülevaade failis `claude/harjutaja-ulevaade.md`.

## Completed Steps

- Kontseptsioon, õppekava ja õigekirjareeglite kontroll (Fable) — `kirjutaja-ideed.md`.
- Otsused: hääl Gemini TTS; vale vastuse järel loetakse ette kõik variandid; terviku nimi Harjutaja; logo blueprint-kalligraafia kollase aktsendiga (visandid: kalligraafiline K, TeX Gyre Chorus font, konstruktsiooniringid arvutatud tähe kõveratest).
- Arhitektuur: valik A — uus repo `harjutaja`, Korrutaja jääb praegu oma repos puutumata ja kolib hiljem.
- Häälte test kolmes voorus (`tools/tts_test/`: tts_test.py, normalize_closure.py, make_round2.py, page/). Testileht: artifakt „Kirjutaja häälte test“, tulemused selle andmebaasis `results`.
- Projekti ülevaade kogu skoobiga: Claude'i projektis `claude/harjutaja-ulevaade.md`.
- **Maskoti valik (12. sept):** kuus varianti kõrvuti võrdluslehel (artifakt „Kirjutaja robotivalik“) — Silver valis **plekkroboti**: kandiline neetidega pea, valge ekraannägu tumedate silmadega, vedrukael, numbrilaud ja tuled kõhul, haaratsitega käed. `kirjutaja/robot.js` on selle peale ümber kirjutatud; API (`KRobot(mood, {head})`) ja animatsiooniklassid (`kr-body`, `kr-eyes`, `kr-arm kr-l/kr-r`, `kr-spark`) on samad, seega `app.js` ja `kirjutaja.css` ei muutunud.

- **Avaleht (12. sept, commit `25fe8fe`):** `index.html` on nüüd päris avaleht — robot tervitab (lehvitab, klikile hüppab), Kirjutaja ja Korrutaja kaardid, „Tulekul“ nimekiri (Kell, Teisendaja, Keel) ja jalus. Manifesti `start_url` on `./` (varem `./kirjutaja/`). Eesti keel üle vaadatud Fable'iga.
- **Avalehe teine ring (12. sept, commitid `24b8f2a`, `8328f54`):** taust on punktiruudustik (jooneline vihikupaber on Kirjutaja materjal, kogumi leht ei kanna ühe mooduli riideid); kangelasribas tegelast ei ole, **maskotid on moodulikaartidel** — roboti pea Kirjutaja kaardil, panda pea Korrutaja kaardil, kummalgi oma värviga plaat. Otsustatud reegel: **ikoon on igal moodulil kohustuslik, maskott vabatahtlik** ja tuleb siis, kui moodul valmib; kaart näitab maskotti, kui see olemas, muidu ikooni. Logo jääb ikoonipesadesse (favicon, PWA, mooduli päis, jagamispilt), kaardil on nägu. Iga maskott peab olema teistest värvi või siluetiga eristatav. Harjutajale endale tegelast ei tehta.
- **Lahtised otsad:** (1) `core/panda.js` on **ajutine koopia** — originaal elab `korrutaja.src.html`-is funktsioonis `panda()`; Korrutaja kolimisel jääb alles ainult `core/panda.js`. (2) Harjutajal endal ei ole ikooni ega sõnamärki — favicon ja PWA ikoon on praegu Kirjutaja K-plaat.

## In Progress

**Kirjutaja v1 on täies mahus live (12. sept):** https://harjutaja.silverjaanus.com/kirjutaja/ — commit `4611fa9`, mängus **371 sõna 373-st**, heliklippe 919/921.

**Heli tehtud:** `tools/audio_gen.py` partiidena 12 sõna päringus, iga partii kontrollitud transkriptsiooniga (`gemini-2.5-flash`, kaashäälikuskelett, täpitähed normaliseeritud). 852 klippi ~80 TTS-päringuga umbes 45 minutiga. Kontroll töötas: üksikud valesti kuuldud sõnad (nägus → „Nogus“, pidur → „tittur“) läksid järgmisesse partiisse. Puudu jäid ainult mittesõnad `hope` ja `rotu` — Gemini loeb neid järjekindlalt „hõppe“ ja „ruttu“ —, seega on kaks vormi mängust väljas.

**Kvoodi õppetund:** `gemini-3.1-flash-tts` päevalimiit (Tier 1: 100 päringut) lähtestub **Vaikse ookeani südaööl ehk 10:00 Eesti aja järgi**, mitte keskööl. Minutis ~10 päringut.

**Järgmised sammud (v1.1):** Silveri sõnavara ülevaatuse otsuste sisselugemine (artifakti „Kirjutaja sõnavara“ andmebaas → `tools/wordbank/data/decisions.json` → build), täishäälikud (a/aa) ning l/ll, s/ss, „s-i ja h-i kõrval k, p, t“, Korrutaja kolimine Harjutajasse. **Maskotid jäävad nimeta** (Silveri otsus 12. sept — ka pandal ei ole nime).

## Key Context

- Kohalik kaust: `C:\Users\Silver\Documents\GitHub\harjutaja` (ühendatud Cowork'i sessiooniga). Repo github.com/silverjaanus/harjutaja, Vercel projekt harjutaja, domeen harjutaja.silverjaanus.com.
- DNS (Squarespace): Silver lubas Claude'il kirjeid ise muuta; e-posti koodi sisestab Silver. Claude-in-Chrome alamagendil blokeeris kohalik klassifikaator DNS-muudatused, põhilõimest otse tehes läks läbi.
- Silveri sõnavara otsused (`finalize.py`): pittu, uttu, lukku sisse; lipp, sukk, sitikas, kakk, kepp sisse (ka libu jääb variandiks). Välja 8 harva vormi. 373 vormi, 921 heliklippi.
- Gemini: mudel `gemini-3.1-flash-tts-preview`, REST `generateContent`, päis `x-goog-api-key`, vastus toores PCM 24 kHz 16-bit mono. Võti Windowsi kasutaja keskkonnamuutujas `GEMINI_API_KEY` (skript loeb registrist, kui protsessil seda pole). Tasuta tase: 30 s paus päringute vahel, päevalimiit olemas.
- Sõnad küsitakse kümnekaupa ühe päringuga ja lõigatakse **n−1 pikima vaikuse** kohalt (`split_words`). Esimene versioon lõikas lühikeste vaikuste järgi ja tükeldas sõnu sulghääliku sulu kohalt — need klipid on kaustas `out\_to_delete` (kustutamiseks). Kontroll: sõnavahed peavad olema selgelt pikemad kui vaikused sõna sees ja iga tükk 0,3–1,6 s, muidu küsitakse ükshaaval.
- Stiiliviip „nagu õpetaja loeb etteütlust“ pani Gemini sõnu silpideks jaotama; nüüd „tavalises tempos ja ilma sõna silpideks jaotamata“. Üksiku sõna viip (`STYLE_ONE`) on endiselt etteütluse sõnastusega.
- Pilvekonteinerist ei pääse ligi Ekilexile, PyPI-le ega TartuNLP-le (proxy 403) — need sammud käivad Windowsis Desktop Commanderiga.
- Korrutaja: repo `C:\Users\Silver\Documents\GitHub\korrutaja`, live korrutaja.silverjaanus.com, Vercel. Git push käib Desktop Commanderiga.
- Kolme nupu reegel kehtib ainult lühikese täishääliku järel, täishäälikute vahel, 1. ja 2. silbi piiril. Pika täishääliku järel, s/h kõrval, sõna alguses ja lõpus lünka ei tehta.
- Järgmised sammud plaanist: sõnapank Ekilexi API kaudu (vaja Silveri tasuta API-võtit, keskkonnamuutuja `EKILEX_API_KEY`), laused, heli, äpp, avaldamine harjutaja.silverjaanus.com.
