Seis: OOTAB MERGE'I

# supabase-elus — Supabase'i baas ei tohi pausile minna

**Eesmärk.** 24. sept tuli Supabase'ilt kiri: projekt (ID `cidkhkxivrntfukadzip`, tollal nimega „korrutaja", 24. sept nimetati Supabase'is ümber „harjutajaks" — ID ja URL jäid samaks, äpis pole midagi vaja muuta) on nädal otsa vähe päringuid saanud ja läheb varsti pausile. See on Harjutaja **ainus** andmebaas — kõik moodulid kasutavad seda (`core/config.js`, `korrutaja/config.json`). Pausil lakkavad töötamast liitumine, edetabelid, veateated ja võistlustulemuste saatmine (need jäävad telefoni `outbox`'i). Harjutamine töötab edasi, sest see serverit ei puuduta — just seepärast baas vaiksel nädalal tühjaks jääbki.

**Mis on tehtud.** Uus töövoog `.github/workflows/supabase-elus.yml`: iga kahe päeva tagant 05.17 UTC kolm lugemispäringut (`rpc/school_suggest`) avaliku võtmega, mis loetakse `korrutaja/config.json`-ist. Vastus peab olema HTTP 200, muidu läheb töö punaseks ja GitHub saadab kirja. HTTP 540 tähendab, et projekt on juba pausil — siis Supabase'i lehelt „Restore project". Töövoogu saab käivitada ka käsitsi (Actions → Supabase ärkvel → Run workflow). Andmeid ei muudeta, migratsiooni pole vaja.

**Kontrollitud.** YAML loeb Pythonis (`schedule` + `workflow_dispatch`). Sama päring käsitsi Windowsist: HTTP 200. 24. sept hommikul pingiti baasi käsitsi kolm korda, et pausi edasi lükata.

**Täpne järgmine samm.** Silver merge'ib: https://github.com/silverjaanus/harjutaja/compare/main...supabase-elus — ajastatud töö käivitub ainult `main`-ist. Pärast merge'i käivita töö korra käsitsi ja vaata, et see on roheline.

**Kaks riski.** (1) Supabase ei ütle täpset päringute piiri („sufficient activity"). Kui hoiatuskiri tuleb uuesti, tuleb lisada kirjutav päring (vajab migratsiooni: väike tabel ja RPC, mis uuendab ajatemplit). (2) GitHub peatab ajastatud töö, kui repos pole 60 päeva tegevust olnud, ja saadab enne kirja — siis tuleb töö Actions-lehelt uuesti sisse lülitada.

**Kõrvale jäetud.** Pro plaan ($25 kuus) — liiga kallis selle jaoks. Vercel cron — toob staatilisse saiti serverifunktsiooni. Windowsi ajastaja — arvuti peab olema sees.
