/* Keele mooduli teine rada: sõnad, mida laps iga päev ekraanil näeb.

   Plaan: Claude'i projektis claude/keel-yldplaan.md (Silver 15.–16. sept).
   Laps näeb joonistatud ekraani (ekraanid.js), saab eestikeelse ülesande ja
   vajutab õiget nuppu; siis loeb sama sõna ilma pildita, kirjutab kuulmise
   järgi ja tõlgib (sonad.js). Tõlgitakse iga sõna (Silver 16. sept) — kui
   eesti keeles öeldakse ka inglise sõnaga, on see selgituses kirjas.
   Tekstid on Fable'i üle vaadatud (16. sept).

   Iga teema:
     kus    — seesütlev kääne, näidatakse tõlkeülesandes („YouTube'is")
   Iga sõna:
     id     — statistika võti
     en     — täpselt see, mis ekraanil nupul kirjas on; heli
              keel/audio/s/<en väiketähtedega, ilma tühikuteta>.mp3
     et     — tõlkeülesande vaste; peab viima üheselt just selle sõnani.
              Sulgudes osa on täpsustus, mida ei tõlgita („telli (kanal)").
     ul     — ülesanne nupuvajutuses
     teeb   — mida nupp teeb; näidatakse vajutuse järel
     markus — valikuline selgitus (nt kui eesti keeles öeldakse sama sõna) */
(function () {
  'use strict';
  window.KEEL_TEEMAD = [
    {
      id: "youtube",
      nimi: "YouTube",
      kus: "YouTube’is",
      ekraan: "youtube",
      sonad: [
        { id: "yt-home", en: "Home", et: "avaleht", ul: "Mine tagasi avalehele.",
          teeb: "„Home“ tähendab kodu. Siin viib see avalehele, kus on palju videoid." },
        { id: "yt-search", en: "Search", et: "otsi", ul: "Otsi videot, mida tahad vaadata.",
          teeb: "„Search“ tähendab otsimist. Siia kirjutad, mida tahad leida." },
        { id: "yt-subscribe", en: "Subscribe", et: "telli (kanal)", ul: "Telli kanal, et näha selle uusi videoid.",
          teeb: "„Subscribe“ tähendab kanali tellimist. Siis näed selle kanali uusi videoid. See on tasuta.",
          markus: "Eesti keeles öeldakse tihti ka lihtsalt „subscribe“." },
        { id: "yt-like", en: "Like", et: "meeldib", ul: "Näita, et video meeldib sulle.",
          teeb: "„Like“ tähendab „meeldib“. Nii ütled, et video meeldis sulle.",
          markus: "Eesti keeles öeldakse ka „laikima“ – see sõna tuleb inglise keelest." },
        { id: "yt-share", en: "Share", et: "jaga (videot)", ul: "Saada video sõbrale.",
          teeb: "„Share“ tähendab jagamist. Nii saad video teistele saata." },
        { id: "yt-download", en: "Download", et: "laadi alla", ul: "Salvesta video telefoni, et vaadata seda ka ilma internetita.",
          teeb: "„Download“ tähendab allalaadimist. Video salvestatakse telefoni, et seda vaadata ka ilma internetita.",
          markus: "YouTube’is on allalaadimine tasuline." },
        { id: "yt-comments", en: "Comments", et: "kommentaarid", ul: "Vaata, mida teised video kohta kirjutasid.",
          teeb: "„Comments“ on kommentaarid ehk see, mida inimesed video kohta kirjutasid." },
        { id: "yt-skip", en: "Skip", et: "jäta vahele", ul: "Jäta reklaam vahele.",
          teeb: "„Skip“ tähendab vahelejätmist. Reklaam kaob ja video läheb edasi." }
      ]
    },
    {
      id: "minecraft",
      nimi: "Minecraft",
      kus: "Minecraftis",
      ekraan: "minecraft",
      sonad: [
        { id: "mc-play", en: "Play", et: "mängi", ul: "Hakka mängima.",
          teeb: "„Play“ tähendab mängimist. Selle nupu all on sinu maailmad ja saad mängima hakata." },
        { id: "mc-settings", en: "Settings", et: "seaded", ul: "Ava seaded, et muuta heli.",
          teeb: "„Settings“ tähendab seadeid. Seal saad muuta näiteks heli." },
        { id: "mc-create", en: "Create New", et: "loo uus", ul: "Tee uus maailm.",
          teeb: "„Create New“ tähendab „loo uus“. Nii teed uue maailma." },
        { id: "mc-survival", en: "Survival", et: "ellujäämine", ul: "Vali mäng, kus pead ise toitu ja tööriistu leidma.",
          teeb: "„Survival“ tähendab ellujäämist. Pead ise toitu ja tööriistu leidma. Koletised võivad sind rünnata." },
        { id: "mc-creative", en: "Creative", et: "loominguline", ul: "Vali mäng, kus kõik klotsid on kohe olemas.",
          teeb: "„Creative“ tähendab loomingulist. Kõik klotsid on olemas ja saad vabalt ehitada." },
        { id: "mc-easy", en: "Easy", et: "lihtne", ul: "Tee mäng lihtsaks.",
          teeb: "„Easy“ tähendab lihtsat. Koletised teevad vähem haiget." },
        { id: "mc-hard", en: "Hard", et: "raske", ul: "Tee mäng raskeks.",
          teeb: "„Hard“ tähendab rasket. Koletised teevad rohkem haiget." },
        { id: "mc-respawn", en: "Respawn", et: "ärka uuesti ellu", ul: "Tegelane sai surma. Ärka uuesti ellu.",
          teeb: "„Respawn“ tähendab mängus uuesti ellu ärkamist. Sinu tegelane tuleb mängu tagasi.",
          markus: "Eesti keeles ütlevad mängijad ka „respawn“." }
      ]
    }
  ];
})();
