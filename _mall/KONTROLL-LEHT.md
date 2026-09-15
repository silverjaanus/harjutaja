# Uue mooduli kontroll-leht

Iga punkt enne esimest merge'i. Kui mõni punkt ei kehti, kirjuta Handover.md-sse, miks.

## Sisu

- [ ] Kõik ülesanded, mida `sisu.js` suudab luua, on node-testis läbi käidud (`node <id>/sisu.test.js`). Test kontrollib ka, et vale vastus ei läbi ja et valikutes on õige vastus täpselt üks kord.
- [ ] Tasemed kuhjuvad: kõrgemal tasemel on ka madalamate ülesandeid (Silveri otsus 15. sept). Märkus „Igal tasemel on ka eelmiste tasemete ülesandeid.“
- [ ] Ülesandel on `id` ja `lemma`. Sama ülesanne annab alati sama `id` (muidu ei saa midagi selgeks).
- [ ] Vihje ütleb, KUIDAS lahendada, mitte ainult õiget vastust.
- [ ] Tühi vastus (kogemata vajutus) ei ole vale vastus — `tyhi()` konks, kui laps kirjutab.

## Keel

- [ ] Iga tekst on lapsele (8–11 a) arusaadav ja grammatiliselt õige. **Kõik tekstid on Fable'ile näidatud** ja vastus on `claude/`-dokis kirjas.
- [ ] `asjad` vormid on õiged: `yks` („1 tehe“), `mitu` („12 tehet“, osastav), `mitmus` („Selged tehted“).
- [ ] `kus` on seesütlevas käändes (kus?, „Näidises“): see läheb lausesse „Kas lõpetad ringi …?“ ja kutsesse.
- [ ] Tehe või ühik ei murdu rea lõpus pooleks (püsitühik ` `).
- [ ] Ühised laused (klass, võistlus, tulemus) tulevad tuumast. Kui mõni neist ei sobi, muuda tuuma, mitte moodulit.

## Võistlus

- [ ] Võistluse reeglid (mitu ülesannet, mitu sekundit, milline tase) on **Silveri otsus** ja kirjas `claude/moodulite-otsused.md`-s.
- [ ] Võistlus on kõigil ühesugune: pakk ei sõltu lapse valikutest ega statistikast.
- [ ] Kirjeldus ütleb arvu ja aja: „15 liitmistehet, iga tehte jaoks 10 sekundit. …“
- [ ] Kui võistlust ei ole, `voistlus: null` (siis ka edetabelis Rekordi sakki pole).

## Server

- [ ] Mooduli `id` on lisatud Supabase'i nimekirjadesse uue migratsiooniga (`supabase/migration-N.sql`): `sessions_module_chk`, `player_modules`, `report_session`, `class_board`, `issues_module_chk`, `report_issue`. Ilma selleta vastab server `input` ja tulemusi ei salvestata.
- [ ] Migratsioon on Silveri käivitatud ENNE, kui moodul avalehele läheb.
- [ ] `op` (teemarühm) vastab mustrile `^[a-z_]{2,16}$`.

## Välimus ja maskott

- [ ] Aktsentvärv on oma ja erineb teistest moodulitest (Kell kollane, Teisendaja roheline, Korrutaja sinine, mall lilla).
- [ ] Maskotil on meeleolud `wave`, `happy`, `cheer`, `kind` ja pea-kuju. Vea peale ei ole ta kurb.
- [ ] `prefers-reduced-motion` peatab maskoti animatsioonid.
- [ ] Ekraanipildid 400 px laiusel: avaleht, mäng (õige ja vale vastus koos vihjega), tulemus, edetabel, seaded. Midagi ei lähe üle ääre.

## Harjutaja külge

- [ ] Avalehel (`index.html`) on mooduli kaart maskotiga (vt teisi kaarte) ja „Tulekul“ nimekirjast on moodul ära võetud.
- [ ] `sw.js`: `VERSION` on tõstetud ja kõik mooduli failid on `CORE` nimekirjas (mp3-e mitte — need tulevad vahemällu esimesel kuulamisel).
- [ ] Muusika: omaloodud (`tools/tee_muusika.py`) või litsents on kirjas `claude/harjutaja-ulevaade.md`-s.
- [ ] Ilma netita töötab: ava moodul, lülita võrk välja, laadi uuesti.

## Testid

- [ ] `tools/test_<id>.py <port>` (Playwright, oma port): ring algab, õige ja vale vastus, „Edasi“, tulemus, „Harjuta neid …“, võistluse kinnitus, JS-vigu pole.
- [ ] Kõik olemasolevad testid on endiselt läbi (nimekiri: Handover.md).
- [ ] `python3 tools/scan_homoglyphs.py <id> core …` ütleb PUHAS.

## Pärast

- [ ] `Handover.md` ja `claude/harjutaja-ulevaade.md` on uuendatud.
- [ ] Haru on GitHubis ja Silver sai võrdluslingi.
