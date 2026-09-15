/* Harjutaja mooduli leping (raamistiku etapp 6, 16. sept 2026).

   Uus moodul kirjeldab ainult oma sisu ja kutsub HMoodul.registreeri(...).
   See fail ehitab kogu lehe (avaleht, mäng, tulemus, edetabel, seaded) ja
   ühendab tuumamoodulid: HMang, HVoistlus, HSaatmine, HTulemus, HEdetabel,
   HSeaded, HMuusika, HSfx, HKlass. Nii on uus moodul algusest peale samas
   kujus nagu teised ega saa ühtki ühist reeglit kogemata teisiti teha.

   Näide ja mall: _mall/ (kopeeri ja nimeta ümber). Kontroll-leht:
   _mall/KONTROLL-LEHT.md.

   Olemasolevad moodulid (Kell, Kirjutaja, Teisendaja, Korrutaja) kasutavad
   samu tuumamooduleid otse, oma avalehega. Neid siia üle ei tõstetud, sest
   nende avalehtedel on oma osad (kaart, redel, praegune kell, soojuskaart).

   HMoodul.registreeri({
     id: "naidis",                          // serveri mooduli nimi; salvestusvõti on id + "_v1"
     nimi: "Näidis", kus: "Näidises",       // kus = seesütlev kääne (lõpetamise hoiatuses, kutses)
     kirjeldus: "Liida kaks arvu.",         // avalehe alapealkiri
     asjad: { yks: "tehe", mitu: "tehet", mitmus: "tehted" },
                                            // „1 tehe", „12 tehet", „Selged tehted"
     maskott: (meeleolu, { head }) => svg,  // meeleolu: wave | happy | cheer | kind
     maskotiNimi: "Täpike",
     muusika: ["muusika-1.mp3"],            // või null (siis muusikanuppu ei ole)
     ringiPikkus: 10,
     voistlus: { n: 15, sek: 10, kirjeldus: "…" },   // või null (võistlust pole)
     kiibid: [{ id: "tase", silt: "Kui raske?", vaikimisi: 1,     // avalehe valikud; laps valib kiibiga
                markus: "Igal tasemel on ka eelmiste tasemete ülesandeid.",
                valikud: [{ id: 1, nimi: "Kuni 10" }, …] }],
     pakk: (valik, mode) => [ülesanne, …],  // igal ülesandel id (statistika võti) ja lemma (oskus)
     selgus: "Selge on tehe, mille …",      // edetabeli ja avalehe selgitus
     selgedArv: D => n,                     // valikuline; vaikimisi selgete id-de arv
     alamTekst: "…",                        // madala tulemuse lause
     harjutaNeid: "Harjuta neid tehteid",
     veaRida: q => element,                 // üks rida „Järgmisel korral harjutame" all
     kaart: { silt, markus, joonista(host, D, valik) },   // valikuline plokk avalehel
     abi: "<p>…</p>",                       // „Kuidas see käib?" sisu (HTML)
     lava: "<p class='ask' id='askText'></p>",  // valikuline; mooduli oma osa mänguekraanil
     miks: { ulesanne: "…", … },            // veateate põhjused; vaikimisi ühised
     voimed: { eelmine: true, veateade: true },

     // Valikulised konksud moodulile, mille ring on teistsugune (Keel, 16. sept):
     laadi: D => {},                        // vanade andmete üleviimine enne kõike muud
     ring: (D, mode, fookus) => round,      // oma ring pakk()-i ja HEngine.Round asemel
                                            // (round.next(), round.record(q, ok, q.abi), round.length)
     ringAlgas: (round, D) => {},           // nt heli eellaadimine
     kordus: G => [...],                    // mida „Harjuta neid …" järgmisele ringile annab
     harjutaMeta: D => "5 lauset",          // Harjuta nupu alamtekst
     avaleht: D => {},                      // avalehe oma read (nt #startNote)
     enneTulemust: G => {},                 // nt heli peatamine, vigade nimekirja puhastus
     tulemusLisa: { silt, markus, joonista(host, G, round) },   // plokk tulemuse ekraanil
     koju: () => {},                        // avalehele minnes
     // kaart.id: avalehe kaardi elemendi id (vaikimisi "kaart")
     // HMang konksud (vt core/mang.js): joonista, kontrolli, oige, vihje,
     // naitaVastus, lukusta, tyhi, mustand, taasta, fookus, valikud, sama,
     // veateade, valmista, algus, vastatud, valeLause, aken, klahv
   });
*/
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  var KONKSUD = ['joonista', 'kontrolli', 'oige', 'vihje', 'naitaVastus', 'lukusta', 'tyhi',
    'mustand', 'taasta', 'fookus', 'valikud', 'sama', 'veateade', 'valmista', 'algus',
    'vastatud', 'valeLause', 'aken', 'klahv'];
  var MIKS = {
    ulesanne: 'Ülesanne on imelik',
    vastus: 'Mäng näitab valet vastust',
    raske: 'Ei saa aru, mida küsitakse',
    muu: 'Midagi muud'
  };

  var SVG = 'width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  var IKOON = {
    heli: '<svg ' + SVG + '><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path class="wave" d="M15.5 8.5a5 5 0 0 1 0 7"/><path class="off" d="M16 9l5 6M21 9l-5 6"/></svg>',
    muusika: '<svg ' + SVG + '><path d="M9 17V5l10-2v12"/><circle cx="6.5" cy="17" r="2.5" fill="currentColor"/><circle cx="16.5" cy="15" r="2.5" fill="currentColor"/><path class="off" d="M3 3l18 18"/></svg>',
    seaded: '<svg ' + SVG + '><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
  };
  function nupp(id, silt, ikoon, lisa) {
    return '<button class="icon-btn" id="' + id + '" aria-label="' + silt + '"' + (lisa || '') + '>' + ikoon + '</button>';
  }

  /* ---------- lehe mall ---------- */
  function leht(m) {
    var v = m.voistlus;
    var muusika = m.muusika && m.muusika.length;
    var valikud = (m.kiibid || []).map(function (x) {
      return '<div class="block">' +
        '<span class="label" id="lbl-' + x.id + '">' + esc(x.silt) + '</span>' +
        '<div class="chips" role="group" aria-labelledby="lbl-' + x.id + '" id="val-' + x.id + '"></div>' +
        (x.markus ? '<p class="hint-small" id="mark-' + x.id + '"></p>' : '') +
        '</div>';
    }).join('');
    var miks = m.miks || MIKS;
    var flagOpts = Object.keys(miks).map(function (k) {
      return '<button class="ghost" data-why="' + k + '">' + esc(miks[k]) + '</button>';
    }).join('');

    return '' +
    '<section id="s-home" class="screen">' +
      '<header class="top">' +
        '<a class="back" href="../">‹ Harjutaja</a>' +
        nupp('sfxBtn', 'Heliefektid', IKOON.heli, ' aria-pressed="true"') +
        (muusika ? nupp('musicBtn', 'Taustamuusika', IKOON.muusika, ' aria-pressed="false" data-muusika hidden') : '') +
        nupp('setBtn', 'Seaded', IKOON.seaded) +
      '</header>' +
      '<div class="hero">' +
        '<button class="mascot" id="mascot" aria-label="' + esc(m.maskotiNimi || m.nimi) + '"></button>' +
        '<h1>' + esc(m.nimi) + '</h1>' +
        '<p class="sub">' + esc(m.kirjeldus || '') + '</p>' +
      '</div>' +
      valikud +
      (v
        ? '<div class="two">' +
            '<button class="primary big" id="startBtn">Harjuta<small id="trainMeta"></small></button>' +
            '<button class="compete big" id="competeBtn"><span id="competeLbl">Võistle</span><small id="competeMeta"></small></button>' +
          '</div>' +
          '<p class="count-note" id="competeNote"></p>'
        : '<button class="primary big" id="startBtn">Harjuta<small id="trainMeta"></small></button>' +
          '<p class="count-note" id="startNote"></p>') +
      '<div class="block" id="klassBlock">' +
        '<span class="label">Klass</span>' +
        '<p class="klass-line" id="klassNote"></p>' +
        '<div class="row">' +
          '<button class="ghost" id="joinBtn">Liitu klassiga</button>' +
          '<button class="ghost" id="boardBtn" hidden>Edetabel</button>' +
        '</div>' +
      '</div>' +
      (m.kaart
        ? '<div class="block" id="kaartBlock">' +
            '<span class="label">' + esc(m.kaart.silt || 'Sinu oskused') + '</span>' +
            '<div id="' + (m.kaart.id || 'kaart') + '"></div>' +
            (m.kaart.markus ? '<p class="hint-small">' + esc(m.kaart.markus) + '</p>' : '') +
          '</div>'
        : '') +
      (m.abi
        ? '<details class="help"><summary>Kuidas see käib?</summary><div class="help-body">' + m.abi + '</div></details>'
        : '') +
      '<footer class="credit">Tegi <a href="https://silverjaanus.com" target="_blank" rel="noopener">Silver Jaanus</a></footer>' +
    '</section>' +

    '<section id="s-game" class="screen" hidden>' +
      '<header class="top">' +
        '<button class="icon-btn" id="quitBtn" aria-label="Lõpeta ring">✕</button>' +
        '<button class="icon-btn" id="prevBtn" aria-label="Vaata eelmist ülesannet" disabled>‹</button>' +
        '<div class="track"><i id="bar"></i></div>' +
        '<span class="loendur" id="loendur"></span>' +
        nupp('sfxBtnG', 'Heliefektid', IKOON.heli, ' aria-pressed="true"') +
        (muusika ? nupp('musicBtnG', 'Taustamuusika', IKOON.muusika, ' aria-pressed="false" data-muusika hidden') : '') +
      '</header>' +
      '<p class="quitnote" id="quitNote" role="status" hidden></p>' +
      '<div class="stage">' +
        '<div class="reviewbar" id="reviewBar" hidden>' +
          '<span id="reviewWhich">Vaatad eelmist ülesannet</span>' +
          '<button class="ghost" id="reviewBack">Tagasi mängu</button>' +
        '</div>' +
        '<div class="timer" id="timer" hidden><i id="timerFill"></i></div>' +
        (m.lava || '<p class="ask" id="askText" aria-live="polite"></p><div class="opts" id="opts"></div>') +
        '<div class="feedback" id="fb" aria-live="polite"></div>' +
        '<div class="hintcard" id="hint" hidden></div>' +
        '<div class="row" id="after" hidden><button class="primary" id="nextBtn">Edasi</button></div>' +
        '<p class="flag-note" id="flagNote" role="status" hidden></p>' +
        '<button class="flagbtn" id="flagBtn">Anna veast teada</button>' +
      '</div>' +
      '<div class="flagwrap" id="flagBox" hidden>' +
        '<div class="flagcard" role="dialog" aria-modal="true" aria-labelledby="flagTitle">' +
          '<h3 id="flagTitle">Anna veast teada</h3>' +
          '<p class="flag-sent" id="flagSentence"></p>' +
          '<span class="label">Mis on valesti?</span>' +
          '<div class="flagopts" id="flagOpts">' + flagOpts + '</div>' +
          '<button class="ghost flag-cancel" id="flagCancel">Sulge</button>' +
        '</div>' +
      '</div>' +
    '</section>' +

    '<section id="s-result" class="screen" hidden>' +
      '<div class="res-hero">' +
        '<div class="bubble" id="resTitle"></div>' +
        '<div id="resMaskott"></div>' +
        '<p class="sub" id="resSub"></p>' +
      '</div>' +
      '<div class="stats" id="resStats"></div>' +
      (m.tulemusLisa
        ? '<div class="block" id="resLisaBlock" hidden>' +
            '<span class="label">' + esc(m.tulemusLisa.silt || '') + '</span>' +
            (m.tulemusLisa.markus ? '<p class="hint-small">' + esc(m.tulemusLisa.markus) + '</p>' : '') +
            '<div id="resLisa"></div>' +
          '</div>'
        : '') +
      '<div class="block" id="resNextBlock" hidden>' +
        '<span class="label">Järgmisel korral harjutame</span>' +
        '<div class="words" id="resNext"></div>' +
      '</div>' +
      '<div class="row">' +
        '<button class="primary big" id="againBtn">Harjuta veel</button>' +
        '<button class="ghost" id="homeBtn">Koju</button>' +
      '</div>' +
    '</section>' +
    '<section id="s-board" class="screen" hidden></section>' +
    '<section id="s-settings" class="screen" hidden></section>';
  }

  /* Kui võistlust pole, vajavad tuumamoodulid ikka objekti, millelt küsida. */
  var POLE_VOISTLUST = { tehtud: function () { return false; }, margi: function () {}, joonista: function () {}, disarm: function () {} };

  function registreeri(m) {
    var app = $('app') || document.querySelector('main.app');
    app.innerHTML = leht(m);

    var KEY = m.id + '_v1';
    var D = HStore.load(KEY, null) || {};
    D.stats = D.stats || {};
    D.rounds = D.rounds || []; D.tests = D.tests || [];
    D.outbox = D.outbox || []; D.reports = D.reports || [];
    D.valik = D.valik || {};
    if (m.laadi) m.laadi(D);
    (m.kiibid || []).forEach(function (x) {
      var olemas = x.valikud.some(function (y) { return y.id === D.valik[x.id]; });
      if (!olemas) D.valik[x.id] = x.vaikimisi != null ? x.vaikimisi : x.valikud[0].id;
    });
    var save = function () { HStore.save(KEY, D); };
    var asjad = m.asjad;
    var ringiPikkus = m.ringiPikkus || 10;
    var v = m.voistlus || null;
    var round = null, lastWrong = [], selgedEnne = 0;

    var selged = m.selgedArv ? function () { return m.selgedArv(D); } : function () {
      return Object.keys(D.stats).filter(function (k) { return HEngine.mastered(D.stats[k]); }).length;
    };

    /* Võistlusring: kindel järjekord, kordusi ei ole. */
    function TestRound(items) { this.items = items; this.length = items.length; this.asked = 0; this.due = []; }
    TestRound.prototype.next = function () {
      if (this.asked >= this.length) return null;
      return { item: this.items[this.asked++], repeat: false };
    };
    TestRound.prototype.record = function (it, ok) {
      var s = D.stats[it.id] || (D.stats[it.id] = { n: 0, ok: 0, streak: 0, lastOk: false, t: 0 });
      s.n++; s.t = Date.now(); s.lastOk = ok;
      if (ok) { s.ok++; s.streak++; } else { s.streak = 0; }
    };

    var konksud = {};
    KONKSUD.forEach(function (k) { if (m[k]) konksud[k] = m[k]; });
    /* Ilma veateate konksuta peidab HMang nupu „Anna veast teada" ise. */
    if (m.voimed && m.voimed.veateade === false) delete konksud.veateade;

    var mang = HMang.loo({
      kus: m.kus,
      sek: v ? v.sek : 0,
      ekraanid: ['s-home', 's-game', 's-result', 's-board', 's-settings'],
      moodul: konksud,
      voimed: m.voimed,
      salvesta: function (q, ok) { round.record(q, ok, q.abi); save(); },
      lopp: function (G) {
        if (m.enneTulemust) m.enneTulemust(G);
        lastWrong = tulemus.naita(G, { uued: selged() - selgedEnne });
        if (m.tulemusLisa) {
          var host = $('resLisa'); host.innerHTML = '';
          var on = m.tulemusLisa.joonista(host, G, round);
          $('resLisaBlock').hidden = on === false || !host.children.length;
        }
      },
      kodu: koju,
      teata: function (t) { saatmine.teata(t); }
    });

    var voistlus = v ? HVoistlus.loo({
      D: D, save: save,
      nupp: $('competeBtn'), silt: $('competeLbl'), rida: $('competeNote'), lisarida: $('competeMeta'),
      kirjeldus: v.kirjeldus,
      alusta: function () { alusta('test'); }
    }) : POLE_VOISTLUST;

    var saatmine = HSaatmine.loo({
      D: D, save: save, moodul: m.id, op: m.op || m.id, liik: 'ulesanne',
      miks: m.miks || MIKS,
      lisa: function () { return { greens: selged(), state: { stats: D.stats, tests: D.tests, valik: D.valik } }; },
      tehtud: function () { voistlus.margi(); },
      auth: function () { D.board = null; save(); renderKlass(); }
    });

    function alusta(mode, focus) {
      var test = mode === 'test';
      if (m.ring) {
        round = m.ring(D, mode, focus || []);
        if (!round || !round.length) return;
        selgedEnne = selged();
        mang.alusta(round, test ? 'test' : 'train');
        if (m.ringAlgas) m.ringAlgas(round, D);
        return;
      }
      var items = m.pakk(D.valik, mode) || [];
      if (!test && focus && focus.length) {
        /* Sihitud ring: vead ees, aga koos teistega, et ring ei oleks üks ja sama. */
        var seen = {}, out = focus.slice();
        out.forEach(function (q) { seen[q.id] = 1; });
        items.slice().sort(function () { return Math.random() - 0.5; }).forEach(function (q) {
          if (out.length < Math.max(8, focus.length) && !seen[q.id]) { seen[q.id] = 1; out.push(q); }
        });
        items = out;
      }
      if (!items.length) return;
      if (test) items = items.slice(0, v.n);
      round = test ? new TestRound(items) : new HEngine.Round(items, D.stats, ringiPikkus);
      /* „Harjuta neid …": vead tulevad päriselt ette, iga teine ülesanne. */
      if (!test && focus && focus.length) {
        round.due = focus.map(function (q, i) { return { item: q, at: 1 + 2 * i }; });
      }
      selgedEnne = selged();
      mang.alusta(round, test ? 'test' : 'train');
      if (m.ringAlgas) m.ringAlgas(round, D);
    }

    var tulemus = HTulemus.loo({
      D: D, save: save, saatmine: saatmine, voistlus: voistlus, mang: mang, n: v ? v.n : ringiPikkus,
      maskott: m.maskott,
      alamTekst: m.alamTekst || '',
      selgeks: [asjad.yks, asjad.mitu],
      harjutaNeid: m.harjutaNeid || 'Harjuta neid uuesti',
      ringiLisa: function () { return { valik: JSON.parse(JSON.stringify(D.valik)) }; },
      kordus: m.kordus,
      veaRida: m.veaRida
    });

    /* ---------- avaleht ---------- */
    function renderValikud() {
      (m.kiibid || []).forEach(function (x) {
        var box = $('val-' + x.id); box.innerHTML = '';
        x.valikud.forEach(function (y) {
          var b = document.createElement('button');
          b.className = 'chip';
          b.textContent = y.nimi;
          b.setAttribute('aria-pressed', y.id === D.valik[x.id] ? 'true' : 'false');
          b.onclick = function () { D.valik[x.id] = y.id; save(); renderKodu(); };
          box.appendChild(b);
        });
        var mk = $('mark-' + x.id);
        if (mk) mk.textContent = typeof x.markus === 'function' ? x.markus(D.valik) : x.markus;
      });
    }

    function renderKlass() {
      var c = window.HKlass ? HKlass.current() : null;
      $('klassBlock').hidden = !(window.HKlass && HKlass.online());
      if (c && c.class_name) {
        $('klassNote').textContent = c.class_name + ' · ' + (c.nick || '');
        $('joinBtn').textContent = 'Vaheta klassi';
        $('boardBtn').hidden = false;
      } else {
        $('klassNote').textContent = 'Sa pole veel klassiga liitunud. Klassis saad võistelda sõpradega.';
        $('joinBtn').textContent = 'Liitu klassiga';
        $('boardBtn').hidden = true;
      }
      voistlus.joonista();
    }

    function renderKodu() {
      renderValikud();
      $('trainMeta').textContent = m.harjutaMeta ? m.harjutaMeta(D) : ringiPikkus + ' ' + asjad.mitu;
      if (m.kaart) m.kaart.joonista($(m.kaart.id || 'kaart'), D, D.valik);
      if (m.avaleht) m.avaleht(D);
      renderKlass();
    }

    function koju() {
      if (m.koju) m.koju();
      $('againBtn').textContent = 'Harjuta veel';
      renderKodu();
      mang.naita('s-home');
    }

    /* ---------- edetabel ja seaded ---------- */
    var edetabel = HEdetabel.loo({
      D: D, save: save, moodul: m.id, kus: m.kus, mang: mang, saatmine: saatmine, voistlus: voistlus,
      n: v ? v.n : 0, asjad: asjad.mitu,
      selged: {
        sakk: 'Selged ' + asjad.mitmus, yks: 'selge ' + asjad.yks, mitu: 'selget ' + asjad.mitu,
        selgitus: m.selgus || ''
      },
      kodu: function () { mang.koju(); }, klass: renderKlass,
      ilmaVoistluseta: !v
    });
    var openBoard = function () { edetabel.ava(); };
    var liitu = function () { HKlass.openJoin({ app: m.kus, onDone: function () { renderKlass(); openBoard(); } }); };
    HSeaded.loo({
      mang: mang, kodu: function () { mang.koju(); }, muusika: !!(m.muusika && m.muusika.length), liitu: liitu,
      lahkus: function () { D.board = null; save(); renderKlass(); }
    });

    /* ---------- sündmused ---------- */
    HSfx.nupp($('sfxBtn')); HSfx.nupp($('sfxBtnG'));
    if (m.muusika && m.muusika.length && window.HMuusika) {
      HMuusika.init({ src: m.muusika });
      HMuusika.nupp($('musicBtn')); HMuusika.nupp($('musicBtnG'));
    }
    if (v) $('competeMeta').textContent = v.n + ' ' + asjad.mitu;
    $('startBtn').onclick = function () { alusta('train'); };
    $('againBtn').onclick = function () { alusta('train', lastWrong); };
    $('homeBtn').onclick = function () { mang.koju(); };
    $('joinBtn').onclick = liitu;
    $('boardBtn').onclick = openBoard;

    $('mascot').innerHTML = m.maskott('wave', {});
    $('mascot').onclick = function () {
      HSfx.unlock(); HSfx.blip();
      var svg = $('mascot').querySelector('svg');
      if (!svg) return;
      svg.classList.remove('hop'); void svg.getBBox(); svg.classList.add('hop');
    };

    renderKodu();
    mang.naita('s-home');
    saatmine.saada();
    saatmine.saadaTeated();

    function kutse() {
      var k = /[#&]k=([A-Za-z0-9]{4,8})/.exec(location.hash || '');
      if (!k || !window.HKlass) return;
      history.replaceState(null, '', location.pathname);
      HKlass.openJoin({ code: k[1].toUpperCase(), app: m.kus, onDone: function () { renderKlass(); openBoard(); } });
    }
    window.addEventListener('hashchange', kutse);
    kutse();

    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('../sw.js').catch(function () {}); }

    var api = { D: D, save: save, mang: mang, alusta: alusta, koju: koju, joonista: renderKodu };
    window.HMoodul._aktiivne = api;
    return api;
  }

  window.HMoodul = { registreeri: registreeri, MIKS: MIKS };
})();
