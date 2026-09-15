# Uue mooduli mall

See kaust on töötav näidismoodul „Näidis“ (liitmine, roosa aktsent). Ava see brauseris aadressil `…/_mall/`. Avalehel seda ei ole ja service worker seda vahemällu ei pane.

Mall on repo juurkaustas, mitte `moodulid/_mall/` (nagu kavas oli), sest moodulid elavad juurkaustas. Nii jäävad teed `../core/...` kopeerimisel samaks.

## Kuidas uus moodul tehakse

1. Kopeeri kaust: `_mall/` → `<id>/` (nt `keel/`). `id` on väikeste tähtedega, ilma täpitähtedeta.
2. Failid ja mida neis muuta:
   - `index.html` — ainult `<title>` ja `mall.css` nimi. Kõik `MALL:` kommentaarid näitavad kohti.
   - `mall.css` → `<id>.css` — aktsentvärv (`--accent`, `--accent-edge`, `--accent-ink`, `--warm`, `--warm-soft`), maskoti animatsioon ja mooduli oma osad. Ühiseid osi (päis, nupud, tulemus …) siin üle ei kirjutata.
   - `tegelane.js` — mooduli maskott. Peab oskama meeleolusid `wave`, `happy`, `cheer`, `kind` ja pea-kuju (`{ head: true }`) vihjekaardi jaoks.
   - `sisu.js` — ülesannete loomine, kontroll ja vihje. Ei mingit DOM-i. Igal ülesandel on `id` (statistika võti) ja `lemma` (oskus).
   - `sisu.test.js` — node-test, mis kontrollib KÕIKI ülesandeid, mida sisu suudab luua.
   - `app.js` — `HMoodul.registreeri({...})`: tekstid, kiibid, pakk ja joonistus. Lepingu kirjeldus on `core/moodul.js` alguses.
3. Täida kontroll-leht (`KONTROLL-LEHT.md`) punkt punkti haaval.

## Mida moodul ise EI tee

Päis, ✕ ja selle kinnitus, ‹ eelmise vaatamine, „Edasi“, edasimineku ajad, taimer, klaviatuur, peidetud vahelehe reegel, veateate aken, võistluse päevapiir, tulemuse pealkirjad, saatmine, edetabel, seaded, heli, muusika, klassiga liitumine, kutselink. Need tulevad `core/`-ist ja on kõigis moodulites ühesugused. Kui mõni neist ei sobi, muudetakse tuuma (kõigile), mitte moodulit.

## Muusika

`muusika: ["muusika-1.mp3", …]` loend; mängitakse ringiratast, alates juhuslikust. Omaloodud lugusid teeb `tools/tee_muusika.py` (lisa lugu sinna `LOOD` alla). Muudetud loole anna alati uus failinimi — service worker hoiab mp3-faile igavesti. Kui mooduli mõte on kuulamine (Kirjutaja), siis `muusika: null`.
