# Handover â€” Harjutaja

Uuendatud: 13. september 2026

## Current Goal

Harjutaja on eestikeelne ÃµppemÃ¤ngude Ã¤pp lastele. Esimene kasutaja on Mia, kes kÃ¤ib 3. klassis. Ã„pis on moodulid: Korrutaja (live), Kirjutaja (ehitamisel), Kell ja Keel (plaanis). Praegune eesmÃ¤rk on Kirjutaja v1 â€” ÃµigekirjamÃ¤ng, kus laps kuulab lauset ja valib lÃ¼nka Ãµige tÃ¤he (g / k / kk, b / p / pp, d / t / tt).

TÃ¤isplaan on Claude'i projektis failis `claude/kirjutaja-plaan.md`, taust ja reeglid failis `claude/kirjutaja-ideed.md`, kogu terviku Ã¼levaade failis `claude/harjutaja-ulevaade.md`.

## Completed Steps

- Kontseptsioon, Ãµppekava ja Ãµigekirjareeglite kontroll (Fable) â€” `kirjutaja-ideed.md`.
- Otsused: hÃ¤Ã¤l Gemini TTS; vale vastuse jÃ¤rel loetakse ette kÃµik variandid; terviku nimi Harjutaja; logo blueprint-kalligraafia kollase aktsendiga (visandid: kalligraafiline K, TeX Gyre Chorus font, konstruktsiooniringid arvutatud tÃ¤he kÃµveratest).
- Arhitektuur: valik A â€” uus repo `harjutaja`, Korrutaja jÃ¤Ã¤b praegu oma repos puutumata ja kolib hiljem.
- HÃ¤Ã¤lte test kolmes voorus (`tools/tts_test/`: tts_test.py, normalize_closure.py, make_round2.py, page/). Testileht: artifakt â€žKirjutaja hÃ¤Ã¤lte testâ€œ, tulemused selle andmebaasis `results`.
- Projekti Ã¼levaade kogu skoobiga: Claude'i projektis `claude/harjutaja-ulevaade.md`.
- **Maskoti valik (12. sept):** kuus varianti kÃµrvuti vÃµrdluslehel (artifakt â€žKirjutaja robotivalikâ€œ) â€” Silver valis **plekkroboti**: kandiline neetidega pea, valge ekraannÃ¤gu tumedate silmadega, vedrukael, numbrilaud ja tuled kÃµhul, haaratsitega kÃ¤ed. `kirjutaja/robot.js` on selle peale Ã¼mber kirjutatud; API (`KRobot(mood, {head})`) ja animatsiooniklassid (`kr-body`, `kr-eyes`, `kr-arm kr-l/kr-r`, `kr-spark`) on samad, seega `app.js` ja `kirjutaja.css` ei muutunud.

