/* Keele mooduli teine rada: sõnad, mida laps iga päev ekraanil näeb.

   Plaan: Claude'i projektis claude/keel-yldplaan.md (Silver 15.–16. sept).
   Laps näeb joonistatud ekraani (ekraanid.js) ja eesti tähendust ning
   vajutab sama nuppu inglise keeles; siis loeb sama sõna ilma pildita, kirjutab kuulmise
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
     teeb   — mida nupp teeb; näidatakse vajutuse järel
     markus — valikuline selgitus (nt kui eesti keeles öeldakse sama sõna)
   Juhiste teemal (juhised: true) lisaks juhis, juhisEt, stseen, siht, mitu, hoia. */
(function () {
  'use strict';
  window.KEEL_TEEMAD = [
    {
      id: "youtube",
      nimi: "YouTube",
      kus: "YouTube’is",
      ekraan: "youtube",
      sonad: [
        { id: "yt-home", en: "Home", et: "avaleht (kodu)",
          teeb: "„Home“ tähendab kodu. Siin viib see avalehele, kus on palju videoid." },
        { id: "yt-search", en: "Search", et: "otsi",
          teeb: "„Search“ tähendab otsimist. Siia kirjutad, mida tahad leida." },
        { id: "yt-subscribe", en: "Subscribe", et: "telli (kanal)",
          teeb: "„Subscribe“ tähendab kanali tellimist. Siis näed selle kanali uusi videoid. See on tasuta.",
          markus: "Eesti keeles öeldakse tihti ka lihtsalt „subscribe“." },
        { id: "yt-like", en: "Like", et: "meeldib",
          teeb: "„Like“ tähendab „meeldib“. Nii ütled, et video meeldis sulle.",
          markus: "Eesti keeles öeldakse ka „laikima“ – see sõna tuleb inglise keelest." },
        { id: "yt-share", en: "Share", et: "jaga (videot)",
          teeb: "„Share“ tähendab jagamist. Nii saad video teistele saata." },
        { id: "yt-download", en: "Download", et: "laadi alla",
          teeb: "„Download“ tähendab allalaadimist. Video salvestatakse telefoni, et seda vaadata ka ilma internetita.",
          markus: "YouTube’is on allalaadimine tasuline." },
        { id: "yt-comments", en: "Comments", et: "kommentaarid",
          teeb: "„Comments“ on kommentaarid ehk see, mida inimesed video kohta kirjutasid." },
        { id: "yt-skip", en: "Skip", et: "jäta vahele",
          teeb: "„Skip“ tähendab vahelejätmist. Reklaam kaob ja video läheb edasi." }
      ]
    },
    {
      id: "minecraft",
      nimi: "Minecraft",
      kus: "Minecraftis",
      ekraan: "minecraft",
      sonad: [
        { id: "mc-play", en: "Play", et: "mängi",
          teeb: "„Play“ tähendab mängimist. Selle nupu all on sinu maailmad ja saad mängima hakata." },
        { id: "mc-settings", en: "Settings", et: "seaded",
          teeb: "„Settings“ tähendab seadeid. Seal saad muuta näiteks heli." },
        { id: "mc-create", en: "Create New", et: "loo uus",
          teeb: "„Create New“ tähendab „loo uus“. Nii teed uue maailma." },
        { id: "mc-survival", en: "Survival", et: "ellujäämine",
          teeb: "„Survival“ tähendab ellujäämist. Pead ise toitu ja tööriistu leidma. Koletised võivad sind rünnata." },
        { id: "mc-creative", en: "Creative", et: "loominguline",
          teeb: "„Creative“ tähendab loomingulist. Kõik klotsid on olemas ja saad vabalt ehitada." },
        { id: "mc-easy", en: "Easy", et: "lihtne",
          teeb: "„Easy“ tähendab lihtsat. Koletised teevad vähem haiget." },
        { id: "mc-hard", en: "Hard", et: "raske",
          teeb: "„Hard“ tähendab rasket. Koletised teevad rohkem haiget." },
        { id: "mc-respawn", en: "Respawn", et: "ärka uuesti ellu",
          teeb: "„Respawn“ tähendab mängus uuesti ellu ärkamist. Sinu tegelane tuleb mängu tagasi.",
          markus: "Eesti keeles ütlevad mängijad ka „respawn“." }
      ]
    },
    {
      id: "roblox",
      nimi: "Roblox",
      kus: "Robloxis",
      ekraan: "roblox",
      sonad: [
        { id: "rb-play", en: "Play", et: "mängi",
          teeb: "„Play“ tähendab mängimist. Selle nupuga läheb mäng käima." },
        { id: "rb-join", en: "Join", et: "liitu",
          teeb: "„Join“ tähendab liitumist. Nii lähed sõbraga samasse mängu." },
        { id: "rb-friends", en: "Friends", et: "sõbrad",
          teeb: "„Friends“ tähendab sõpru. Seal on inimesed, kellega oled Robloxis sõbraks saanud." },
        { id: "rb-chat", en: "Chat", et: "vestlus",
          teeb: "„Chat“ tähendab vestlust. Seal kirjutavad mängijad üksteisele.",
          markus: "Eesti keeles öeldakse ka „chat“." },
        { id: "rb-reset", en: "Reset Character", et: "alusta tegelasega uuesti (2 sõna)",
          teeb: "„Reset Character“ tähendab tegelase uuesti alustamist: tegelane kaob ja ilmub uuesti mängu alguskohta. Seda tehakse, kui tegelane jääb kuhugi kinni." },
        { id: "rb-leave", en: "Leave", et: "lahku",
          teeb: "„Leave“ tähendab lahkumist. Sa lähed mängust välja tagasi Robloxi avalehele." },
        { id: "rb-resume", en: "Resume", et: "jätka (pärast pausi)",
          teeb: "„Resume“ tähendab jätkamist. Menüü läheb kinni ja mäng jätkub." },
        { id: "rb-settings", en: "Settings", et: "seaded",
          teeb: "„Settings“ tähendab seadeid. Seal saad muuta näiteks heli." }
      ]
    },
    {
      id: "ehitamine",
      nimi: "Ehitamine",
      kus: "ehitusmängus",
      ekraan: "ehitamine",
      sonad: [
        { id: "eh-build", en: "Build", et: "ehita",
          teeb: "„Build“ tähendab ehitamist. Selle nupuga saad ehitama hakata." },
        { id: "eh-place", en: "Place", et: "paiguta (pane paika)",
          teeb: "„Place“ tähendab paigutamist ehk millegi oma kohale panemist." },
        { id: "eh-move", en: "Move", et: "liiguta",
          teeb: "„Move“ tähendab liigutamist. Nii viid asja teise kohta." },
        { id: "eh-rotate", en: "Rotate", et: "pööra ringi (ehitamisel)",
          teeb: "„Rotate“ tähendab pööramist. Asi keerab ringi. Ehitamisel öeldakse „rotate“, mitte „turn“." },
        { id: "eh-delete", en: "Delete", et: "kustuta",
          teeb: "„Delete“ tähendab kustutamist. Asi kaob ära." },
        { id: "eh-paint", en: "Paint", et: "värvi",
          teeb: "„Paint“ tähendab värvimist. Sein saab uue värvi." },
        { id: "eh-undo", en: "Undo", et: "võta tagasi",
          teeb: "„Undo“ tähendab tagasivõtmist. Viimane asi, mida tegid, kaob." },
        { id: "eh-save", en: "Save", et: "salvesta",
          teeb: "„Save“ tähendab salvestamist. Sinu ehitis jääb alles." }
      ]
    },
    {
      /* Juhiste teema: esimeses sammus on ingliskeelne mängujuhis ja laps teeb
         seda, mida juhis ütleb (ekraanid.js: juhis). stseen = asjad väljal,
         siht = mida puudutada, mitu = mitu korda, hoia = hoia sõrme all. */
      id: "juhised",
      nimi: "Mängu juhised",
      kus: "mängu juhistes",
      ekraan: "juhis",
      juhised: true,
      sonad: [
        { id: "ju-tap", en: "Tap", et: "puuduta",
          juhis: "Tap the star!", juhisEt: "Puuduta tähte!",
          stseen: ["star", "coin", "key", "heart"], siht: "star",
          teeb: "„Tap“ tähendab puudutamist: vajuta sõrmega korraks." },
        { id: "ju-hold", en: "Hold", et: "hoia (all)",
          juhis: "Hold the button!", juhisEt: "Hoia nuppu all!",
          stseen: ["button", "star", "coin"], siht: "button", hoia: true,
          teeb: "„Hold“ tähendab hoidmist: hoia sõrme kauem nupu peal." },
        { id: "ju-collect", en: "Collect", et: "korja kokku",
          juhis: "Collect 3 coins!", juhisEt: "Korja 3 münti kokku!",
          stseen: ["coin", "star", "coin", "key", "coin", "coin", "heart"], siht: "coin", mitu: 3,
          teeb: "„Collect“ tähendab kokku korjamist. Mängus korjad näiteks münte." },
        { id: "ju-find", en: "Find", et: "leia",
          juhis: "Find the key!", juhisEt: "Leia võti!",
          stseen: ["bush", "gem", "bush", "key", "star", "bush"], siht: "key",
          teeb: "„Find“ tähendab leidmist." },
        { id: "ju-avoid", en: "Avoid", et: "väldi (hoia eemale)",
          juhis: "Avoid the lava!", juhisEt: "Hoia laavast eemale!",
          stseen: ["lavapath", "grasspath"], siht: "grasspath",
          teeb: "„Avoid“ tähendab vältimist ehk eemale hoidmist. Laavasse ei tohi astuda." },
        { id: "ju-unlock", en: "Unlock", et: "tee lukust lahti",
          juhis: "Unlock the door!", juhisEt: "Tee uks lukust lahti!",
          stseen: ["opendoor", "lockeddoor", "chest"], siht: "lockeddoor",
          teeb: "„Unlock“ tähendab lukust lahti tegemist." },
        { id: "ju-upgrade", en: "Upgrade", et: "tee paremaks",
          juhis: "Upgrade your sword!", juhisEt: "Tee oma mõõk paremaks!",
          stseen: ["shield", "sword", "bow", "coin"], siht: "sword",
          teeb: "„Upgrade“ tähendab paremaks tegemist. Asi läheb tugevamaks." },
        { id: "ju-complete", en: "Complete", et: "vii lõpuni (tase)",
          juhis: "Complete the level: tap the flag!", juhisEt: "Vii tase lõpuni: puuduta lippu!",
          stseen: ["chest", "flag", "star"], siht: "flag",
          teeb: "„Complete“ tähendab lõpuni viimist ehk lõpetamist." }
      ]
    },
    {
      id: "edasi",
      nimi: "Tasemed ja auhinnad",
      kus: "mängus",
      ekraan: "edasi",
      sonad: [
        { id: "ed-level", en: "Level", et: "tase",
          teeb: "„Level“ tähendab taset. Mida suurem number, seda kaugemale oled jõudnud." },
        { id: "ed-coins", en: "Coins", et: "mündid",
          teeb: "„Coins“ tähendab münte. Nendega saab mängus asju osta." },
        { id: "ed-reward", en: "Reward", et: "auhind (mängus hea töö eest)",
          teeb: "„Reward“ tähendab auhinda, mille saad hea töö eest." },
        { id: "ed-quest", en: "Quest", et: "ülesanne (mängus)",
          teeb: "„Quest“ tähendab mängus ülesannet, mille pead täitma.",
          markus: "Mängijad ütlevad ka „kvest“." },
        { id: "ed-inventory", en: "Inventory", et: "inventar (kõik su asjad)",
          teeb: "„Inventory“ tähendab inventari ehk kõiki asju, mis sul mängus kaasas on.",
          markus: "Mängijad ütlevad ka „inventory“." },
        { id: "ed-equip", en: "Equip", et: "võta kätte või pane selga",
          teeb: "„Equip“ tähendab millegi kasutusse võtmist: tegelane võtab asja kätte või paneb selga." },
        { id: "ed-levelup", en: "Level Up", et: "tõuse uuele tasemele (2 sõna)",
          teeb: "„Level Up“ tähendab, et jõudsid järgmisele tasemele." },
        { id: "ed-next", en: "Next", et: "järgmine",
          teeb: "„Next“ tähendab järgmist. Nii lähed edasi." }
      ]
    },
    {
      id: "ettevaatust",
      nimi: "Ettevaatust",
      kus: "mängus",
      ekraan: "ettevaatust",
      sonad: [
        { id: "oh-free", en: "Free", et: "tasuta",
          teeb: "„Free“ tähendab tasuta. Paljud mängud ongi tasuta. Aga kui keegi lubab tasuta Robuxi („Free Robux“), on see pettus – ära vajuta ja räägi vanemale." },
        { id: "oh-buy", en: "Buy", et: "osta",
          teeb: "„Buy“ tähendab ostmist. Enne ostmist küsi alati vanemalt luba." },
        { id: "oh-ad", en: "Ad", et: "reklaam",
          teeb: "„Ad“ tähendab reklaami. Reklaam tahab, et sa midagi ostaksid või alla laadiksid." },
        { id: "oh-invite", en: "Invite", et: "kutse",
          teeb: "„Invite“ tähendab kutset. Ära võta võõra inimese kutset vastu." },
        { id: "oh-accept", en: "Accept", et: "võta vastu",
          teeb: "„Accept“ tähendab vastuvõtmist. Vajuta seda ainult siis, kui tunned seda inimest päriselt." },
        { id: "oh-decline", en: "Decline", et: "keeldu",
          teeb: "„Decline“ tähendab keeldumist. Nii ütled kutsele ei. Võõrale võib alati ei öelda." },
        { id: "oh-report", en: "Report", et: "teata (halvast käitumisest)",
          teeb: "„Report“ tähendab teatamist. Nii annad mängu tegijatele teada, et keegi käitub halvasti. Räägi sellest ka vanemale." },
        { id: "oh-block", en: "Block", et: "blokeeri",
          teeb: "„Block“ tähendab blokeerimist. See mängija ei saa sulle enam kirjutada." }
      ]
    }
  ];
})();
