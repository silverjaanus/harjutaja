/* Harjutaja ühised eelistused: heli, muusika ja nimi (raamistiku etapp 1).

   Enne 15. septembrit oli igal moodulil oma heli lipp (kell_v1.sfx,
   kirjutaja_v1.sfx, teisendaja_v1.sfx, korrutaja_v1.settings.sfx). Laps,
   kes lülitas heli Kellas välja, kuulis seda Korrutajas ikka. Nüüd on üks
   eelistus kõigile moodulitele (Silveri otsus 15. sept).

   Üleminek on ühekordne ja ettevaatlik: kui heli oli KUSKIL väljas, jääb see
   väljas — vaikust ei tohi keegi kogemata kaotada. Muusika ja nimi tulevad
   Korrutajast, sest ainult seal need olid. Vanu välju ei kustutata: vana
   kood, mis telefonis veel elab, loeb neid edasi. */
(function () {
  var KEY = "harjutaja_prefs_v1";
  var VAIKE = { sfx: true, music: false, name: "" };
  var kuulajad = [];

  function loe(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function kirjuta(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }

  function ylevii() {
    var p = { sfx: VAIKE.sfx, music: VAIKE.music, name: VAIKE.name };
    ["kell_v1", "kirjutaja_v1", "teisendaja_v1"].forEach(function (k) {
      var d = loe(k); if (d && d.sfx === false) p.sfx = false;
    });
    var kr = loe("korrutaja_v1");
    var s = kr && kr.settings;
    if (s) {
      if (s.sfx === false) p.sfx = false;
      if (s.music === true) p.music = true;
      if (typeof s.name === "string") p.name = s.name;
    }
    return p;
  }

  var P = loe(KEY);
  if (!P || typeof P !== "object") { P = ylevii(); kirjuta(P); }
  for (var k in VAIKE) if (!(k in P)) P[k] = VAIKE[k];

  function teata(nimi) { kuulajad.slice().forEach(function (f) { try { f(nimi, P[nimi]); } catch (e) {} }); }

  window.HPrefs = {
    get: function (nimi) { return P[nimi]; },
    set: function (nimi, v) {
      if (P[nimi] === v) return;
      P[nimi] = v; kirjuta(P); teata(nimi);
    },
    /* fn(nimi, väärtus) — kutsutakse iga muutuse peale, ka teisest vahelehest. */
    on: function (fn) { kuulajad.push(fn); },
    KEY: KEY
  };

  /* Teises vahelehes muudetud eelistus jõuab ka siia. */
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY || !e.newValue) return;
    var uus; try { uus = JSON.parse(e.newValue); } catch (x) { return; }
    for (var n in VAIKE) if (n in uus && uus[n] !== P[n]) { P[n] = uus[n]; teata(n); }
  });
})();