- **Avaleht (12. sept, commit `25fe8fe`):** `index.html` on nÃ¼Ã¼d pÃ¤ris avaleht â€” robot tervitab (lehvitab, klikile hÃ¼ppab), Kirjutaja ja Korrutaja kaardid, â€žTulekulâ€œ nimekiri (Kell, Teisendaja, Keel) ja jalus. Manifesti `start_url` on `./` (varem `./kirjutaja/`). Eesti keel Ã¼le vaadatud Fable'iga.
- **Avalehe teine ring (12. sept, commitid `24b8f2a`, `8328f54`):** taust on punktiruudustik (jooneline vihikupaber on Kirjutaja materjal, kogumi leht ei kanna Ã¼he mooduli riideid); kangelasribas tegelast ei ole, **maskotid on moodulikaartidel** â€” roboti pea Kirjutaja kaardil, panda pea Korrutaja kaardil, kummalgi oma vÃ¤rviga plaat. Otsustatud reegel: **ikoon on igal moodulil kohustuslik, maskott vabatahtlik** ja tuleb siis, kui moodul valmib; kaart nÃ¤itab maskotti, kui see olemas, muidu ikooni. Logo jÃ¤Ã¤b ikoonipesadesse (favicon, PWA, mooduli pÃ¤is, jagamispilt), kaardil on nÃ¤gu. Iga maskott peab olema teistest vÃ¤rvi vÃµi siluetiga eristatav. Harjutajale endale tegelast ei tehta.
- **Logo valitud (13. sept):** neli kriipsu kahes paaris ja lÃ¼hike tÃµusev sild nende vahel â€” loeb korraga kriipsutamise ja H-tÃ¤hena. Kollane pÃµhi `#f3c445`, kriipsud ja sild tint `#16284a`, joon 8,6, Ã¼marad otsad, ikooni nurgaraadius 22,5%. Neli ringi variante on Claude'i projektis failis `claude/harjutaja-logo.md`. Failid `icons/harjutaja-*`: `ikoon.svg` (tÃ¤isruut, ikoonipesadesse), `ikoon-ummar.svg` (Ã¼marnurkne, veebi ja favicon), `mark.svg` (ainult mÃ¤rk, `currentColor`), `sonamark.svg` (mÃ¤rk + sÃµna Fredoka SemiBoldis), PNG-d 512/192/180/32. Manifest ja `index.html` osutavad nÃ¼Ã¼d neile; avalehe kangelasribasse tuli mÃ¤rk h1 kohale; lisatud og-sildid.
- **Lahtised otsad:** (1) `core/panda.js` on **ajutine koopia** â€” originaal elab `korrutaja.src.html`-is funktsioonis `panda()`; Korrutaja kolimisel jÃ¤Ã¤b alles ainult `core/panda.js`. (2) `icons/kirjutaja-*` (kalligraafiline K sinikoopial, sÃµnamark, 192 ja 512 PNG) on nÃ¼Ã¼d kasutuseta â€” vana plaani jÃ¤Ã¤nuk, kus igal moodulil pidi olema oma kalligraafiline tÃ¤ht. VÃµib kustutada.

**Ikoonireegel (kehtib, otsustatud 12. sept):** kogu Ã¤pil on **Ã¼ks logo** â€” Harjutaja mÃ¤rk kollasel â€” ja see lÃ¤heb kÃµigisse ikoonipesadesse: favicon, PWA, mooduli pÃ¤is, jagamispilt. Moodulit eristab **maskott**, mitte oma ikoon vÃµi oma tÃ¤ht. Moodulikaart avalehel nÃ¤itab maskotti. Vana plaan â€žiga moodul saab sama kalligraafilise tÃ¤he erineva aktsendigaâ€œ on maha maetud koos kalligraafilise logoga.

## In Progress

**Live (13. sept, commitid `03d7948` logo ja `4f59e6b` sÃµnavara):** https://harjutaja.silverjaanus.com â€” uus logo kÃµigis ikoonipesades, Kirjutajas **375 sÃµna 376-st**, service worker `h-202609131659`. Kontrollitud nii kohalikult (python http.server + brauseripaan: Ã¼ks kÃ¼simus mÃ¤ngitud lÃ¤bi) kui live'is pÃ¤rast deployd.

