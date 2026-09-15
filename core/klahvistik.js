/* Harjutaja ühine numbriklahvistik.

   MIKS MÄNGUL ON OMA KLAHVISTIK
   Telefoni süsteemiklaviatuur katab pool ekraani, hüppab lahti ja kinni ning
   toob kaasa kõik muu, mis klaviatuuril on. Siin on ainult see, mida laps
   vajab: numbrid, kustutus ja „Vastan“. Koma ilmub ainult siis, kui seda
   päriselt lubatakse (Teisendajas tase 4).

   Väli on päris <input>, aga inputmode="none" hoiab süsteemiklaviatuuri kinni.
   Nii töötab arvutis füüsiline klaviatuur (numbrid, koma, Backspace, Enter)
   ja telefonis meie oma klahvistik.

   Kasutus:
     const k = HKlahvistik.loo({
       host: element,          // kuhu klahvistik joonistatakse
       valjad: 2,              // mitu sisestusvälja (nimega arvul kaks)
       sildid: ["km", "m"],    // ühik iga välja kõrval
       koma: false,            // kas koma klahv on olemas
       onVastus: vaartused => {}
     });
     k.vaartused()  -> ["2", "350"]
     k.tyhjenda(); k.lukusta(); k.ava(); k.fookus();
*/
(function () {
  'use strict';

  var MAX = 7; /* pikim vastus mängus on kuuekohaline, üks koht varuks */

  function nupp(tekst, klass, silt) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'kl-nupp' + (klass ? ' ' + klass : '');
    b.textContent = tekst;
    if (silt) b.setAttribute('aria-label', silt);
    return b;
  }

  function loo(o) {
    o = o || {};
    var host = o.host;
    var mitu = Math.max(1, Math.min(2, o.valjad || 1));
    var sildid = o.sildid || [];
    var koma = !!o.koma;
    var onVastus = o.onVastus || function () {};
    host.innerHTML = '';
    host.classList.add('klahvistik');
    /* Host on sama element ülesandest ülesandesse. Eelmise vastuse lukk
       jääks muidu külge ja uus klahvistik oleks algusest peale kinni. */
    host.classList.remove('lukus');

    /* --- sisestusväljad --- */
    var read = document.createElement('div');
    read.className = 'kl-valjad';
    var valjad = [];
    for (var i = 0; i < mitu; i++) {
      var karp = document.createElement('label');
      karp.className = 'kl-vali';
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.inputMode = 'none';      /* süsteemiklaviatuur jääb kinni */
      inp.autocomplete = 'off';
      inp.spellcheck = false;
      inp.id = 'kl-vali-' + i;
      inp.setAttribute('aria-label', 'Vastus' + (mitu > 1 ? ' ' + (i + 1) : '') +
        (sildid[i] ? ', ühik ' + sildid[i] : ''));
      var silt = document.createElement('span');
      silt.className = 'kl-silt';
      silt.textContent = sildid[i] || '';
      karp.append(inp, silt);
      read.append(karp);
      valjad.push(inp);
    }
    host.append(read);

    /* --- klahvistik --- */
    var pad = document.createElement('div');
    pad.className = 'kl-pad';
    var aktiivne = 0;

    function vali(i) {
      aktiivne = Math.max(0, Math.min(valjad.length - 1, i));
      valjad[aktiivne].focus();
    }

    function kirjuta(m) {
      var v = valjad[aktiivne];
      if (v.disabled) return;
      if (v.value.length >= MAX) return;
      if (m === ',' && (v.value.indexOf(',') >= 0 || !v.value.length)) return;
      v.value += m;
      v.focus();
    }

    function kustuta() {
      var v = valjad[aktiivne];
      if (v.disabled) return;
      if (!v.value.length && aktiivne > 0) { vali(aktiivne - 1); return; }
      v.value = v.value.slice(0, -1);
      v.focus();
    }

    function vastan() {
      if (valjad[0].disabled) return;
      onVastus(valjad.map(function (v) { return v.value; }));
    }

    valjad.forEach(function (v, i) {
      v.addEventListener('focus', function () { aktiivne = i; });
      v.addEventListener('beforeinput', function (e) { e.preventDefault(); });
      v.addEventListener('keydown', function (e) {
        if (e.key >= '0' && e.key <= '9') { e.preventDefault(); kirjuta(e.key); return; }
        if ((e.key === ',' || e.key === '.') && koma) { e.preventDefault(); kirjuta(','); return; }
        if (e.key === 'Backspace') { e.preventDefault(); kustuta(); return; }
        if (e.key === 'Enter') { e.preventDefault(); vastan(); }
      });
    });

    var read2 = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']];
    read2.forEach(function (r) {
      r.forEach(function (m) { pad.append(nupp(m)); });
    });
    pad.append(koma ? nupp(',', 'kl-koma', 'Koma') : nupp('', 'kl-tyhi'));
    pad.append(nupp('0'));
    pad.append(nupp('⌫', 'kl-kustuta', 'Kustuta'));
    host.append(pad);

    var saada = nupp('Vastan', 'kl-vastan');
    host.append(saada);

    pad.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('kl-tyhi')) return;
      if (b.classList.contains('kl-kustuta')) { kustuta(); return; }
      kirjuta(b.textContent);
    });
    saada.addEventListener('click', vastan);

    return {
      vaartused: function () { return valjad.map(function (v) { return v.value; }); },
      tyhjenda: function () {
        valjad.forEach(function (v) { v.value = ''; v.disabled = false; });
        host.classList.remove('lukus');
        vali(0);
      },
      /* Pärast vastamist ei tohi laps enam numbreid muuta, muidu näeb
         tagasiside ühte ja väljal seisab teine arv. */
      lukusta: function () {
        valjad.forEach(function (v) { v.disabled = true; });
        host.classList.add('lukus');
      },
      fookus: function () { vali(0); },
      valjad: valjad
    };
  }

  window.HKlahvistik = { loo: loo, MAX: MAX };
})();
