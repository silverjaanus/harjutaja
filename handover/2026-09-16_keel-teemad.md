Seis: OOTAB MERGE'I

# Keel: viis uut ekraanisõnade teemat ja selgem küsimus (haru `keel-teemad`)

Võrdluslink: https://github.com/silverjaanus/harjutaja/compare/main...keel-teemad. Plaan: Claude'i projektis `claude/keel-yldplaan.md`. Worktree Windowsis: `..\harjutaja-ekraan`.

**Silveri tagasiside (16. sept, telefonis, pärast `keel-ekraan` merge'i):** ülesandelause „Mine tagasi avalehele." oli segane — polnud aru saada, et midagi küsitakse ega mida teha saab, ja „Home" ei tähenda „mine tagasi", vaid avalehte või kodu. **Parandus:** väli `ul` kadus. Mullis on alati sama kuju: väike silt („Leia nupp, mis tähendab:" / „Leia sõna, mis tähendab:" / „Loe juhist ja tee, mida see ütleb:") + suurelt eesti tähendus (`et`) või ingliskeelne juhis, mulli all rida, mida teha („Vajuta seda all oleval pildil."). Sammude nimed „Leia nupp", „Leia sõna", „Loe ja tee". „Home" = „avaleht (kodu)". YouTube'i reklaam ei tee videot enam tumedaks. Täpsustus „(2 sõna)" on näha ainult kirjutamisel. Tekstid Fable'i üle vaadatud.

**Uued teemad** (Silver: Mia mängib Robloxi ja jätab mängu pooleli, kui see nõuab lugemist — õpetame ehitamise ja mängimise sõnu): Roblox (Play, Join, Friends, Chat, Reset Character, Leave, Resume, Settings), Ehitamine (Build, Place, Move, Rotate, Delete, Paint, Undo, Save), Mängu juhised (Tap, Hold, Collect, Find, Avoid, Unlock, Upgrade, Complete), Tasemed ja auhinnad (Level, Coins, Reward, Quest, Inventory, Equip, Level Up, Next), Ettevaatust (Free, Buy, Ad, Invite, Accept, Decline, Report, Block — iga seletus sisaldab turvareeglit).

**Juhiste teema uus mänguviis** (`KEkraan.juhis`): esimeses sammus on ingliskeelne juhis („Collect 3 coins!") ja laps teeb seda mänguväljal; asjad on iga kord eri kohtas. Väljad `stseen`, `siht`, `mitu` (korjamine loenduriga „2 / 3"), `hoia` (hoia sõrme 0,9 s; lühike vajutus → „Hoia sõrme kauem all."). Vale asi → „Juhis oli: „…" ehk „…"". Õige järel kõlab terve juhis (`keel/audio/s/<juhise tähed>.mp3`, nt `collectcoins.mp3`).

**Testid:** `node keel/sonad.test.js` (983 kontrolli), `tools/test_keel_ekraan.py 8806` (iga teema ekraanil on iga sõna nupp täpselt korra; juhis, hoidmine, korjamine), `tools/test_keel.py 8809`, homoglüüfid PUHAS. **Heli:** `tools/keel_audio.py` teeb ka juhised (numbrid võrreldakse sõnadena).

**Järgmine samm:** Silver proovib telefonis. Lahtine: kooli ja ekraani ühine sõnaajalugu; teemad Mia teistest mängudest.
