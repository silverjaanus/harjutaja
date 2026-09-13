# Supabase

Harjutaja kasutab Supabase'i klasside, mängijate ja edetabelite jaoks. Kliendil ei ole tabelitele otsest ligipääsu: RLS on sees ilma poliitikateta ja kogu liiklus käib RPC-funktsioonide kaudu, mis kontrollivad mängija salakoodi.

**Alusskeem ja migratsioonid 2–5 elavad pargitud repos** `github.com/silverjaanus/korrutaja` (`supabase.sql`, `supabase-migration-2..5.sql`). Neid ei ole siia kopeeritud, sest need on juba tootebaasi peal ja topeltkoopia tekitaks küsimuse, kumb on õige. Uued migratsioonid alates kuuendast on siin.

## Migratsioonid

| Fail | Mida teeb |
|---|---|
| `migration-6.sql` | Andmebaas hakkab mooduleid eristama: `sessions.module`, tabel `player_modules`, ning `competed_today` / `report_session` / `class_board` saavad `p_module` parameetri vaikeväärtusega `'korrutaja'`. |

## Kuidas migratsiooni rakendada

1. Testi kohalikus Postgres 16-s: laadi `supabase.sql` ja migratsioonid 2–5 tühja andmebaasi, siis uus migratsioon. Testi kahel viisil — tühjale baasile ja baasile, kus on juba mängijaid ja ringe, sest just teine tee jookseb tootebaasis.
2. Supabase SQL Editor kasutab Monaco't, nii et teksti saab sisse panna `window.monaco.editor.getModels()[0].setValue(sql)` ja siis vajutada Run.
3. **Enne Run'i võrdle SHA-256 summat** sisestatud teksti ja testitud faili vahel. Reavahetused normaliseeri (`\r\n` → `\n`) enne räsimist.
4. Pärast Run'i kontrolli, et vana klient töötab: `class_board(p_player_id, p_secret)` kahe parameetriga peab tagastama sama kuju, mis enne.

## Reeglid, mida mitte unustada

- **Vana klient elab telefonides edasi.** Iga uus funktsiooniparameeter peab olema vaikeväärtusega ja vana allkiri tuleb `drop function`-iga maha võtta, muidu jääb PostgRESTile kaks kandidaati.
- **Ülekirjutamise asemel lisa.** Migratsioon ei tohi ridu kustutada ega veerge maha võtta; `players` vanad veerud jäävad alles, kuni kindlalt keegi enam vana index.html-i ei jooksuta.
- **`delete` ilma `where`-tingimuseta blokeerib Supabase'i klassifikaator** — kirjuta kustutus alati täpse tingimusega.
