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

**Häälte test on läbi (samm 0 tehtud).** Kolmas voor, Silver 11. sept: Kore ühtlustatud pausiga, 32/32 õigesti (pikk/ülipikk 23/23, lühike 9/9). Otsus: **hääl on Gemini Kore + `normalize_closure.py`** (pikk 160 ms, ülipikk 380 ms). Iga sõna eraldi päringuga, kõik variandid ka mittesõnadena.

Järeldus mängu jaoks: Gemini ülipikk on ise liiga lühike, seega kuuldav vihje peab olema ühtlustatud **üksiksõna**. Lause jääb ekraanile tekstina (tähendus ja grammatika), lauset ette ei loeta — lause sees ei saa pausi usaldusväärselt ühtlustada.

**Järgmine täpne tegevus:** plaani samm 1 — sõnapank. Vaja Silveri Ekilexi API-võtit Windowsi kasutaja keskkonnamuutujas `EKILEX_API_KEY`. Siis skript Windowsis: põhisõnavara (`psv`) sõnad + paradigmad Ekilexist → kandidaatide filter (lünk 1. ja 2. silbi piiril, lühikese täishääliku järel, sulghäälik) → Fable kontrollib reegleid ja roppsõnu → Silver vaatab nimekirja üle.

## Key Context

- Kohalik kaust: `C:\Users\Silver\Documents\GitHub\harjutaja` (ühendatud Cowork'i sessiooniga). GitHubi repot ega Vercelit veel pole.
- Gemini: mudel `gemini-3.1-flash-tts-preview`, REST `generateContent`, päis `x-goog-api-key`, vastus toores PCM 24 kHz 16-bit mono. Võti Windowsi kasutaja keskkonnamuutujas `GEMINI_API_KEY` (skript loeb registrist, kui protsessil seda pole). Tasuta tase: 30 s paus päringute vahel, päevalimiit olemas.
- Sõnad küsitakse kümnekaupa ühe päringuga ja lõigatakse **n−1 pikima vaikuse** kohalt (`split_words`). Esimene versioon lõikas lühikeste vaikuste järgi ja tükeldas sõnu sulghääliku sulu kohalt — need klipid on kaustas `out\_to_delete` (kustutamiseks). Kontroll: sõnavahed peavad olema selgelt pikemad kui vaikused sõna sees ja iga tükk 0,3–1,6 s, muidu küsitakse ükshaaval.
- Stiiliviip „nagu õpetaja loeb etteütlust“ pani Gemini sõnu silpideks jaotama; nüüd „tavalises tempos ja ilma sõna silpideks jaotamata“. Üksiku sõna viip (`STYLE_ONE`) on endiselt etteütluse sõnastusega.
- Pilvekonteinerist ei pääse ligi Ekilexile, PyPI-le ega TartuNLP-le (proxy 403) — need sammud käivad Windowsis Desktop Commanderiga.
- Korrutaja: repo `C:\Users\Silver\Documents\GitHub\korrutaja`, live korrutaja.silverjaanus.com, Vercel. Git push käib Desktop Commanderiga.
- Kolme nupu reegel kehtib ainult lühikese täishääliku järel, täishäälikute vahel, 1. ja 2. silbi piiril. Pika täishääliku järel, s/h kõrval, sõna alguses ja lõpus lünka ei tehta.
- Järgmised sammud plaanist: sõnapank Ekilexi API kaudu (vaja Silveri tasuta API-võtit, keskkonnamuutuja `EKILEX_API_KEY`), laused, heli, äpp, avaldamine harjutaja.silverjaanus.com.
