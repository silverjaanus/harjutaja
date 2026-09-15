/* Harjutaja ühine võistluse raam (raamistiku etapp 2, 15. sept 2026).

   Hoiab kokku kolm asja, mis olid igas moodulis eraldi:
   1. Päevapiir TALLINNA aja järgi. Server loeb võistluspäeva Europe/Tallinn
      kalendri järgi (supabase/migration-6.sql, competed_today); telefon,
      mille ajavöönd on vale, ei tohi lubada teist võistlust ega keelata
      õiget (Codexi ülevaatus, B33).
   2. Nupu olek: „Võistle" → esimene vajutus „Alustame?" (core/arm.js) →
      teine alustab. Tehtud päeval on nupp kinni ja all on selgitus.
   3. Serveri teade „tänane on juba tehtud" (done_today või
      competed_today) paneb päeva kinni ka siis, kui see seade ei teadnud.

   Kasutus:
     const V = HVoistlus.loo({
       D, save,                        // mooduli andmed; päev läheb D.lastCompete-i
       nupp, silt, rida,               // Võistle nupp, selle tekstikoht, selgitusrida
       n: 15, kirjeldus: "…",          // mitu ülesannet ja mida selgitusrida ütleb
       alusta: () => start("test")
     });
     V.tehtud(); V.margi(); V.joonista();
*/
(function () {
  'use strict';

  var vorming = null;
  try {
    vorming = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Tallinn', year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (e) { vorming = null; }

  /* 'YYYY-MM-DD' Eesti kalendri järgi. Ilma Intl-ita (väga vana brauser)
     jääb üle seadme enda kuupäev. */
  function tana(d) {
    d = d || new Date();
    if (vorming) {
      try {
        var osad = {};
        vorming.formatToParts(d).forEach(function (p) { osad[p.type] = p.value; });
        if (osad.year && osad.month && osad.day) return osad.year + '-' + osad.month + '-' + osad.day;
      } catch (e) {}
    }
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  var TEHTUD_RIDA = 'Võistelda saab üks kord päevas. Uus võistlus on homme.';

  function loo(o) {
    var D = o.D, save = o.save || function () {};
    var nupp = o.nupp, silt = o.silt || o.nupp, rida = o.rida, lisarida = o.lisarida || null;

    function tehtud() { return D.lastCompete === tana(); }
    function margi() { D.lastCompete = tana(); save(); joonista(); }

    function joonista() {
      nupp.classList.remove('armed');
      if (tehtud()) {
        silt.textContent = 'Võistlus tehtud';
        nupp.disabled = true;
        if (lisarida) lisarida.hidden = true;
        rida.textContent = TEHTUD_RIDA;
        return;
      }
      nupp.disabled = false;
      silt.textContent = 'Võistle';
      if (lisarida) lisarida.hidden = false;
      rida.textContent = o.kirjeldus;
    }

    var arm = HArm(nupp, {
      label: silt,
      idleText: 'Võistle',
      armedText: 'Alustame?',
      note: rida,
      message: HArm.COMPETE_MSG,
      enabled: function () { return !tehtud(); },
      action: function () { o.alusta(); },
      onDisarm: joonista
    });

    joonista();
    return { tehtud: tehtud, margi: margi, joonista: joonista, disarm: arm.disarm };
  }

  window.HVoistlus = { loo: loo, tana: tana };
})();
