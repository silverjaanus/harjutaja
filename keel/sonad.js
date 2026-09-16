/* Ekraanisõnade puhas loogika (ilma DOM-ita, node'ist testitav: keel/sonad.test.js).

   Iga sõna läbib neli sammu (plaan: claude/keel-yldplaan.md):
     vajuta — joonistatud ekraan koos piltidega, eestikeelne ülesanne,
              laps vajutab õiget nuppu
     loe    — samad sõnad hallidel nuppudel ilma piltideta; laps peab
              sõna lugema, mitte nupu kohta või pilti mäletama
     kuula  — sõna kõlab, eesti vaste on näha, laps kirjutab
     tolgi  — ainult eesti vaste, laps kirjutab inglise keeles
   Esimesed kolm on läbitud ühe õigega. „tolgi" on selge alles siis, kui see
   on läinud õigesti ilma kuulamisabita kahes eri ringis — sama reegel mis
   lausetel (lause.js). Ring ja statistika tulevad lause.js-ist. */
(function (root) {
  'use strict';
  var L = root.KLause || (typeof require !== 'undefined' ? require('./lause.js') : null);

  var SAMMUD = ['vajuta', 'loe', 'kuula', 'tolgi'];
  var RINGIS_SONU = 5, LOE_VALIKUID = 6;

  /* „telli (kanal)" → põhiosa „telli", täpsustus „kanal". Täpsustust ei tõlgita. */
  function etOsad(et) {
    var m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(String(et || ''));
    return m ? { pohi: m[1], tapsustus: m[2] } : { pohi: String(et || ''), tapsustus: '' };
  }

  /* Heli failinimi: väiketähed, ainult a–z („Create New" → createnew). */
  function heliNimi(en) { return String(en).toLowerCase().replace(/[^a-z]/g, ''); }

  function kontrolli(sona, vastus) { return L.kontrolli(sona.en, vastus); }

  /* Loe-sammu nupud: õige + teised sama teema sõnad, kokku kuni n, segamini. */
  function valikud(sona, teema, n, juhus) {
    n = n || LOE_VALIKUID;
    var teised = teema.sonad.filter(function (s) { return s.id !== sona.id; });
    L.segamini(teised, juhus);
    var out = [sona].concat(teised.slice(0, n - 1));
    return L.segamini(out, juhus);
  }

  function selge(stats, id) { return L.selge(stats, id, SAMMUD); }
  function samm(stats, id) { return L.samm(stats, id, SAMMUD); }
  function selgeid(stats, teemad) {
    return teemad.reduce(function (n, t) {
      return n + t.sonad.filter(function (s) { return selge(stats, s.id); }).length;
    }, 0);
  }

  function ring(teema, stats, opts) {
    opts = opts || {};
    return new L.Ring(teema.sonad, stats, {
      ringId: opts.ringId, fookus: opts.fookus, sammud: SAMMUD, liik: 'sona', ridu: opts.ridu || RINGIS_SONU
    });
  }

  var api = {
    SAMMUD: SAMMUD, RINGIS_SONU: RINGIS_SONU, etOsad: etOsad, heliNimi: heliNimi, kontrolli: kontrolli,
    valikud: valikud, selge: selge, samm: samm, selgeid: selgeid, ring: ring
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KSonad = api;
})(this);
