/* Harjutaja ühine taustamuusika (raamistiku etapp 1, 15. sept 2026).

   Silveri otsused: igal moodulil oma lugu (Kirjutajas muusikat ei ole —
   seal on kuulamine ise ülesanne), vaikimisi väljas, mängib ainult
   harjutamise ajal ja muusikalülitit saab vajutada ka mängu ajal. Eelistus on
   ühine (core/eelistused.js): kes muusika ühes moodulis välja lülitas, ei
   kuule seda ka mujal.

   Kasutus moodulis:
     HMuusika.init({ src: "muusika.mp3" });   // või { on: fn, off: fn } omaenda heliga
     HMuusika.nupp(nupp);                     // muusikanupp, neid võib olla mitu
     HMuusika.mang(true / false);             // kas käib harjutusring
   Moodul kutsub mang() oma show()-funktsioonist; siin otsustatakse, kas
   päriselt mängida. Peidetud vahelehel muusika peatub ja jätkub tagasi
   tulles. */
(function () {
  var prefs = window.HPrefs;
  var cfg = null, audio = null, aktiivne = false, kõlab = false, fade = null, eelkuula = null;
  var nupud = [];
  var VALJUS = 0.3;

  function sees() { return !!(prefs && prefs.get("music")); }

  /* Lugu laaditakse fetch()-iga tervikuna ja mängitakse blob-aadressilt.
     Otse <audio src> küsiks brauser faili tükkidena (Range, HTTP 206) ja
     service worker ei saa osalist vastust vahemällu panna — siis ei töötaks
     muusika ilma netita. Terve fail läheb vahemällu esimesel mängimisel. */
  var laadimine = null;
  function laadi() {
    if (!laadimine) {
      laadimine = fetch(cfg.src)
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then(function (b) {
          audio = new Audio(URL.createObjectURL(b));
          audio.loop = true; audio.volume = 0;
          return audio;
        })
        .catch(function (e) { laadimine = null; throw e; });
    }
    return laadimine;
  }
  function heli() { return audio; }
  function sujuv(siht, ms, siis) {
    clearInterval(fade);
    var a = heli(); if (!a) return;
    var algus = a.volume, t0 = Date.now();
    fade = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / ms);
      try { a.volume = Math.max(0, Math.min(1, algus + (siht - algus) * k)); } catch (e) {}
      if (k >= 1) { clearInterval(fade); fade = null; if (siis) siis(); }
    }, 50);
  }
  function alusta() {
    if (kõlab) return;
    kõlab = true;
    if (cfg.on) { cfg.on(); return; }
    laadi().then(function (a) {
      if (!kõlab) return;           // jõuti vahepeal peatada
      var p; try { p = a.play(); } catch (e) {}
      if (p && p.catch) p.catch(function () { kõlab = false; });
      sujuv(VALJUS, 1500);
    }).catch(function () { kõlab = false; });
  }
  function peata() {
    if (!kõlab) return;
    kõlab = false;
    if (cfg.off) { cfg.off(); return; }
    var a = heli(); if (!a) return;
    sujuv(0, 500, function () { if (!kõlab) try { a.pause(); } catch (e) {} });
  }
  function otsusta() {
    if (!cfg) return;
    clearTimeout(eelkuula); eelkuula = null;
    if (aktiivne && sees() && !document.hidden) alusta(); else peata();
  }
  function joonista() {
    var on = sees();
    nupud.forEach(function (b) {
      b.hidden = !cfg;
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  window.HMuusika = {
    init: function (c) { cfg = c; joonista(); },
    olemas: function () { return !!cfg; },
    mang: function (kas) { aktiivne = !!kas; otsusta(); },
    toggle: function () {
      if (!prefs) return false;
      prefs.set("music", !sees());
      /* Väljaspool mängu lastakse lugu korraks kõlada, et laps teaks, mida lülitas. */
      if (sees() && !aktiivne && cfg) {
        alusta();
        eelkuula = setTimeout(function () { eelkuula = null; if (!aktiivne) peata(); }, 6000);
      }
      return sees();
    },
    nupp: function (btn) {
      if (!btn) return;
      nupud.push(btn);
      btn.addEventListener("click", function () { window.HMuusika.toggle(); });
      joonista();
    },
    /* testide jaoks */
    _kõlab: function () { return kõlab; }
  };

  if (prefs) prefs.on(function (n) { if (n === "music") { joonista(); if (!eelkuula) otsusta(); } });
  document.addEventListener("visibilitychange", function () {
    if (!cfg) return;
    if (document.hidden) { clearTimeout(eelkuula); eelkuula = null; peata(); }
    else otsusta();
  });
})();
