# Handover — Harjutaja

Uuendatud: 13. september 2026

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
- **Logo valitud (13. sept):** neli kriipsu kahes paaris ja lühike tõusev sild nende vahel — loeb korraga kriipsutamise ja H-tähena. Kollane põhi `#f3c445`, kriipsud ja sild tint `#16284a`, joon 8,6, ümarad otsad, ikooni nurgaraadius 22,5%. Neli ringi variante on Claude'i projektis failis `claude/harjutaja-logo.md`. Failid `icons/harjutaja-*`: `ikoon.svg` (täisruut, ikoonipesadesse), `ikoon-ummar.svg` (ümarnurkne, veebi ja favicon), `mark.svg` (ainult märk, `currentColor`), `sonamark.svg` (märk + sõna Fredoka SemiBoldis), PNG-d 512/192/180/32. Manifest ja `index.html` osutavad nüüd neile; avalehe kangelasribasse tuli märk h1 kohale; lisatud og-sildid.
- **Lahtised otsad:** (1) `core/panda.js` on **ajutine koopia** — originaal elab `korrutaja.src.html`-is funktsioonis `panda()`; Korrutaja kolimisel jääb alles ainult `core/panda.js`. (2) Logo muudatused on **kohapeal olemas, aga veel commitimata** (Silveri otsus 13. sept). (3) `icons/kirjutaja-*` (kalligraafiline K sinikoopial, sõnamark, 192 ja 512 PNG) on nüüd kasutuseta — vana plaani jäänuk, kus igal moodulil pidi olema oma kalligraafiline täht. Võib kustutada.

**Ikoonireegel (kehtib, otsustatud 12. sept):** kogu äpil on **üks logo** — Harjutaja märk kollasel — ja see läheb kõigisse ikoonipesadesse: favicon, PWA, mooduli päis, jagamispilt. Moodulit eristab **maskott**, mitte oma ikoon või oma täht. Moodulikaart avalehel näitab maskotti. Vana plaan „iga moodul saab sama kalligraafilise tähe erineva aktsendiga“ on maha maetud koos kalligraafilise logoga.

## In Progress

**Kirjutaja v1 on täies mahus live (12. sept):** https://harjutaja.silverjaanus.com/kirjutaja/ — commit `4611fa9`, live'is **371 sõna 373-st**, heliklippe 919/921.

**Sõnavara otsused sisse loetud (13. sept, kohapeal, commitimata):** Silveri ülevaatuse kuus otsust artifakti „Kirjutaja sõnavara“ andmebaasist (`decisions` kogum) on failis `tools/wordbank/data/decisions.json`. Kaks jäid välja (häbid, higid — Silver kinnitas Fable'i otsuse), neli võeti tagasi (sappa, tukke, nabad, prügid), nabadil on Silveri parandatud lause. `finalize.py` loeb nüüd `decisions.json`-i ja käib automaatikast üle — nii satuvad tagasi võetud sõnad ka helivajaduse nimekirja (varem tegi seda ainult `build_kirjutaja.py`, mistõttu heli jäi tegemata). Sappa ja tukke said heli tasuta, sest need jagavad variante juba olemasolevate sõnadega saba ja tugi. Nabadile ja prügidele tehti 6 uut klippi ühe TTS-päringuga.

**Kõigi 381 vormi ülevaatus (13. sept, kohapeal, commitimata):** leht „Kirjutaja laused“ (https://claude.ai/code/artifact/5d25ec7d-b01d-4493-8448-be31fd17b0f7, andmebaasi kogum `review`) näitab iga vormi kolmikut, õiget vastust ja muudetavat lauset. Silver tegi kaheksa parandust: lauseid muutsid `lõpu`, `odavat`, `sappa` („Võtke üksteise järel sappa.“), `lube` (tagasi mängu) ning kaks homonüümivahetust — **`sadama` on nüüd tegusõna** („Vihma hakkas sadama.“) ja **`lukku` on lukustus** („Pane uks lukku.“); välja läksid `prügid` ja `sadamat`. Lube vajas 3 uut klippi; samas päringus õnnestus lõpuks ka `rotu`. **Seis: mängus 375 sõna 376-st, heliklippe 929/930.** Ainus puuduv klipp on `hõpe` (sõna `hõbe` distraktor) — Gemini loeb seda järjekindlalt „hõppe“, seega `hõbe` on mängust väljas.

Claude luges kõik 375 lauset läbi; peale ülalmainitute oli ülejäänu korras.

**Heli tehtud:** `tools/audio_gen.py` partiidena 12 sõna päringus, iga partii kontrollitud transkriptsiooniga (`gemini-2.5-flash`, kaashäälikuskelett, täpitähed normaliseeritud). 852 klippi ~80 TTS-päringuga umbes 45 minutiga. Kontroll töötas: üksikud valesti kuuldud sõnad (nägus → „Nogus“, pidur → „tittur“) läksid järgmisesse partiisse. Puudu jäid ainult mittesõnad `hope` ja `rotu` — Gemini loeb neid järjekindlalt „hõppe“ ja „ruttu“ —, seega on kaks vormi mängust väljas.

**Kvoodi õppetund:** `gemini-3.1-flash-tts` päevalimiit (Tier 1: 100 päringut) lähtestub **Vaikse ookeani südaööl ehk 10:00 Eesti aja järgi**, mitte keskööl. Minutis ~10 päringut.

**Järgmised sammud (v1.1):** täishäälikud (a/aa) ning l/ll, s/ss, „s-i ja h-i kõrval k, p, t“, Korrutaja kolimine Harjutajasse. Sõnavara otsused on tehtud (vt eespool). Sõna `tukke` vana lause („Poiss toetus seljaga tukke.“) oli vigane — *toetuma* ei käi lühikese sisseütlevaga. Silver andis asemele **„Poiss segas ahjuroobiga tuliseid tukke.“**, mis kasutab homonüümi: *tukk : tuki : tukke* tähenduses põlev halg, mitmuse osastav. Sama nipp võib päästa ka teisi harvu vorme — kirjapilt ja vastus jäävad samaks, lause tuleb teisest sõnast. (`items.json` lemma jääb ekslikult `tugi`, aga `app.js` ei kasuta `lemma` ega `meaning` välja.) **Maskotid jäävad nimeta** (Silveri otsus 12. sept — ka pandal ei ole nime).

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
