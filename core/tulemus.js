/* Harjutaja ühine tulemuse ekraan (raamistiku etapp 4, 15. sept 2026).

   Enne olid neli tulemuse ekraani neljas failis ja sõnastus läks lahku
   („Kõik õigesti" / „Kõik õiged", „Need läksid valesti" / „Järgmisel korral
   harjutame", väikese ringi piir 4 või 5). Nüüd on pealkirjad ühes tabelis.

   Reeglid:
   - „Kõik õiged!" ja „Tugev ring!" ainult TÄIS võistlusringi puhul;
   - „N … sai selgeks" igas moodulis, kus selgust mõõdetakse;
   - vigade silt on „Järgmisel korral harjutame" (index.html-is);
   - esmane nupp on sihitud („Harjuta neid kellaaegu"), kui vigu oli, ja
     siis harjutab ta päriselt neid; muidu „Harjuta veel".
   - ring läheb kirja (D.rounds / D.tests) ja serverisse (HSaatmine) siit.

   Kasutus:
     const T = HTulemus.loo({
       D, save, saatmine, voistlus, n: 20,
       maskott: KKagu,                       // (meeleolu) → SVG
       alamTekst: "Kell on keeruline asi. …", // harjutusringi madala tulemuse lause
       selgeks: ["kellaaeg", "kellaaega"],    // „1 kellaaeg / 3 kellaaega sai selgeks" (või funktsioon, mis selle annab)
       harjutaNeid: "Harjuta neid kellaaegu",   // alamTekst ja harjutaNeid võivad olla ka funktsioonid
       veaRida: it => element,                // üks rida vigade nimekirjas
       ringiLisa: () => ({ level: D.level }), // lisaväljad D.rounds kirjele
       kordus: G => G.wrong,                  // mida „Harjuta neid …" harjutab ([] = ei midagi)

       // Korrutaja konksud (etapp 5), kõik valikulised:
       kirjuta: G => ({ rekord, parim, score, avg, op }), // moodul paneb ringi ise kirja
       nimi: () => "Mia",                     // „Suurepärane, Mia!"
       kastid: G => [["120", "punkti"]],      // lisakastid numbrite reale
       voidud: G => [element, …],             // kiidukaardid #resWins sisse
       pidu: () => konfetti()                 // kui naita(G, { pidu: true })
     });
     T.naita(G, { uued: 3, pidu: false }) → lastWrong
*/
(function () {
  'use strict';
  var VAIKE_RING = 4;
  var $ = function (id) { return document.getElementById(id); };

  function kast(stats, suur, vaike) {
    var d = document.createElement('div'); d.className = 'stat';
    var b = document.createElement('b'); b.textContent = suur;
    var s = document.createElement('span'); s.textContent = vaike;
    d.appendChild(b); d.appendChild(s); stats.appendChild(d);
  }

  function loo(o) {
    var D = o.D, save = o.save;

    /* „Suurepärane!" → „Suurepärane, Mia!" */
    function nimega(t) {
      var nm = o.nimi ? String(o.nimi() || '').trim() : '';
      return nm ? t.replace(/!$/, ', ' + nm + '!') : t;
    }

    function pealkiri(G, rekord) {
      var pct = G.n ? G.ok / G.n : 0;
      if (G.mode === 'test') {
        var tais = G.n >= o.n;
        if (tais && G.ok === G.n) return ['Kõik õiged!', 'cheer', true];
        if (rekord) return ['Uus rekord!', 'cheer', true];
        if (tais && pct >= 0.8) return ['Tugev ring!', 'cheer'];
        if (pct >= 0.5) return ['Tubli võistlus!', 'happy'];
        return ['Võistlus tehtud!', 'kind', false, 'Harjutamine tõstab tulemust. Homme saad uuesti võistelda.'];
      }
      if (G.n < VAIKE_RING) return ['Hea algus!', 'wave'];
      if (pct >= 0.9) return ['Suurepärane!', 'cheer', true];
      if (pct >= 0.7) return ['Hästi tehtud!', 'happy'];
      return ['Hästi harjutatud!', 'kind', false, (typeof o.alamTekst === 'function' ? o.alamTekst() : o.alamTekst) || ''];
    }

    function naita(G, lisa) {
      lisa = lisa || {};
      var test = G.mode === 'test';
      var rekord = false, parim = 0;
      if (o.kirjuta) {
        var k = o.kirjuta(G) || {};
        rekord = !!k.rekord; parim = k.parim || 0;
        if (G.n) o.saatmine.lisa({ mode: G.mode, n: G.n, ok: G.ok, score: k.score != null ? k.score : G.ok, avg: k.avg || 0, op: k.op });
        if (test) o.voistlus.margi();
      } else if (test) {
        D.tests.push({ t: Date.now(), n: G.n, ok: G.ok });
        if (D.tests.length > 40) D.tests.shift();
        var enne = D.tests.slice(0, -1).reduce(function (b, t) { return Math.max(b, t.ok); }, 0);
        rekord = G.ok > enne && D.tests.length > 1;
        parim = Math.max(enne, G.ok);
        var avg = G.n ? (Date.now() - G.t0) / 1000 / G.n : 0;
        o.saatmine.lisa({ mode: 'test', n: G.n, ok: G.ok, score: G.ok, avg: Math.round(avg * 10) / 10 });
        o.voistlus.margi();
      } else {
        var r = { t: Date.now(), n: G.n, ok: G.ok };
        var x = o.ringiLisa ? o.ringiLisa() : {};
        for (var k in x) r[k] = x[k];
        D.rounds.push(r);
        if (D.rounds.length > 20) D.rounds.shift();
        /* Harjutusring läheb ka serverisse: nii jõuab selgeks saanud asjade
           arv edetabelisse ilma võistlemata (Silveri otsus 15. sept). */
        if (G.n) o.saatmine.lisa({ mode: 'train', n: G.n, ok: G.ok, score: G.ok, avg: 0 });
      }
      save();
      o.saatmine.saada();

      var p = pealkiri(G, rekord);
      var alam = p[3] || (test ? 'Uus võistlus on homme.' : '');
      if (lisa.pidu) { p[1] = 'cheer'; p[2] = true; if (o.pidu) o.pidu(); }
      if (p[2] && window.HSfx) HSfx.tada();
      $('resMaskott').innerHTML = o.maskott(p[1]);
      $('resTitle').textContent = nimega(p[0]);
      $('resSub').textContent = alam;
      $('resSub').hidden = !alam;

      var stats = $('resStats'); stats.innerHTML = '';
      kast(stats, G.ok + ' / ' + G.n, 'õigesti');
      if (test) {
        kast(stats, String(parim), rekord ? 'uus rekord' : 'sinu rekord');
      }
      var uued = lisa.uued || 0;
      var sk = typeof o.selgeks === 'function' ? o.selgeks() : o.selgeks;
      if (uued > 0 && sk) kast(stats, String(uued), (uued === 1 ? sk[0] : sk[1]) + ' sai selgeks');
      if (o.kastid) o.kastid(G).forEach(function (x) { kast(stats, x[0], x[1]); });

      var wins = $('resWins');
      if (wins) {
        wins.innerHTML = '';
        (o.voidud ? o.voidud(G) : []).forEach(function (el) { wins.appendChild(el); });
        wins.hidden = !wins.children.length;
      }

      var nb = $('resNext'); nb.innerHTML = '';
      G.wrong.slice(0, o.veaPiir || 6).forEach(function (it) { nb.appendChild(o.veaRida(it)); });
      $('resNextBlock').hidden = !G.wrong.length;

      var kordus = o.kordus ? o.kordus(G) : G.wrong.slice();
      $('againBtn').textContent = kordus.length ? (typeof o.harjutaNeid === 'function' ? o.harjutaNeid() : o.harjutaNeid) : 'Harjuta veel';
      o.mang.naita('s-result');
      return kordus;
    }

    return { naita: naita, pealkiri: pealkiri };
  }

  window.HTulemus = { loo: loo, VAIKE_RING: VAIKE_RING };
})();
