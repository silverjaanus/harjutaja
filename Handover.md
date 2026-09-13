# Handover — Harjutaja

Uuendatud: 13. september 2026

## Current Goal

Harjutaja on eestikeelne õppemängude äpp lastele. Esimene kasutaja on Mia, kes käib 3. klassis. Moodulid: **Korrutaja ja Kirjutaja v1 on live**, Kell, Teisendaja ja Keel on plaanis. Kirjutaja on õigekirjamäng, kus laps kuulab sõna ja valib lünka õige tähe (g / k / kk, b / p / pp, d / t / tt); lause on ekraanil.

**Mis on pooleli ja otsustamata: vt jaotist „Lahtised otsad" allpool.** Seal on kõik ühes kohas.

Täisplaan on Claude'i projektis failis `claude/kirjutaja-plaan.md`, taust ja reeglid failis `claude/kirjutaja-ideed.md`, kogu terviku ülevaade failis `claude/harjutaja-ulevaade.md`.

## Completed Steps

- Kontseptsioon, õppekava ja õigekirjareeglite kontroll (Fable) — `kirjutaja-ideed.md`.
- Otsused: hääl Gemini TTS; vale vastuse järel loetakse ette kõik variandid; terviku nimi Harjutaja; logo blueprint-kalligraafia kollase aktsendiga (visandid: kalligraafiline K, TeX Gyre Chorus font, konstruktsiooniringid arvutatud tähe kõveratest).
- Arhitektuur: valik A — uus repo `harjutaja`, Korrutaja jääb esialgu oma repos puutumata ja kolib hiljem. **Kolimine tehtud 13. sept** (vt „In Progress“).
- Häälte test kolmes voorus (`tools/tts_test/`: tts_test.py, normalize_closure.py, make_round2.py, page/). Testileht: artifakt „Kirjutaja häälte test“, tulemused selle andmebaasis `results`.
- Projekti ülevaade kogu skoobiga: Claude'i projektis `claude/harjutaja-ulevaade.md`.
- **Maskoti valik (12. sept):** kuus varianti kõrvuti võrdluslehel (artifakt „Kirjutaja robotivalik“) — Silver valis **plekkroboti**: kandiline neetidega pea, valge ekraannägu tumedate silmadega, vedrukael, numbrilaud ja tuled kõhul, haaratsitega käed. `kirjutaja/robot.js` on selle peale ümber kirjutatud; API (`KRobot(mood, {head})`) ja animatsiooniklassid (`kr-body`, `kr-eyes`, `kr-arm kr-l/kr-r`, `kr-spark`) on samad, seega `app.js` ja `kirjutaja.css` ei muutunud.

- **Avaleht (12. sept, commit `25fe8fe`):** `index.html` on nüüd päris avaleht — robot tervitab (lehvitab, klikile hüppab), Kirjutaja ja Korrutaja kaardid, „Tulekul“ nimekiri (Kell, Teisendaja, Keel) ja jalus. Manifesti `start_url` on `./` (varem `./kirjutaja/`). Eesti keel üle vaadatud Fable'iga.
- **Avalehe teine ring (12. sept, commitid `24b8f2a`, `8328f54`):** taust on punktiruudustik (jooneline vihikupaber on Kirjutaja materjal, kogumi leht ei kanna ühe mooduli riideid); kangelasribas tegelast ei ole, **maskotid on moodulikaartidel** — roboti pea Kirjutaja kaardil, panda pea Korrutaja kaardil, kummalgi oma värviga plaat. Otsustatud reegel: **ikoon on igal moodulil kohustuslik, maskott vabatahtlik** ja tuleb siis, kui moodul valmib; kaart näitab maskotti, kui see olemas, muidu ikooni. Logo jääb ikoonipesadesse (favicon, PWA, mooduli päis, jagamispilt), kaardil on nägu. Iga maskott peab olema teistest värvi või siluetiga eristatav. Harjutajale endale tegelast ei tehta.
- **Logo valitud (13. sept):** neli kriipsu kahes paaris ja lühike tõusev sild nende vahel — loeb korraga kriipsutamise ja H-tähena. Kollane põhi `#f3c445`, kriipsud ja sild tint `#16284a`, joon 8,6, ümarad otsad, ikooni nurgaraadius 22,5%. Neli ringi variante on Claude'i projektis failis `claude/harjutaja-logo.md`. Failid `icons/harjutaja-*`: `ikoon.svg` (täisruut, ikoonipesadesse), `ikoon-ummar.svg` (ümarnurkne, veebi ja favicon), `mark.svg` (ainult märk, `currentColor`), `sonamark.svg` (märk + sõna Fredoka SemiBoldis), PNG-d 512/192/180/32. Manifest ja `index.html` osutavad nüüd neile; avalehe kangelasribasse tuli märk h1 kohale; lisatud og-sildid.

