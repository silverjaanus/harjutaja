Seis: OOTAB MERGE'I

# Kirjutaja: kahtlaste klippide parandus (haru `valde-parandus`)

Võrdluslink: https://github.com/silverjaanus/harjutaja/compare/main...valde-parandus

Silver kuulas 16. sept välteskanni leitud 15 kahtlast klippi mõlema häälega üle (`tools/valde_kontroll.html`, nüüd saab iga häält eraldi märkida ja märked jäävad brauserisse alles).

- **Esimene kuulamine:** Kore vigased tuka, vikkurit, make, jutukas, putuka, puttuka; Charon vigased rattu, happut, putuka, puttuka.
- **Uuesti tehtud** (`audio_gen.py`, Kore ja Charon, 1 + 3 TTS-päringut). Teine kuulamine (`tools/valde_kontroll.html?fail=valde_uuesti.json`): **paranesid Kore tuka ja make.** Vigaseks jäid Kore vikkurit, jutukas, putuka, puttuka ja Charon rattu, happut, putuka, puttuka – sama viga kordub, kolmas katse samal viisil ei aita.
- **Silveri otsus:**
  - Charoni `rattu` ja `happut` kustutati – võrdlus kukub tagasi Kore klipile, mis on korras.
  - Kolmikud puduka–putuka–puttuka ja judukas–jutukas–juttukas on mängust väljas (`tools/wordbank/data/decisions.json`, `drop`), sest `putuka` ja `jutukas` on küsimussõnad. Mängus 374 sõna. Tagasi, kui saab korras hääle.
  - `vikkurit` jääb praegu (kõlab ainult vea järel). Ülejäänud vigased klipid on vanad (tagasi pööratud), neid mängus ei kasutata.
- **Lisaks tulid Charonil ära jõkki, rõttud, sõta** (varem puudu); Silver kuulas, korras. Charonil puudu ainult `rõtu`.
- **Heli vahemälu parandus (`sw.js`):** heli kaust oli telefonis igavesti vahemälus, seega uuesti tehtud klipp (ka PR #19 `rata`, `tupa`) ei jõudnud kunagi lapseni, kes oli vana juba kuulnud. Nüüd on `sw.js`-is nimekiri `HELI_MUUTUNUD`; uue versiooni aktiveerumisel võetakse need failid vahemälust maha. **Iga uuesti tehtud või kustutatud klipp tuleb sinna lisada.** Testitud Playwrightiga (muudetud klipp kadus, muud jäid).
- **`tools/test_kuulamisabi.py`:** test eeldas, et `audio2` puudub ja klipid ei mängi; nüüd on need repos ja brauser mängib need ära, seega test ootab jada lõpuni (kuni 10 s).
- Testid läbi: `test_kuulamisabi`, `test_heli`, `test_vead`, `test_voistlus`, `test_vordsus`, `test_klass`.

Järgmine võimalik töö: `putuka`, `jutukas`, `vikkurit`, `puttuka` teise hääle või teise päringuviisiga (nt üks sõna päringus, lauses sees).
