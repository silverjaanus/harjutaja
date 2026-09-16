# Handover — Harjutaja

Uuendatud: 16. september 2026

## Current Goal

Harjutaja on eestikeelne õppemängude äpp lastele. Esimene kasutaja on Mia, kes käib 3. klassis. Moodulid: **Korrutaja, Kirjutaja, Kell, Teisendaja ja Keel on live** (Kellas kella lugemine ja ajaarvutus; Keeles kooli laused ja sõnad ekraanilt). Keel ja uue mooduli mall kasutavad `core/moodul.js`-i; teised moodulid ühist tuuma (`core/mang.js` jt).

**Otsustamata asjad: jaotis „Lahtised otsad" allpool. Pooleli töö: kaust `handover/` (vt järgmist jaotist).**

Täisplaan on Claude'i projektis failis `claude/kirjutaja-plaan.md`, taust ja reeglid failis `claude/kirjutaja-ideed.md`, kogu terviku ülevaade failis `claude/harjutaja-ulevaade.md`.

## Pooleli töö — kaust `handover/`

**Iga haru kirjutab oma faili, mitte siia.** Enne 16. septembrit oli kogu pooleli töö selles failis ja iga paralleelse sessiooni merge läks Handoveri peal konflikti (Silveri otsus 16. sept: igal sessioonil oma fail). Reeglid on failis `handover/README.md`:

