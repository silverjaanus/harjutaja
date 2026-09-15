/* Keele mooduli sisu: tunnid ja nende õpitavad read.

   Allikas: Mia 3. klassi õpik (Unit 4, Lesson 4 „Where's the museum?") ja
   tema vihik, 15. sept 2026. Repo on avalik, seega on siin ainult õpitavad
   read ja lühike lause loost — õpiku lugu tervikuna siia ei kuulu.

   Iga rida:
     id    — heli fail keel/audio/<id>.mp3
     en    — õpitav rida täpselt nii, nagu see vihikus on
     et    — eestikeelne vaste. Õpetaja kontrollib nii, et ütleb eesti keeles
             ja lapsed kirjutavad inglise keeles, seega peab vaste viima
             üheselt just selle reani (Fable 15. sept: „hoone" → building,
             „too" → that, „aknas" → in the window, „külastada" → visit).
             Algvormis read on ma-tegevusnimega ja tegusõna on ees, nagu
             inglise reas „to …".
     lugu  — sama mõte loo lauses (näidatakse tutvumisel, ei hinnata)
     lunk  — sõna, mis jääb esimeses kokkupanekus lüngaks */
(function () {
  'use strict';
  window.KEEL_TUNNID = [
    {
      id: "u4l4",
      nimi: "Where's the museum?",
      kirjeldus: "Unit 4 · Lesson 4",
      read: [
        { id: "u4l4-01", en: "to point to a big building", et: "näitama näpuga suure hoone poole", lugu: "Dad points to a big building.", lunk: "building" },
        { id: "u4l4-02", en: "An old woman opens the door.", et: "Vana naine teeb ukse lahti.", lugu: "…and an old woman opens the door.", lunk: "woman" },
        { id: "u4l4-03", en: "to walk at the seaside", et: "jalutama mere ääres", lugu: "Sula and Dad are at the seaside.", lunk: "seaside" },
        { id: "u4l4-04", en: "to see food in the window", et: "nägema aknas toitu", lugu: "She sees food in the window.", lunk: "window" },
        { id: "u4l4-05", en: "Miniature means very small.", et: "Miniatuurne tähendab väga väikest.", lugu: "'Miniature?' asks Sula. 'That means very small!'", lunk: "Miniature" },
        { id: "u4l4-06", en: "Is that the museum?", et: "Kas too on muuseum?", lugu: "'Look,' says Sula. 'Is that the museum?'", lunk: "museum" },
        { id: "u4l4-07", en: "The museum is next to the park.", et: "Muuseum on pargi kõrval.", lugu: "'The museum is next to the park,' reads Sula.", lunk: "next" },
        { id: "u4l4-08", en: "to look at the map", et: "vaatama kaarti", lugu: "Sula looks at the map.", lunk: "map" },
        { id: "u4l4-09", en: "They go into the garden.", et: "Nad lähevad aeda.", lugu: "They go into the garden…", lunk: "garden" },
        { id: "u4l4-10", en: "There are many places to visit.", et: "On palju kohti, mida külastada.", lugu: "There are many places to visit.", lunk: "places" }
      ]
    }
  ];
})();
