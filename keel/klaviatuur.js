/* Keele oma tähtklaviatuur.

   MIKS: telefoni klaviatuur pakub sõnu ette („bui" → „building") ja parandab
   vead ise ära. Veebileht ei saa seda kindlalt keelata — autocorrect="off"
   ja spellcheck="false" ei peata Gboardi ettepanekuid (Silver märkas
   15. sept). Seega on siin sama lahendus mis Teisendaja numbritel
   (core/klahvistik.js): väli on päris <input>, aga inputmode="none" hoiab
   süsteemiklaviatuuri kinni ja tähed tulevad meie klahvidelt. Arvutis töötab
   füüsiline klaviatuur. Suurtähti pole vaja — suur ja väike täht ei loe.

   Kasutus:
     const k = KKlaviatuur.loo({ host, onVastus: tekst => {}, onMuutus: tekst => {} });
     k.vaartus(); k.pane(s); k.tyhjenda(); k.lukusta(); k.ava(); k.fookus(); k.klahv(e);
*/
(function () {
  'use strict';
  var MAX = 60;
  var READ = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

  function nupp(tekst, klass, silt) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'kt' + (klass ? ' ' + klass : '');
    b.textContent = tekst;
    if (silt) b.setAttribute('aria-label', silt);
    return b;
  }

  function loo(o) {
    var host = o.host;
    var onVastus = o.onVastus || function () {};
    var onMuutus = o.onMuutus || function () {};
    host.innerHTML = '';
    host.classList.add('taheklaviatuur');
    host.classList.remove('lukus');

    var inp = document.createElement('input');
    inp.type = 'text';
    inp.id = 'kirjuta';
    inp.inputMode = 'none';            /* süsteemiklaviatuur jääb kinni */
    inp.autocomplete = 'off';
    inp.spellcheck = false;
    inp.setAttribute('autocorrect', 'off');
    inp.setAttribute('autocapitalize', 'off');
    inp.setAttribute('lang', 'en');
    inp.setAttribute('aria-label', o.silt || 'Kirjuta inglise keeles');
    if (o.peidaVali) inp.className = 'peidus';
    host.append(inp);

    function muutus() { onMuutus(inp.value); }
    function kirjuta(m) {
      if (inp.disabled || inp.value.length >= MAX) return;
      if (m === ' ' && (!inp.value.length || / $/.test(inp.value))) return;
      inp.value += m;
      muutus();
      inp.focus({ preventScroll: true });
    }
    function kustuta() {
      if (inp.disabled) return;
      inp.value = inp.value.slice(0, -1);
      muutus();
      inp.focus({ preventScroll: true });
    }
    function vastan() {
      if (inp.disabled) return;
      onVastus(inp.value);
    }

    inp.addEventListener('beforeinput', function (e) { e.preventDefault(); });
    inp.addEventListener('paste', function (e) { e.preventDefault(); });
    /* Füüsiline klahv → true, kui see oli meie oma. */
    function klahv(e) {
      if (e.ctrlKey || e.metaKey || e.altKey || inp.disabled) return false;
      if (/^[a-zA-Z']$/.test(e.key)) { e.preventDefault(); kirjuta(e.key.toLowerCase()); return true; }
      if (e.key === ' ') { e.preventDefault(); kirjuta(' '); return true; }
      if (e.key === 'Backspace') { e.preventDefault(); kustuta(); return true; }
      /* stopPropagation: sama Enter ei tohi jõuda lehe käsitlejani, mis
         jätaks vihje vahele (vt core/klahvistik.js). */
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); vastan(); return true; }
      return false;
    }
    inp.addEventListener('keydown', klahv);

    var pad = document.createElement('div');
    pad.className = 'kt-pad';
    READ.forEach(function (r, i) {
      var rida = document.createElement('div');
      rida.className = 'kt-rida';
      r.split('').forEach(function (t) { rida.append(nupp(t)); });
      if (i === 2) rida.append(nupp('⌫', 'kt-kustuta', 'Kustuta'));
      pad.append(rida);
    });
    var viimane = document.createElement('div');
    viimane.className = 'kt-rida';
    viimane.append(nupp("'", 'kt-ulakoma', 'Ülakoma'), nupp('tühik', 'kt-tyhik', 'Tühik'));
    var saada = nupp('Vastan', 'kt-vastan');
    viimane.append(saada);
    pad.append(viimane);
    host.append(pad);

    /* pointerdown + preventDefault: nupp ei võta fookust väljalt ära ja
       kiire toksimine ei suumi lehte. */
    pad.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
    pad.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || inp.disabled) return;
      if (b === saada) { vastan(); return; }
      if (b.classList.contains('kt-kustuta')) { kustuta(); return; }
      if (b.classList.contains('kt-tyhik')) { kirjuta(' '); return; }
      kirjuta(b.textContent);
    });

    return {
      input: inp,
      vaartus: function () { return inp.value; },
      pane: function (s) { inp.value = s || ''; muutus(); },
      tyhjenda: function () { inp.value = ''; muutus(); },
      lukusta: function () { inp.disabled = true; host.classList.add('lukus'); },
      ava: function () { inp.disabled = false; host.classList.remove('lukus'); inp.focus({ preventScroll: true }); },
      fookus: function () { if (!inp.disabled) inp.focus({ preventScroll: true }); },
      klahv: klahv,
      saadaNupp: saada
    };
  }

  window.KKlaviatuur = { loo: loo };
})();