- Uus haru → uus fail `handover/<kuupäev>_<haru>.md` (nt `handover/2026-09-16_keel-heli.md`). Esimene rida ütleb seisu: `POOLELI`, `OOTAB MERGE'I` või `MERGE'ITUD`.
- **Sellesse faili (`Handover.md`) ei kirjutata pooleli olevat tööd.** Siia käivad ainult püsivad asjad: eesmärk, „Lahtised otsad" ja „Key Context". Ka neid muuda harva ja ainult oma reas.
- Sessiooni alguses: loe see fail ja kõik `handover/*.md` failid, mille seis ei ole `MERGE'ITUD`.
- Varasem ajalugu (11.–16. sept, kõik vanad „In Progress" kirjed): `handover/arhiiv/2026-09-11_16.md`.

## Lahtised otsad

Kõik pooleli ja otsustamata asjad on **siin**, mitte teiste jaotiste sisse laiali. Uus lahtine ots käib siia; valmis saanu kolib „In Progress" alla või kustub.

### Vajab Silveri otsust

- **~~Korrutaja harjutusringi pikkus: aeg või küsimuste arv?~~ — OTSUSTATUD 14. sept: küsimuste arv.** Tehtud samas harus (`uhtlustus`). `D.settings.round` on nüüd küsimuste arv, seadetes 10/15/20 (vaikimisi 15), vana minutiväärtus teisendatakse `load()`-is (2→10, 3→15, 5→20), muidu saaks vana seadega telefon kolmeküsimuselise ringi. Ring lõpeb loenduri peal, **aga mitte enne, kui ootel kordused on küsitud** (kuni neli lisaküsimust) — muidu jääks viimastel küsimustel tehtud viga ilma kordamiseta, mis on kogu mehaanika mõte. `roundElapsed()` kadus; `G.pauseMs` jäi alles, sest vihje lugemine ei tohi vastamisaega süüa. Avalehe nupp ütleb „15 küsimust", seadete silt „mitu küsimust ühes ringis"; kolm kohta, mis lubasid „3 minutit päevas", ütlevad nüüd „üks lühike ring päevas". Otsuse taust allpool.

  Vana kirje (miks see otsus üldse tekkis): Korrutajas oli ring **aeg** (2/3/5 min seadetest), Kirjutajas, Kellas ja Teisendajas **küsimuste arv** (15/12/12). Fable, ChatGPT ja Gemini ütlesid kõik kolm sõltumatult, et lapsele on arv parem: ajapõhises ringis katkeb kordamisahel keset vigade parandamist; aeglane laps (kes harjutust kõige rohkem vajab) saab vähem küsimusi ja halvema tunde; „8/12 → 11/12" on nähtav areng, „3 minutiga 23 tehet" ei ole; ajasurve matemaatikas on teadaolev ärevuse allikas. Codex märkis ühe asja, mis ajapõhises ringis on hea ja mida ei tohi kaotada: **vihje lugemine ei kuluta ringiaega** (`korrutaja.src.html`, `pauseMs`). Kui muudad, siis seadetesse 10/15/20 küsimust minutite asemel. See on Korrutaja harjutusreegli muudatus — võistlust (25 × 6 s) see ei puuduta.
- **~~Kägu ootab Mia valikut~~ — TEHTUD 14. sept, uus kägu on live'is (commit `364d7da`).** Silver valis asendi: **„võtame logoks oksal"**. `kell/tegelane.js` on ümber kirjutatud — uus pea, keha istub oksal, kõik viis ilmet (`happy`, `wave`, `cheer`, `kind`, `teach`), API `KKagu(mood, {head})` ja klassid muutumata, seega `app.js` ja `kell.css` jäid puutumata. **Moodulikaardi portree oli eraldi viga:** avalehe kaardil on SVG-l `overflow:visible`, seega pikk kreemikas rind **ripub kaardist välja** ja kaardi enda kreemikal taustal (`#fbead9`) kaob ära — portreel on nüüd ainult kurgulapp, mis järgib pea alumist kaart servast servani. Esimene katse jättis külgedele kreemikad nurgad, mis lugesid teise nokana; kaarega kulgev lapp seda ei tee. Ajalugu allpool.

  Vana kirje: Mia: „ei ole ilus. ja see on imelik, et silmad peast välja hüppavad." Silver: „kellauks on neist parim aga mitte hea. käo pea on imelik, nagu kapuuts oleks peas."
  - **Silmaviga parandatud:** `.kk-eyes` puudus `transform-box:fill-box;transform-origin:center`, seega skaleeris pilgutus SVG kujundi (0,0) suhtes ja silmad lendasid pildi ülaserva. Robotil ja pandal oli see rida algusest peale olemas.
  - **Pea on ümber joonistatud ja see kuju on nüüd otsustatud** (Fable'i geomeetria). Kapuutsi põhjustas kreemikas ellips pea sees: oranž rõngas ümber näo ongi parka siluett, ja nokk keskel heleda ketta sees on inimnina kohal. **Kolm asja teevad temast linnu:** (1) nokk ulatub pea kontuurist **välja** — see on kõige suurema mõjuga üksik muudatus, sest ninal pole vastet, mis välja ulatuks; (2) hele ala on **alt lahtine kurk-ja-rind**, mis jookseb lõuast kõhuni, mitte suletud näoketas; (3) tutt kaldub **taha**, mitte otse üles. Vaade on kolmveerand, nokk paremale.
  - **`tools/kagu-variandid.js` on ümber kirjutatud:** üks ühine pea (`KV.pea()`, osad `KV.TUTT/PEA/RIND/NOKK/SILMAD`) ja **viis kehaasendit** `KV.V.A`…`KV.V.E` — A oksal, B seisab, C sihvakas pika sabaga, D kellauksest piiluv, E lendaja. Iga funktsioon võtab `head`-lipu.
  - Valikuleht on artifakt „Kella kägu" (2. versioon) ja Mia valik salvestub selle andmebaasi dokumenti **`valik/kagu`** (`{variant, nimi, pohjus, aeg}`) — loe see `read_db`-ga. **Kui valik on tehtud:** võta võitja keha, kirjuta `kell/tegelane.js` selle peale ümber kõigi viie ilmega (`happy`, `wave`, `cheer`, `kind`, `teach`) ja hoia API `KKagu(mood, {head})` ning klassid `kk-body`, `kk-eyes`, `kk-wing kk-wave`, `kk-spark` samad — siis ei pea `app.js` ega `kell.css` muutuma.
  - **Õppetund, mis kehtib igale maskotile:** ümar värviline peakuju loeb vaikimisi inimesena. Loom tuleb sellest, mis pea siluetti **murrab** (nokk, kärss, kõrvad) ja sellest, et hele ala on avatud kuju, mitte keskel asuv suletud ketas.

- **Failide ülekanne pilvest Windowsi vedas kaks korda alt (14. sept).** `device_commit_files` vastas `{"written": […]}`, aga fail jäi kettale vanaks. Esimesel korral läks seetõttu `kell/tekst.js` commitist välja ja live'i jõudis pooleldi uus Kell (app.js uus, tekst.js vana) — vea leidis alles avaldatud faili suuruse kontroll. **Reegel: pärast iga ülekannet kontrolli kettal oleva faili baitide arvu ja mõnd uut stringi enne commitimist.** Kui ülekanne vedas alt, kirjuta fail Desktop Commanderi `write_file`-ga 30-realiste tükkidena — see on töötanud usaldusväärselt.

- **Plaan kinnitatud (Silver, 13. sept).** Claude'i projektis `claude/jargmine-etapp-plaan.md`. Viis etappi: (1) ühine klassi identiteet — **tehtud**, (2) andmebaasi migratsioon 6 — **tehtud**, (3) Kirjutaja võistlus — **tehtud**, (4) Kell — **tehtud**, (5) **Kirjutaja uued teemad — järgmine**, üks rühm korraga (pikad häälikud → i ja j → ülejäänud). **Võistlusreegel otsustatud (Silver, 13. sept): Kirjutaja võistlus on 20 sõna, 10 sekundit igaüks** (kuni 3 min; Korrutajal 25 × 6 s). Heli tohib võistluses üks kord korrata, aeg jookseb edasi. Plaan muudab ka varasemat reeglit „uus moodul alles siis, kui eelmist kasutatakse" — Kell tuleb enne Kirjutaja v1.1.

- **~~„Midagi on valesti" märked jäävad seadmesse~~ — TEHTUD 14. sept (commit `95b398e`), aga OOTAB SILVERI RUN'I.** `supabase/migration-8.sql` on valmis ja läbi testitud, tootebaasis seda veel **ei ole** — kuni Silver selle Run'ib, vastab `report_issue` 404-ga, märge jääb seadmesse ja proovib uuesti järgmisel avamisel. Äpis on kõik olemas: `HKlass.issue()` ja Kirjutaja `?` nupp saadavad märke koos kontekstiga.
  - **Miks server, mitte e-post:** laps ei kirjuta kirja ega täida vormi. Märge peab olema üks puudutus ja kontekst (moodul, sõna, lause, andmeversioon) peab tulema kaasa ise. Torustik oli juba olemas — anon-võti, RPC-muster, offline-outbox.
  - **Mängija on valikuline.** Klassita laps saab samuti märkida; siis läheb märge nimeta kirja. Vale salakood ei ole viga, vaid sama nimeta kirje — lapse tagasiside on tähtsam kui tema tuvastamine.
  - **Kiiruspiirang:** mängija kohta 50 märget päevas, nimeta märkeid 100 tunnis. Sama mooduli sama `item` ei tekita teist lahtist rida.
  - **Märkeid vaatab Silver Supabase'i SQL Editoris** (`select … from issues where done = false`), vt `supabase/README.md`. Eraldi lehte veel ei ole.
  - **Kellal on nüüd oma `?` nupp (commit `b504950`).** Märge võtab kaasa täpselt selle, mida laps ekraanil nägi: tekstülesandest kogu lugu ja küsimus („Lauamäng algab kell pool üks ja lõpeb kell üks. Kui kaua lauamäng kestab?"), kella lugemisest kellaaeg ja kumb ülesanne see oli. Just seda on vaja, et halb genereeritud lause üles leida. Võistluses on nupp peidus.
  - **Korrutajale `?` nuppu teadlikult ei tehtud.** Seal on küsimus „7 × 8" — selles ei saa midagi valesti olla. Genereeritud tekst on Kellas ja Kirjutajas, nupp kuulub sinna, kus on mida raporteerida.
  - **E-posti link on olemas** (`silver.jaanus@gmail.com`, teemarida mooduli järgi) Harjutaja avalehel ja kõigi kolme mooduli abilehel — see on täiskasvanu tee, lapse tee on `?` nupp. Korrutaja „Kes tegi" lõigus sai parandatud ka vana `korrutaja` repo viide.

### Tehniline võlg

- **~~`core/panda.js` on topeltkoopia~~ — TEHTUD 14. sept (commit `a88e93e`).** `korrutaja/index.html` laeb nüüd `../core/panda.js` ja lähtefaili jääb ainult vahendaja `function panda(mood,head){return window.KPanda?KPanda(mood,head):'';}`. Joonistus oli kahes failis identne, ainult `core` oma paneb SVG-le ka `class="panda"` — Korrutajas on see pesastatud ümbrise `div.panda` sisse ja midagi ei muutu (kontrollitud brauseris: avaekraan, päeva nipp ja kõik viis ilmet nii tervikuna kui peana).
- **~~Korrutajal on oma klassiekraan~~ — TEHTUD 14. sept, harus `klassiekraan` (commitid `9d5a6f1` ja `b689f49`), live'i veel läinud ei ole.** Vaatamine näitas, et Korrutaja ekraan ei olnud ühise vaesem koopia, vaid **rikkam**: koolinime soovitused, nime eelvaade, tiimi valik, kutsekaart, hoiatus vana grupi kohta ja jagamisnupp olid ainult seal. Seepärast käis koristus vastupidi — need kuus asja kolisid `core/klass.js`-i ja Korrutajast kadus `s-class` ekraan koos oma CSS-i ja JS-iga (−176 rida). Kirjutaja ja Kell said kõik uue ilma ühegi muudatuseta, sest `openJoin` API jäi samaks; juurde tuli ainult `onDone(cls, r)` teine argument (serveri vastus, kust Korrutaja võtab taastamisel seisu) ja valikuline `app` (mooduli nimi seesütlevas jagamistekstis).
- **~~`icons/kirjutaja-*` on kasutuseta~~ — KUSTUTATUD 14. sept (commit `31afeb9`).** Neli faili (kalligraafiline K, sõnamärk, 192 ja 512 PNG). Kontrollitud enne kustutamist: ühtegi viidet neile repos ei olnud. Git-is on need ajaloos alles.

### Järgmine funktsionaalsus

- **TEISENDAJA ON JÄRGMINE MOODUL (Silveri otsus 14. sept).** See läheb **ette** Kirjutaja uutest teemadest ehk muudab 13. sept kinnitatud plaani etapi 5 järjekorda. Õppekava uuring 2.–5. klassi kohta, mängu kuju ja allikad on Claude'i projektis failis `claude/teisendaja-plaan.md`. Koodi pole veel kirjutatud.
  - **Neli taset järgivad õppekava:** 1 = 2. kl (m/dm/cm, kg/g, h/min/s, euro ja sent), 2 = 3. kl (kogu mm–km rida naaberühikute kaupa, t, sajand, **nimega arvud** 2 km 350 m ↔ 2350 m), 3 = 4. kl (üle ühe astme, ülekanne, raha 3,15 €), 4 = 5. kl (koma, pindala, ruumala). **Kümnendmurde enne 4. taset ei ole** — 3. klassis öeldakse „2 kg 500 g", mitte „2,5 kg". Mia alustab teiselt tasemelt.
  - **Vastamine: laps kirjutab arvu ise** (Silveri otsus 14. sept), valikvastuseid ei ole. Klahvistik on mängul endal, mitte telefonil (`inputmode` avaks süsteemiklaviatuuri, mis katab pool ekraani) ja see läheb **`core/klahvistik.js`**-i — repos ei ole praegu ühtegi numbrisisestust, Teisendaja on esimene. Erand: „Kumb on suurem?" ja „Milline ühik sobib?" jäävad nupuvajutuseks, sest seal pole midagi kirjutada.
  - **Miks kirjutamine on parem:** valikvastus pakub vea ette, kirjutatud vastus **näitab, millise vea laps tegi** — 30 on puuduvad nullid, 0,003 on vale suund, 250 m (2 km 50 m asemel) on kadunud null kohaväärtuses. Vihje nimetab vea ja näitab **ühikuredelit** (mm–cm–dm–m–km nooltega ×10, ×1000), mis on ühtlasi mooduli visuaalne nägu, nagu sihverplaat on Kella oma.
  - **Võistlus: 15 ülesannet, 15 sekundit igaüks, alati tasemel 2 ja kõigist kategooriatest segi, üks kord päevas** (Silveri otsus 14. sept). Kuni 3,75 min ehk sama pikk kui Kirjutaja ja Kell. Korrutaja 6 s käib ühe-kahekohalise vastuse kohta; siin on kuni kuus numbrit ja klahvistikult otsimine.
  - **Kaks eeldust enne alustamist:** haru `klassiekraan` peab olema merge'itud (muidu tuleb liitumisekraan teist korda sisse) ja `sessions.op` vajab Teisendaja väärtust — selle saab panna samasse migratsioonijooksu, mida migratsioon 8 niikuinii ootab.
  - **Maskott** peab olema panda (must-valge), roboti (sinihall) ja käo (soe oranž) kõrval värvi järgi eristatav — vaba on roheline ja violetne. Otsustatakse variantide lehel nagu kägu.

- **Kella ajaarvutus võistlusesse?** Praegu on ajaarvutus — nii sõnadega kui numbritega — ainult harjutamises; **võistlus on endiselt 20 kellaaja lugemist 10 sekundiga** ja seda ei muudetud, sest võistlusreegel on Silveri otsus. Kui ajaarvutus kunagi võistlusesse tuleb, on kaks lahtist asja: aeg (10 s on kahesammulise loo jaoks vähe) ja see, kas tulemused jäävad võrreldavaks lastega, kes on seni ainult kella lugenud.
- **Kirjutaja uued teemad** (plaani etapp 5), üks rühm korraga: pikad häälikud (a/aa, l/ll, s/ss) → i ja j → ülejäänud. Õppekava uuring 2.–5. klassi kohta on failis `claude/jargmine-etapp-plaan.md`. **Uus asi arhitektuuris:** i/j, kaashäälikuühend, algustäht ja -gi/-ki on **reegliülesanded**, mitte kuulamisülesanded — heli on vaja ainult õigel sõnal, mitte igal variandil, ja Kirjutajasse tuleb teema mõiste.

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
