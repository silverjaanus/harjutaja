# handover/ — pooleli töö, iga haru oma failis

Miks: mitu Claude'i sessiooni töötab korraga eri harudes. Kui kõik kirjutasid `Handover.md` jaotise „In Progress" algusse, läks iga merge konflikti (16. sept kolm korda järjest). Eri failid ei lähe kunagi omavahel konflikti.

## Reeglid

1. **Uus haru = uus fail** `handover/<AAAA-KK-PP>_<haru>.md`. Näide: `handover/2026-09-16_keel-heli.md`.
2. **Esimene rida on seis**, üks neist: `Seis: POOLELI`, `Seis: OOTAB MERGE'I`, `Seis: MERGE'ITUD`. Seisu muudab sama haru sessioon (või järgmine sessioon, kui näeb, et haru on mainis).
3. **Sisu:** eesmärk, mis on tehtud, täpne järgmine samm, võrdluslink (`https://github.com/silverjaanus/harjutaja/compare/main...<haru>`), testid, otsused, mis ootavad Silverit. Üks lõik rea kohta, ridu ei murta.
4. **Ära kirjuta teise haru faili** ega `Handover.md` pooleli töö jaotisesse. `Handover.md`-s muudetakse ainult püsivaid asju („Lahtised otsad", „Key Context") ja ainult oma rida.
5. **Sessiooni alguses** loe `Handover.md` ja kõik siinsed failid, mille seis ei ole `MERGE'ITUD`.
6. **Arhiiv:** `handover/arhiiv/` hoiab vanu kirjeid. Faili võib sinna tõsta siis, kui see on olnud `MERGE'ITUD` üle nädala.