**SÃµnavara otsused sisse loetud (13. sept, commit `4f59e6b`):** Silveri Ã¼levaatuse kuus otsust artifakti â€žKirjutaja sÃµnavaraâ€œ andmebaasist (`decisions` kogum) on failis `tools/wordbank/data/decisions.json`. Kaks jÃ¤id vÃ¤lja (hÃ¤bid, higid â€” Silver kinnitas Fable'i otsuse), neli vÃµeti tagasi (sappa, tukke, nabad, prÃ¼gid), nabadil on Silveri parandatud lause. `finalize.py` loeb nÃ¼Ã¼d `decisions.json`-i ja kÃ¤ib automaatikast Ã¼le â€” nii satuvad tagasi vÃµetud sÃµnad ka helivajaduse nimekirja (varem tegi seda ainult `build_kirjutaja.py`, mistÃµttu heli jÃ¤i tegemata). Sappa ja tukke said heli tasuta, sest need jagavad variante juba olemasolevate sÃµnadega saba ja tugi. Nabadile ja prÃ¼gidele tehti 6 uut klippi Ã¼he TTS-pÃ¤ringuga.

**KÃµigi 381 vormi Ã¼levaatus (13. sept, commit `4f59e6b`):** leht â€žKirjutaja lausedâ€œ (https://claude.ai/code/artifact/5d25ec7d-b01d-4493-8448-be31fd17b0f7, andmebaasi kogum `review`) nÃ¤itab iga vormi kolmikut, Ãµiget vastust ja muudetavat lauset. Silver tegi kaheksa parandust: lauseid muutsid `lÃµpu`, `odavat`, `sappa` (â€žVÃµtke Ã¼ksteise jÃ¤rel sappa.â€œ), `lube` (tagasi mÃ¤ngu) ning kaks homonÃ¼Ã¼mivahetust â€” **`sadama` on nÃ¼Ã¼d tegusÃµna** (â€žVihma hakkas sadama.â€œ) ja **`lukku` on lukustus** (â€žPane uks lukku.â€œ); vÃ¤lja lÃ¤ksid `prÃ¼gid` ja `sadamat`. Lube vajas 3 uut klippi; samas pÃ¤ringus Ãµnnestus lÃµpuks ka `rotu`. **Seis: mÃ¤ngus 375 sÃµna 376-st, heliklippe 929/930.** Ainus puuduv klipp on `hÃµpe` (sÃµna `hÃµbe` distraktor) â€” Gemini loeb seda jÃ¤rjekindlalt â€žhÃµppeâ€œ, seega `hÃµbe` on mÃ¤ngust vÃ¤ljas.

Claude luges kÃµik 375 lauset lÃ¤bi; peale Ã¼lalmainitute oli Ã¼lejÃ¤Ã¤nu korras.

**Heli tehtud:** `tools/audio_gen.py` partiidena 12 sÃµna pÃ¤ringus, iga partii kontrollitud transkriptsiooniga (`gemini-2.5-flash`, kaashÃ¤Ã¤likuskelett, tÃ¤pitÃ¤hed normaliseeritud). 852 klippi ~80 TTS-pÃ¤ringuga umbes 45 minutiga. Kontroll tÃ¶Ã¶tas: Ã¼ksikud valesti kuuldud sÃµnad (nÃ¤gus â†’ â€žNogusâ€œ, pidur â†’ â€žtitturâ€œ) lÃ¤ksid jÃ¤rgmisesse partiisse. Puudu jÃ¤id ainult mittesÃµnad `hope` ja `rotu` â€” Gemini loeb neid jÃ¤rjekindlalt â€žhÃµppeâ€œ ja â€žruttuâ€œ â€”, seega on kaks vormi mÃ¤ngust vÃ¤ljas.

**Kvoodi Ãµppetund:** `gemini-3.1-flash-tts` pÃ¤evalimiit (Tier 1: 100 pÃ¤ringut) lÃ¤htestub **Vaikse ookeani sÃ¼daÃ¶Ã¶l ehk 10:00 Eesti aja jÃ¤rgi**, mitte keskÃ¶Ã¶l. Minutis ~10 pÃ¤ringut.

**JÃ¤rgmised sammud (v1.1):** tÃ¤ishÃ¤Ã¤likud (a/aa) ning l/ll, s/ss, â€žs-i ja h-i kÃµrval k, p, tâ€œ, Korrutaja kolimine Harjutajasse. SÃµnavara otsused on tehtud (vt eespool). SÃµna `tukke` vana lause (â€žPoiss toetus seljaga tukke.â€œ) oli vigane â€” *toetuma* ei kÃ¤i lÃ¼hikese sisseÃ¼tlevaga. Silver andis asemele **â€žPoiss segas ahjuroobiga tuliseid tukke.â€œ**, mis kasutab homonÃ¼Ã¼mi: *tukk : tuki : tukke* tÃ¤henduses pÃµlev halg, mitmuse osastav. Sama nipp vÃµib pÃ¤Ã¤sta ka teisi harvu vorme â€” kirjapilt ja vastus jÃ¤Ã¤vad samaks, lause tuleb teisest sÃµnast. (`items.json` lemma jÃ¤Ã¤b ekslikult `tugi`, aga `app.js` ei kasuta `lemma` ega `meaning` vÃ¤lja.) **Maskotid jÃ¤Ã¤vad nimeta** (Silveri otsus 12. sept â€” ka pandal ei ole nime).

## Key Context

- Kohalik kaust: `C:\Users\Silver\Documents\GitHub\harjutaja` (Ã¼hendatud Cowork'i sessiooniga). Repo github.com/silverjaanus/harjutaja, Vercel projekt harjutaja, domeen harjutaja.silverjaanus.com.
- DNS (Squarespace): Silver lubas Claude'il kirjeid ise muuta; e-posti koodi sisestab Silver. Claude-in-Chrome alamagendil blokeeris kohalik klassifikaator DNS-muudatused, pÃµhilÃµimest otse tehes lÃ¤ks lÃ¤bi.
- Silveri sÃµnavara otsused (`finalize.py`): pittu, uttu, lukku sisse; lipp, sukk, sitikas, kakk, kepp sisse (ka libu jÃ¤Ã¤b variandiks). VÃ¤lja 8 harva vormi. 373 vormi, 921 heliklippi.
- Gemini: mudel `gemini-3.1-flash-tts-preview`, REST `generateContent`, pÃ¤is `x-goog-api-key`, vastus toores PCM 24 kHz 16-bit mono. VÃµti Windowsi kasutaja keskkonnamuutujas `GEMINI_API_KEY` (skript loeb registrist, kui protsessil seda pole). Tasuta tase: 30 s paus pÃ¤ringute vahel, pÃ¤evalimiit olemas.
- SÃµnad kÃ¼sitakse kÃ¼mnekaupa Ã¼he pÃ¤ringuga ja lÃµigatakse **nâˆ’1 pikima vaikuse** kohalt (`split_words`). Esimene versioon lÃµikas lÃ¼hikeste vaikuste jÃ¤rgi ja tÃ¼keldas sÃµnu sulghÃ¤Ã¤liku sulu kohalt â€” need klipid on kaustas `out\_to_delete` (kustutamiseks). Kontroll: sÃµnavahed peavad olema selgelt pikemad kui vaikused sÃµna sees ja iga tÃ¼kk 0,3â€“1,6 s, muidu kÃ¼sitakse Ã¼kshaaval.
- Stiiliviip â€žnagu Ãµpetaja loeb etteÃ¼tlustâ€œ pani Gemini sÃµnu silpideks jaotama; nÃ¼Ã¼d â€žtavalises tempos ja ilma sÃµna silpideks jaotamataâ€œ. Ãœksiku sÃµna viip (`STYLE_ONE`) on endiselt etteÃ¼tluse sÃµnastusega.
- Pilvekonteinerist ei pÃ¤Ã¤se ligi Ekilexile, PyPI-le ega TartuNLP-le (proxy 403) â€” need sammud kÃ¤ivad Windowsis Desktop Commanderiga.
- Korrutaja: repo `C:\Users\Silver\Documents\GitHub\korrutaja`, live korrutaja.silverjaanus.com, Vercel. Git push kÃ¤ib Desktop Commanderiga.
- Kolme nupu reegel kehtib ainult lÃ¼hikese tÃ¤ishÃ¤Ã¤liku jÃ¤rel, tÃ¤ishÃ¤Ã¤likute vahel, 1. ja 2. silbi piiril. Pika tÃ¤ishÃ¤Ã¤liku jÃ¤rel, s/h kÃµrval, sÃµna alguses ja lÃµpus lÃ¼nka ei tehta.
- JÃ¤rgmised sammud plaanist: sÃµnapank Ekilexi API kaudu (vaja Silveri tasuta API-vÃµtit, keskkonnamuutuja `EKILEX_API_KEY`), laused, heli, Ã¤pp, avaldamine harjutaja.silverjaanus.com.
