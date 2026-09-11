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

**Kirjutaja v1 on live (11. sept õhtul):** https://harjutaja.silverjaanus.com/kirjutaja/ — commit `4f7b38f`. Mängus praegu 32 sõna 373-st (need, mille kõigil variantidel on juba heli: häälte testi Kore klipid + 11. sept tehtud 21 klippi). Ülejäänud lisanduvad automaatselt, kui heli on olemas ja `tools/build_kirjutaja.py` uuesti jookseb.

**Järgmine täpne tegevus (ajastatud 12. sept 07:30 Tallinna aja järgi):** Windowsis `python tools\audio_gen.py --max-requests 95` (taustal, logi `tools\audio_gen.log`) → `python tools\build_kirjutaja.py` → git commit + push → kontrolli `kirjutaja/data.js` sõnade arvu. Gemini TTS päevalimiit 100 päringut, lähtestub ~03:00 Tallinna aja järgi.

**`tools/audio_gen.py`:** 12 sõna ühe TTS-päringuga, lõikus n−1 pikima vaikuse järgi, kontroll tekstimudeliga (`gemini-2.5-flash`, eraldi limiit): iga sõna kaashäälikuskelett (topelttähed kokku, g→k, b→p, d→t) peab klappima. Kuni 2 üksikut viga → ülejäänud salvestatakse, kahtlased lähevad hilisemasse partiisse (max 2 korda). Rohkem vigu → partii uuesti, siis poolikutena. Testis leidis kontroll „appi“ asemel „pappi“ — töötab. Pikkust (kapi/kappi) kontroll ei hinda, selle eest hoolitseb sulu ühtlustus.

**Äpi ülesehitus:** `index.html` (Harjutaja avaleht: Kirjutaja + link Korrutajasse), `core/` (store.js — localStorage; sfx.js — WebAudio helid; engine.js — kohanduv kordamine: vale tuleb 3–6 küsimuse pärast tagasi, kuni 2 korda ringis, ring max 2× pikkus), `kirjutaja/` (index.html, kirjutaja.css — valge vihik abijoontega, app.js, data.js — genereeritud, audio/*.mp3), `sw.js` (rakendus võrgust-enne, heli vahemälust; versioon build'is), `manifest.webmanifest`, `icons/` (kollane blueprint-K). Andmed brauseris võtme `kirjutaja_v1` all: stats[id] = {n, ok, streak, lastOk, t}, sfx, rounds.

**Mängu käik:** ring 15 küsimust (valitud hulgas vähemalt 6); lause ekraanil lüngaga, kõlab ühtlustatud üksiksõna; õige → „Õige!“ jms ja edasi 1,1 s pärast; vale → õige vastus, reeglivihje (lühike ja nõrk / pikk, üks täht / ülipikk, kaks tähte) ja kõik kolm varianti loetakse ette nuppude süttimisega; „Edasi“. Häälikukaart 3×3 (k/p/t-rida × lühike/pikk/ülipikk), ruudu puudutus = harjuta ainult neid. Tulemus: pealkiri protsendi järgi, õigete arv, „sõna sai selgeks“, „Järgmisel korral harjutame“. Tekstid kontrollis Fable.

**Maskott (11. sept õhtul):** joonestusrobot `kirjutaja/robot.js` — `KRobot(mood, {head})`, ilmed happy, wave, cheer, kind, teach; antenn on kuldne sulepea, kõhul vihikuleht, sinine keha (#1f5c99), kollased käed. Kodulehel lehvitab (puudutus → hüpe + piiks), vale vastuse vihjekastis pea „kind“, tulemuste ekraanil suurelt jutumulliga (≥90% cheer, ≥70% happy/cheer, alla selle kind). Küsimuse ajal teda pole. Nime pole — Mia võib panna.

**Veel tegemata (v1.1):** Silveri sõnavara ülevaatuse otsuste sisselugemine (`decisions.json` artifakti andmebaasist → build), täishäälikud ja l/ll, s/ss, Korrutaja kolimine Harjutajasse.

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
