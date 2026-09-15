/* Keele heli: õpitavad read ja sõnad failidest (keel/audio/, Gemini TTS,
   tools/keel_audio.py). Kui faili ei ole (lühikesed abisõnad a, the, to …
   või rida, mille heli pole veel tehtud), loeb brauseri enda inglise hääl.

   KHeli.rida(rida, {aeglane, nupp, valmis}) — mängi rida
   KHeli.sona(sona)                         — mängi üks sõna
   KHeli.peata()
   KHeli.soojenda(read)                     — kogu tunni heli vahemällu (võrguta töö) */
(function () {
  'use strict';
  var praegu = null, nupp = null;

  function sonaFail(w) { return String(w).toLowerCase().replace(/[^a-z]/g, ''); }

  function lopp() {
    if (nupp) nupp.classList.remove('playing');
    nupp = null;
  }

  function peata() {
    if (praegu) { try { praegu.onended = praegu.onerror = null; praegu.pause(); } catch (e) {} }
    praegu = null;
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
    lopp();
  }

  var haal = null;
  function valiHaal() {
    if (!window.speechSynthesis) return null;
    var h = speechSynthesis.getVoices() || [];
    return h.filter(function (v) { return /^en-GB/i.test(v.lang); })[0] ||
      h.filter(function (v) { return /^en/i.test(v.lang); })[0] || null;
  }
  if (window.speechSynthesis && speechSynthesis.addEventListener)
    speechSynthesis.addEventListener('voiceschanged', function () { haal = valiHaal(); });

  function raagi(tekst, aeglane, valmis) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { lopp(); if (valmis) valmis(); return; }
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(tekst);
      haal = haal || valiHaal();
      if (haal) u.voice = haal;
      u.lang = haal ? haal.lang : 'en-GB';
      u.rate = aeglane ? 0.6 : 0.9;
      u.onend = u.onerror = function () { lopp(); if (valmis) valmis(); };
      speechSynthesis.speak(u);
    } catch (e) { lopp(); if (valmis) valmis(); }
  }

  function mangi(src, tekst, o) {
    o = o || {};
    peata();
    nupp = o.nupp || null;
    if (nupp) nupp.classList.add('playing');
    if (!src) { raagi(tekst, o.aeglane, o.valmis); return; }
    var a = new Audio(src);
    praegu = a;
    if (o.aeglane) {
      a.playbackRate = 0.7;
      a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true;
    }
    var tagavara = function () { if (praegu !== a) return; praegu = null; raagi(tekst, o.aeglane, o.valmis); };
    a.onerror = tagavara;
    a.onended = function () { if (praegu !== a) return; praegu = null; lopp(); if (o.valmis) o.valmis(); };
    var p = a.play();
    if (p && p.catch) p.catch(function (e) {
      /* NotAllowedError = brauser ei luba veel heli; siis ka hääl ei tööta.
         Muu viga (fail puudub) → brauseri hääl. */
      if (e && e.name === 'NotAllowedError') { if (praegu === a) { praegu = null; lopp(); } return; }
      tagavara();
    });
  }

  var LYHIKESED = { a: 1, an: 1, the: 1, to: 1, at: 1, 'in': 1, is: 1 };

  window.KHeli = {
    rida: function (r, o) { mangi('audio/' + r.id + '.mp3', r.en, o); },
    sona: function (w, o) {
      var f = sonaFail(w);
      mangi(LYHIKESED[f] ? null : 'audio/s/' + f + '.mp3', w.replace(/[.,!?]/g, ''), o);
    },
    peata: peata,
    /* Kogu tunni heli taustal vahemällu (service worker paneb .mp3 vahemällu
       esimesel päringul). Alles pärast esimese ringi algust, mitte lehe avamisel. */
    soojenda: function (read, tehtud) {
      if (!window.fetch) return;
      var urlid = [];
      read.forEach(function (r) {
        urlid.push('audio/' + r.id + '.mp3');
        r.en.split(/\s+/).forEach(function (w) {
          var f = sonaFail(w);
          if (f && !LYHIKESED[f] && urlid.indexOf('audio/s/' + f + '.mp3') < 0) urlid.push('audio/s/' + f + '.mp3');
        });
      });
      var koik = true;
      Promise.all(urlid.map(function (u) {
        return fetch(u).then(function (r) { if (!r.ok) koik = false; }).catch(function () { koik = false; });
      })).then(function () { if (koik && tehtud) tehtud(); });
    }
  };
})();
