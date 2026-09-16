Seis: MERGE'ITUD (PR #18)

# Keel: neli uut teemat seadmetest (haru `keel-seadmed`)

Võrdluslink: https://github.com/silverjaanus/harjutaja/compare/main...keel-seadmed

Silveri suund: konkreetseid mänge rohkem pole; õpetame sõnu, mida on vaja PS5-ga mängides, telefonis ja internetis hakkama saamiseks.

- Uued teemad (`keel/teemad.js`, ekraanid `keel/ekraanid.js`, stiil `keel/keel.css`), igas 8 sõna:
  - **Konsool**: Press, Start, Continue, New Game, Load, Retry, Options, Quit.
  - **Telefon küsib**: Allow, Don't Allow, Update, Install, Open, Delete, Cancel, Turn On.
  - **Veebileht**: Log In, Sign Up, Username, Password, Menu, Close, Accept All, Log Out.
  - **Kui midagi ei tööta**: Loading, Error, Try Again, No Internet, Wait, Restart, Low Battery, Help.
- Küsimuse silt on nüüd „Leia ekraanilt, mis tähendab:" (sammu nimi „Leia ekraanilt"), sest osa sihte on teated, mitte nupud.
- Ülakoma lubatud ingliskeelses sõnas („Don't Allow"); seletuses näidatakse kui ’.
- Tekstid vaatas üle Fable.
- Testid: `node keel/sonad.test.js` (kontrollib nüüd ka, et igal ekraanil on iga sõna nupp), `tools/test_keel_ekraan.py`, `tools/test_keel.py`, `tools/scan_homoglyphs.py keel core` – kõik läbi.
- `sw.js` VERSION → h-202609171200.
- Helid: uued failid `keel/audio/s/` all (genereeritud Windowsis `tools\keel_audio.py`).