**Ikoonireegel (kehtib, otsustatud 12. sept):** kogu äpil on **üks logo** — Harjutaja märk kollasel — ja see läheb kõigisse ikoonipesadesse: favicon, PWA, mooduli päis, jagamispilt. Moodulit eristab **maskott**, mitte oma ikoon või oma täht. Moodulikaart avalehel näitab maskotti. Vana plaan „iga moodul saab sama kalligraafilise tähe erineva aktsendiga“ on maha maetud koos kalligraafilise logoga.

## In Progress

**ETAPP 1 TEHTUD: klassi identiteet on kõigi moodulite ühine (13. sept, commit `e38716a`, live).** Uus `core/klass.js` hoiab identiteeti omaette localStorage võtmes **`harjutaja_id_v1`** — `{player_id, secret, class_id, class_name, code, nick}` — ja pakub ka `rpc`, `join`, `restore` ning ühised veateated, et järgmine moodul ei peaks neid uuesti kirjutama. Korrutaja loeb ja kirjutab nüüd sedasama võtit (`HKlass.sync` pärast `load()`, `HKlass.set` `setCls`-is, `HKlass.clear` kolmes kohas, kus klass maha võetakse); **vana koht `korrutaja_v1.cls` jääb alles ja saab edasi kirja** — see on tagasitee. Kirjutaja näitab avalehel rida „Sinu klass: …"; võistlus ja edetabel tulevad etapiga 3.

**Reegel, mis siit välja tuli:** kui ühine võti ja mooduli oma koopia lähevad lahku, **võidab ühine võti**. Just see teebki ühes moodulis liitumisest kõigi moodulite liikmesuse.

Testitud pilve Playwrightiga (`tools/test_klass.py`, 20 kontrolli, kõik läbi): vana Korrutaja seis tõuseb üles ja vana koht jääb puutumata; Kirjutaja näeb sama klassi; Kirjutaja tõstab identiteedi üles ka siis, kui Korrutajat pole pärast uuendust avatud; ühine võti võidab lahkumineku korral; klassita mängija juures ei teki tühja võtit ega JS-viga. **Test jookseb pilvekonteineris**, mitte Windowsis — `python3 -m http.server 8899` repo juurest ja siis `python3 tools/test_klass.py`.

