/* Harjutaja ühine edetabel (raamistiku etapp 4, 15. sept 2026).

   Korrutaja kujuga (Silveri otsus 15. sept): klassi kaart koos koodi ja
   nädala eesmärgiribaga, sakid „Nädal / Selged … / Rekord / Kool / Eesti",
   klassi sees 7 esimest ja siis mina (kui ma nende hulgas ei ole). Enne oli
   see kolmes moodulis kolme koopiana ja Korrutajas neljas kujus.

   Ekraan joonistatakse #s-board sisse siin, index.html-is on ainult tühi
   <section id="s-board">.

   Kasutus:
     const E = HEdetabel.loo({
       D, save, moodul: "kell", kus: "Kellas", mang, saatmine, voistlus,
       n: 20, asjad: "kellaaega",                 // „Igas võistluses on 20 kellaaega."
       selged: { sakk: "Selged kellaajad", yks: "selge kellaaeg", mitu: "selget kellaaega",
                 selgitus: "Selge on kellaaeg, mille …" },
       kodu: () => mang.koju(), klass: renderKlass,
       ilmaVoistluseta: false                     // true: nädala ja rekordi sakki ega eesmärgiriba pole
     });
     E.ava();
*/
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var EESMARGID = [50, 100, 250, 500, 1000, 2000, 4000, 8000, 16000];
  var TOP = 7;

  var num = function (n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
  var paevi = function (n) { return !n ? '' : (n === 1 ? '1 võistluspäev' : n + ' võistluspäeva'); };
  var voistlejat = function (n) { return n === 1 ? '1 võistleja' : (n || 0) + ' võistlejat'; };

  var MALL =
    '<header class="top">' +
      '<button class="icon-btn" id="bBack" aria-label="Tagasi">‹</button>' +
      '<h2 class="scr-title">Edetabel</h2>' +
      '<button class="icon-btn" id="bRefresh" aria-label="Värskenda">⟳</button>' +
    '</header>' +
    '<div class="bcard">' +
      '<div class="classline"><b id="bClass"></b><span id="bCode"></span></div>' +
      '<div class="goal"><div class="track"><i id="bGoalBar"></i></div>' +
        '<small><span id="bWeek"></span><span id="bGoal"></span></small></div>' +
      '<button class="ghost" id="bInvite">Kutsu sõber klassi</button>' +
      '<p class="hint-small" id="bInviteNote" hidden></p>' +
    '</div>' +
    '<div class="chips" role="group" aria-label="Mida võrdleme" id="bTabs">' +
      '<button class="chip" data-t="week" aria-pressed="true">Nädal</button>' +
      '<button class="chip" data-t="sure" aria-pressed="false"></button>' +
      '<button class="chip" data-t="best" aria-pressed="false">Rekord</button>' +
      '<button class="chip" data-t="school" aria-pressed="false">Kool</button>' +
      '<button class="chip" data-t="country" aria-pressed="false">Eesti</button>' +
    '</div>' +
    '<p class="hint-small" id="bHint"></p>' +
    '<ol class="board" id="bList"></ol>' +
    '<p class="count-note" id="bStatus"></p>';

  function loo(o) {
    var D = o.D, save = o.save;
    /* Ilma võistluseta moodulis nädalapunkte ega rekordit ei teki: siis on
       ainus mõistlik võrdlus selgete asjade arv. */
    var ilma = !!o.ilmaVoistluseta;
    var sakk = ilma ? 'sure' : 'week';
    var host = $('s-board');
    host.innerHTML = MALL;
    $('bTabs').querySelector('[data-t="sure"]').textContent = o.selged.sakk;
    /* Kooli ja Eesti võrdlus käib samuti nädalapunktide järgi — ilma
       võistluseta jääb ainult üks sakk ja sakkide rida pole vaja. */
    if (ilma) {
      $('bTabs').hidden = true;
      host.querySelector('.goal').hidden = true;
    }

    function konto() { return (window.HKlass && HKlass.current()) || null; }

    function ava() {
      o.mang.naita('s-board');
      $('bInviteNote').hidden = true;
      joonista();
      o.saatmine.saada().then(lae);
    }

    function lae() {
      if (!konto()) return;
      $('bStatus').textContent = 'Laadin…';
      return HKlass.board(o.moodul).then(function (r) {
        if (r && r.error === 'auth') {
          HKlass.clear(); D.board = null; save();
          if (o.klass) o.klass();
          o.mang.naita('s-home');
          return;
        }
        if (!r || r.error) { $('bStatus').textContent = 'Ei õnnestunud.'; return; }
        D.board = r; save();
        if (r.competed_today) o.voistlus.margi();
        joonista();
        $('bStatus').textContent = '';
      }).catch(function () {
        joonista();
        $('bStatus').textContent = D.board ? 'Võrku pole. Näitan viimast seisu.' : 'Võrku pole.';
      });
    }

    function vihje(t, klassiaste) {
      var g = klassiaste ? klassiaste + '. klassid' : 'sama astme klassid';
      if (t === 'week') return 'Nädalapunktid on sinu viie parima päeva õiged vastused kokku. Nädalavahetusel ei pea mängima.';
      if (t === 'sure') return o.selged.selgitus;
      if (t === 'best') return 'Sinu kõige parem võistlus. Igas võistluses on ' + o.n + ' ' + o.asjad + '.';
      if (t === 'school') return 'Sinu kooli teised ' + g + '. Võrdleme punkte ühe võistleja kohta, mitte kogusummat.';
      return 'Kõik Eesti ' + g + '. Punktid ühe võistleja kohta.';
    }

    function rida(koht, nimi, alam, vaartus, mina) {
      var li = document.createElement('li');
      li.className = 'brow' + (mina ? ' me' : '');
      var pos = document.createElement('b'); pos.className = 'pos'; pos.textContent = koht + '.';
      var mid = document.createElement('span'); mid.className = 'mid';
      var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = nimi || '';
      var sb = document.createElement('small'); sb.textContent = alam || '';
      mid.appendChild(nm); mid.appendChild(sb);
      var v = document.createElement('b'); v.className = 'val'; v.textContent = num(vaartus);
      li.appendChild(pos); li.appendChild(mid); li.appendChild(v);
      return li;
    }

    function tuhi(tekst) {
      var li = document.createElement('li');
      li.className = 'brow empty';
      li.textContent = tekst;
      $('bList').appendChild(li);
    }

    function joonista() {
      var B = D.board, c = konto();
      var k = (B && B['class']) || null;
      $('bClass').textContent = k ? k.name : (c ? c.class_name : '');
      $('bCode').textContent = (k && k.code) || (c ? c.code : '');
      var tiim = !!(k && k.kind === 'team');
      $('bTabs').querySelector('[data-t="school"]').hidden = tiim;
      $('bTabs').querySelector('[data-t="country"]').hidden = tiim;
      if (tiim && (sakk === 'school' || sakk === 'country')) sakk = ilma ? 'sure' : 'week';
      [].forEach.call($('bTabs').children, function (x) { x.setAttribute('aria-pressed', x.dataset.t === sakk ? 'true' : 'false'); });
      $('bHint').textContent = vihje(sakk, k && k.grade);
      var list = $('bList'); list.innerHTML = '';

      if (!k) {
        $('bWeek').textContent = ''; $('bGoal').textContent = '';
        $('bGoalBar').style.width = '0%';
        if (!$('bStatus').textContent) $('bStatus').textContent = 'Laadin edetabelit…';
        return;
      }
      var wk = +k.week_n || 0, eesmark = EESMARGID[EESMARGID.length - 1];
      for (var i = 0; i < EESMARGID.length; i++) { if (wk < EESMARGID[i]) { eesmark = EESMARGID[i]; break; } }
      var aktiivseid = +k.active_week || 0;
      $('bWeek').textContent = 'Klass sel nädalal: ' + num(wk) + ' punkti · ' + voistlejat(aktiivseid);
      $('bGoal').textContent = 'eesmärk ' + num(eesmark);
      $('bGoalBar').style.width = Math.max(0, Math.min(100, wk / eesmark * 100)) + '%';

      if (sakk === 'school' || sakk === 'country') {
        var gs = (sakk === 'school' ? B.siblings : B.peers) || [];
        if (!gs.length) { tuhi('Siin pole veel kedagi. Klass ilmub siia pärast esimest võistlust.'); return; }
        gs.forEach(function (g, j) {
          var alam = sakk === 'school' ? voistlejat(g.active) : (g.school || voistlejat(g.active));
          list.appendChild(rida(j + 1, g.name, alam, g.per_player, g.id === k.id));
        });
        return;
      }

      var ps = (B.players || []).slice();
      var voti = { week: 'week_n', sure: 'greens', best: 'best_test' }[sakk];
      var teine = { week: 'greens', sure: 'week_n', best: 'week_n' }[sakk];
      ps.sort(function (a, b) {
        return ((+b[voti] || 0) - (+a[voti] || 0)) || ((+b[teine] || 0) - (+a[teine] || 0)) ||
          String(a.nick || '').localeCompare(String(b.nick || ''), 'et');
      });
      if (!ps.length) { tuhi('Keegi pole veel võistelnud. Ole esimene!'); return; }
      var alamTekst = function (p) {
        if (sakk === 'sure') return (+p.greens === 1) ? o.selged.yks : o.selged.mitu;
        if (sakk === 'best') return (+p.best_test === 1 ? 'õige' : 'õiget') + ' parimas võistluses';
        return paevi(p.days);
      };
      var minu = -1;
      for (i = 0; i < ps.length; i++) { if (ps[i].id === B.me) { minu = i; break; } }
      for (i = 0; i < Math.min(TOP, ps.length); i++) list.appendChild(rida(i + 1, ps[i].nick, alamTekst(ps[i]), ps[i][voti], i === minu));
      if (minu >= TOP) {
        var vahe = document.createElement('li');
        vahe.className = 'brow gap'; vahe.textContent = '···'; vahe.setAttribute('aria-hidden', 'true');
        list.appendChild(vahe);
        list.appendChild(rida(minu + 1, ps[minu].nick, alamTekst(ps[minu]), ps[minu][voti], true));
      }
    }

    function kutsu() {
      var c = konto(); if (!c) return;
      var k = D.board && D.board['class'];
      var inv = HKlass.invite(c.code, c.class_name, o.kus, k && k.kind);
      var tekst = inv.text + '\n' + inv.url;
      var note = $('bInviteNote');
      var naita = function (t) { note.textContent = t; note.hidden = false; };
      if (navigator.share) { navigator.share({ text: inv.text, url: inv.url }).catch(function () {}); return; }
      if (navigator.clipboard) {
        navigator.clipboard.writeText(tekst)
          .then(function () { naita('Kutse on kopeeritud — kleebi see sõbrale sõnumisse.'); })
          .catch(function () { naita('Klassikood on ' + c.code + '.'); });
        return;
      }
      naita('Klassikood on ' + c.code + '.');
    }

    $('bBack').addEventListener('click', function () { o.kodu(); });
    $('bRefresh').addEventListener('click', function () { o.saatmine.saada().then(lae); });
    $('bInvite').addEventListener('click', kutsu);
    $('bTabs').addEventListener('click', function (e) {
      var ch = e.target.closest('.chip'); if (!ch) return;
      sakk = ch.dataset.t; joonista();
    });

    return { ava: ava, joonista: joonista, lae: lae };
  }

  window.HEdetabel = { loo: loo, EESMARGID: EESMARGID };
})();