**ETAPP 2 OOTAB SILVERI RUN'I: `supabase/migration-6.sql` on valmis ja testitud, aga tootebaasi veel rakendamata.** Claude'i kohalik klassifikaator blokeeris nii SQL-editorisse skripti süstimise kui ka klaviatuuriga kleepimise („Production Deploy") — seda tuleb Silveril endal teha: ava Supabase SQL Editor, kleebi `supabase/migration-6.sql` sisu, vajuta Run. Migratsioon lisab `sessions.module`, tabeli `player_modules` ja annab `competed_today` / `report_session` / `class_board` funktsioonidele `p_module` parameetri vaikeväärtusega `'korrutaja'`. Testitud kohalikus Postgres 16-s kahel teel — tühjal baasil ja baasil, kus on juba mängija ja tema ringid. Vana kaheparameetriline `class_board` tagastab sama kuju, ainult uue `module` võtme võrra rikkamalt. Detailid: `supabase/README.md`.

**Ikoonid parandatud (13. sept, commit `a981ac6`, live):** avakuva ikoon nägi katki välja kahel põhjusel. `icons/harjutaja-512.png` oli **katkine fail** (2462 baiti, Pillow: „broken data stream") — Android pidi leppima 192-pikslisega. Ja manifest lubas samad failid nii `any` kui `maskable` rollis: Android lõikab adaptiivsest ikoonist välja ainult **keskmise ringi, 72/108 pildi laiusest**, seega täissuuruses märgi kriipsude otsad jäid maski taha. Nüüd on kaks komplekti — `harjutaja-{512,192,180,32}.png` (märk täissuuruses, favicon ja apple-touch-icon) ja `harjutaja-maskable-{512,192}.png` (märk 20% väiksem). `tools/make_icons.py` genereerib kõik ühest geomeetriast ja kontrollib lõpuks, et iga fail uuesti avaneb. **Õppetund: kontrolli genereeritud PNG-d alati uuesti avades, faili olemasolu ei tähenda, et ta on terve.** Telefonis püsib vana ikoon, kuni Chrome WebAPK-i uuendab — kiireim on avakuvalt eemaldada ja uuesti lisada.

**Kirjutaja kasutajaliidese pass (13. sept, commit `d11fc31`, live):** häälikukaardi number on nüüd **harjutatud / kokku** (liigub kohe) ja tähe all on täitumisriba: kollane = harjutatud, roheline = selge. Varem näitas ruut ainult selgeks saadute arvu, mis jäi peale tervet seanssi nulli — sõna läheb selgeks alles kahe järjestikuse õige vastuse järel (`HEngine.mastered`). Eemaldatud arendaja jäänuk „Praegu saab harjutada N sõna M-st“. Uus: mängu päises **‹** (eelmise sõna kuulamine, vastust muuta ei saa) ja **?** („midagi on valesti“ — märgib sõna; märgitud sõnad on avalehel oma plokis). Abi: Kirjutajas „Kuidas see käib?“ nippidega, Harjutaja avalehel „Mis see on ja kuidas töötab?“. Autor ja GitHubi link mõlemal lehel. Parandatud viga: eelmise sõna paneeli sulgemine hüppas ühest küsimusest üle (aegunud `advanceTimer` id oli tõeväärtuselt tõene).

**KORRUTAJA ON KOLINUD (13. sept, live).** Uus aadress https://harjutaja.silverjaanus.com/korrutaja/. Neli sammu: üleviimise leht vanas repos (`vii-ule.html`, `1c1dc65`), vastuvõtja siin (`korrutaja/vii-sisse.html`, `7e3267a`), kood siia kausta `korrutaja/` (`c452b4e`), vana domeen kolimise teateks (`korrutaja` repo `a62d976`). Kontroll näitas, et **kogu Korrutaja seis, sh klassi `player_id` ja `secret`, on ühes `korrutaja_v1` plokis** — üleviimine kannab kaasa ka edetabeli koha ja Supabase'i ei pidanud puutuma. Andmed käivad URL-i fragmendis, mitte serverist läbi.

Kaks asja, mis oleksid asja katki teinud. **(1) Service worker:** Korrutaja vana `sw.js` kustutas aktiveerudes kõik vahemälud, mis polnud tema omad — samal originil oleks see hävitanud Harjutaja omad. Seega kolis Korrutaja **ilma oma service workerita ja ilma oma manifestita**; uus `korrutaja/build.py` ei genereeri enam manifesti, ikoone ega sw-d ja Pillow't ei vaja. Live'is kontrollitud: originil on täpselt üks sw. **(2) Pime ümbersuunamine:** vana domeen ei suuna edasi, sest see saadaks lapse tühja äppi ja jätaks tema harjutamise vaikselt vanasse originisse maha. Vana `index.html` on nüüd teade, mis vaatab, kas selles brauseris on veel `korrutaja_v1`, ja pakub siis üleviimist; `sw.js` seal võtab ennast maha; `build.py` keeldub käivitumast. Detailid ja õppetunnid: `claude/korrutaja-kolimine.md`.

**Korrutaja muutmine käib nüüd nii:** muuda `korrutaja/korrutaja.src.html`, jooksuta `python korrutaja/build.py`, siis `python tools/build_kirjutaja.py` (see tõstab juure `sw.js` versiooni — ilma selleta näevad telefonid vana).

**Jaluse reegel (13. sept, commit `8f24a3c`):** nimi on link silverjaanus.com-i ja sõnastus on „Tegi Silver Jaanus“, sama mis Korrutajal. **GitHubi link ainult Harjutaja avalehel**, moodulis on autor (ja Kirjutajas Ekilexi viide). Kirjutaja kaardilt eemaldatud kollane ääris (`mod new`) — silt ilma seletuseta.

**Vana `korrutaja` repo on pargitud.** Seal on alles ainult kolimise teade (`index.html`), üleviimise leht (`vii-ule.html`), enda maha võttev `sw.js` ja vana lähtekood arhiivina; `build.py` keeldub käivitumast. Ära tee seal enam arendustööd — mäng elab `harjutaja/korrutaja/`-s.

**Töövõte:** iga Kirjutaja kasutajaliidese muudatuse järel tuleb jooksutada `python tools/build_kirjutaja.py`, sest see tõstab `sw.js` versiooni. Ilma selleta serveerib service worker olemasolevatele kasutajatele vana `app.js`-i ja muudatust ei ole näha. Kohalikul testimisel tuleb brauseris service worker ja vahemälu enne käsitsi tühjendada.

**Hoiatus:** ära muuda faile PowerShelli `Get-Content | Set-Content` toruga — PS 5.1 loeb UTF-8 ANSI-na ja kirjutab topeltkodeerituna, mis rikkus 13. sept `Handover.md` täpitähed (parandatud commitis, mis selle rea lisas). Kasuta `edit_block`i või Pythonit.

**Live (13. sept, commitid `03d7948` logo ja `4f59e6b` sõnavara):** https://harjutaja.silverjaanus.com — uus logo kõigis ikoonipesades, Kirjutajas **375 sõna 376-st**, service worker `h-202609131659`. Kontrollitud nii kohalikult (python http.server + brauseripaan: üks küsimus mängitud läbi) kui live'is pärast deployd.

**Sõnavara otsused sisse loetud (13. sept, commit `4f59e6b`):** Silveri ülevaatuse kuus otsust artifakti „Kirjutaja sõnavara“ andmebaasist (`decisions` kogum) on failis `tools/wordbank/data/decisions.json`. Kaks jäid välja (häbid, higid — Silver kinnitas Fable'i otsuse), neli võeti tagasi (sappa, tukke, nabad, prügid), nabadil on Silveri parandatud lause. `finalize.py` loeb nüüd `decisions.json`-i ja käib automaatikast üle — nii satuvad tagasi võetud sõnad ka helivajaduse nimekirja (varem tegi seda ainult `build_kirjutaja.py`, mistõttu heli jäi tegemata). Sappa ja tukke said heli tasuta, sest need jagavad variante juba olemasolevate sõnadega saba ja tugi. Nabadile ja prügidele tehti 6 uut klippi ühe TTS-päringuga.

**Kõigi 381 vormi ülevaatus (13. sept, commit `4f59e6b`):** leht „Kirjutaja laused“ (https://claude.ai/code/artifact/5d25ec7d-b01d-4493-8448-be31fd17b0f7, andmebaasi kogum `review`) näitab iga vormi kolmikut, õiget vastust ja muudetavat lauset. Silver tegi kaheksa parandust: lauseid muutsid `lõpu`, `odavat`, `sappa` („Võtke üksteise järel sappa.“), `lube` (tagasi mängu) ning kaks homonüümivahetust — **`sadama` on nüüd tegusõna** („Vihma hakkas sadama.“) ja **`lukku` on lukustus** („Pane uks lukku.“); välja läksid `prügid` ja `sadamat`. Lube vajas 3 uut klippi; samas päringus õnnestus lõpuks ka `rotu`. **Seis: mängus 375 sõna 376-st, heliklippe 929/930.** Ainus puuduv klipp on `hõpe` (sõna `hõbe` distraktor) — Gemini loeb seda järjekindlalt „hõppe“, seega `hõbe` on mängust väljas.

Claude luges kõik 375 lauset läbi; peale ülalmainitute oli ülejäänu korras.

**Heli tehtud:** `tools/audio_gen.py` partiidena 12 sõna päringus, iga partii kontrollitud transkriptsiooniga (`gemini-2.5-flash`, kaashäälikuskelett, täpitähed normaliseeritud). 852 klippi ~80 TTS-päringuga umbes 45 minutiga. Kontroll töötas: üksikud valesti kuuldud sõnad (nägus → „Nogus“, pidur → „tittur“) läksid järgmisesse partiisse. Puudu jäid ainult mittesõnad `hope` ja `rotu` — Gemini loeb neid järjekindlalt „hõppe“ ja „ruttu“ —, seega on kaks vormi mängust väljas.

**Kvoodi õppetund:** `gemini-3.1-flash-tts` päevalimiit (Tier 1: 100 päringut) lähtestub **Vaikse ookeani südaööl ehk 10:00 Eesti aja järgi**, mitte keskööl. Minutis ~10 päringut.

**Homonüüminipp (õppetund, mitte lahtine ots):** sõna `tukke` vana lause („Poiss toetus seljaga tukke.“) oli vigane — *toetuma* ei käi lühikese sisseütlevaga. Silver andis asemele **„Poiss segas ahjuroobiga tuliseid tukke.“**, mis kasutab homonüümi: *tukk : tuki : tukke* tähenduses põlev halg, mitmuse osastav. Sama nipp võib päästa ka teisi harvu vorme — kirjapilt ja vastus jäävad samaks, lause tuleb teisest sõnast. (`items.json` lemma jääb ekslikult `tugi`, aga `app.js` ei kasuta `lemma` ega `meaning` välja.) **Maskotid jäävad nimeta** (Silveri otsus 12. sept — ka pandal ei ole nime).

## Lahtised otsad

Kõik pooleli ja otsustamata asjad on **siin**, mitte teiste jaotiste sisse laiali. Uus lahtine ots käib siia; valmis saanu kolib „In Progress" alla või kustub.

### Vajab Silveri otsust

- **Migratsioon 6 tuleb Silveril ise Supabase'is käivitada.** Vt „In Progress" ülal. Kuni see pole tehtud, ei saa etappi 3 (Kirjutaja võistlus) alustada.

- **Plaan kinnitatud (Silver, 13. sept).** Claude'i projektis `claude/jargmine-etapp-plaan.md`. Viis etappi: (1) ühine klassi identiteet — **tehtud**, (2) andmebaasi migratsioon 6 — **kood valmis, Run tegemata**, (3) Kirjutaja võistlus, (4) Kell, (5) Kirjutaja uued teemad üks rühm korraga (pikad häälikud → i ja j → ülejäänud). **Võistlusreegel otsustatud (Silver, 13. sept): Kirjutaja võistlus on 20 sõna, 10 sekundit igaüks** (kuni 3 min; Korrutajal 25 × 6 s). Heli tohib võistluses üks kord korrata, aeg jookseb edasi. Plaan muudab ka varasemat reeglit „uus moodul alles siis, kui eelmist kasutatakse" — Kell tuleb enne Kirjutaja v1.1.

- **„Midagi on valesti" märked jäävad seadmesse.** Kirjutaja `?` nupp märgib sõna ära, aga märge jääb sellesse brauserisse ja on näha ainult selle avalehel. Kui Mia harjutab oma telefonis, ei jõua märge Silverini. Lahendus nõuab võrguotsa — Supabase on Korrutaja tõttu projektis juba olemas, aga Kirjutajal ei ole praegu ühtegi serveripoolset kutset. Otsustamata: kas teha ja kui, siis kas oma RPC või lihtsam vorm.

### Tehniline võlg

- **`core/panda.js` on topeltkoopia.** Originaal elab endiselt `korrutaja/korrutaja.src.html`-is funktsioonis `panda()`. Kolimisel jäeti see teadlikult tegemata, et kolimise risk väiksem oleks. Nüüd on mõlemad failid samas repos ja dubleerimise saab ohutult ära koristada: Korrutaja peab hakkama `core/panda.js`-i kasutama ja `panda()` lähtefailist kaduma.
- **`icons/kirjutaja-*` on kasutuseta.** Kalligraafiline K sinikoopial, sõnamark, 192 ja 512 PNG — vana plaani jäänuk, kus igal moodulil pidi olema oma kalligraafiline täht. Ikoonireegel muutus 13. sept (üks logo, moodulitel maskotid). Võib kustutada.

### Järgmine funktsionaalsus

- **Kirjutaja v1.1:** täishäälikud (a/aa) ning l/ll, s/ss, „s-i ja h-i kõrval k, p, t". Sõnavara otsused on tehtud (vt „In Progress").
- **Uued moodulid** (Kell, Teisendaja, Keel) alles siis, kui Kirjutajat päriselt kasutatakse.

### Korrutajas

Korrutaja enda lahtised otsad on `claude/korrutaja-ulevaade.md` lõpus („Seis"): viie võistleja lävi kooli- ja Eesti-võrdlusse, vanade migratsiooniühilduvuste koristus, ja ideed failist `korrutaja-tegelane-ja-kiitus.md` (nädala tähed, kogumisalbum, pandale asjad).

## Key Context

- Kohalik kaust: `C:\Users\Silver\Documents\GitHub\harjutaja` (ühendatud Cowork'i sessiooniga). Repo github.com/silverjaanus/harjutaja, Vercel projekt harjutaja, domeen harjutaja.silverjaanus.com.
- DNS (Squarespace): Silver lubas Claude'il kirjeid ise muuta; e-posti koodi sisestab Silver. Claude-in-Chrome alamagendil blokeeris kohalik klassifikaator DNS-muudatused, põhilõimest otse tehes läks läbi.
- Silveri sõnavara otsused (`finalize.py`): pittu, uttu, lukku sisse; lipp, sukk, sitikas, kakk, kepp sisse (ka libu jääb variandiks). Välja 8 harva vormi. 373 vormi, 921 heliklippi.
- Gemini: mudel `gemini-3.1-flash-tts-preview`, REST `generateContent`, päis `x-goog-api-key`, vastus toores PCM 24 kHz 16-bit mono. Võti Windowsi kasutaja keskkonnamuutujas `GEMINI_API_KEY` (skript loeb registrist, kui protsessil seda pole). Tasuta tase: 30 s paus päringute vahel, päevalimiit olemas.
- Sõnad küsitakse kümnekaupa ühe päringuga ja lõigatakse **n−1 pikima vaikuse** kohalt (`split_words`). Esimene versioon lõikas lühikeste vaikuste järgi ja tükeldas sõnu sulghääliku sulu kohalt — need klipid on kaustas `out\_to_delete` (kustutamiseks). Kontroll: sõnavahed peavad olema selgelt pikemad kui vaikused sõna sees ja iga tükk 0,3–1,6 s, muidu küsitakse ükshaaval.
- Stiiliviip „nagu õpetaja loeb etteütlust“ pani Gemini sõnu silpideks jaotama; nüüd „tavalises tempos ja ilma sõna silpideks jaotamata“. Üksiku sõna viip (`STYLE_ONE`) on endiselt etteütluse sõnastusega.
- Pilvekonteinerist ei pääse ligi Ekilexile, PyPI-le ega TartuNLP-le (proxy 403) — need sammud käivad Windowsis Desktop Commanderiga.
- Korrutaja: **siinsamas repos kaustas `korrutaja/`**, live harjutaja.silverjaanus.com/korrutaja/. Vana repo `C:\Users\Silver\Documents\GitHub\korrutaja` on pargitud (ainult kolimise teade ja `vii-ule.html`). Git push käib Desktop Commanderiga.
- Kolme nupu reegel kehtib ainult lühikese täishääliku järel, täishäälikute vahel, 1. ja 2. silbi piiril. Pika täishääliku järel, s/h kõrval, sõna alguses ja lõpus lünka ei tehta.
- Kirjutaja v1 torujuhe on **läbi käidud ja valmis**: sõnapank Ekilexi API kaudu (võti keskkonnamuutujas `EKILEX_API_KEY`) → laused → heli → äpp → avaldamine. Sama teed läheb v1.1 uute häälikurühmadega.
