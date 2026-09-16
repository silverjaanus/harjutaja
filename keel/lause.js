/* Keele mooduli puhas loogika (ilma DOM-ita, node'ist testitav: keel/lause.test.js).

   1. Vastuse võrdlus. Õpetaja kontrollib, kas laps oskab rea KIRJUTADA —
      seega loeb õigekiri. Ei loe: suured ja väikesed tähed, lõpumärk,
      topelttühik ja ülakoma kuju (’ ja '). Õige rida näidatakse ikka suure
      algustähe ja punktiga, et laps näeks õiget kuju.
   2. Sõnade kaupa erinevus: vale vastuse järel märgitakse õiges reas need
      sõnad, mis lapsel puudusid või olid valesti kirjutatud.
   3. Sammud. Iga rida läbib viis sammu:
        tutvu — rida, tähendus ja kõla; laps loeb valjult ette
        lunk  — üks sõna on puudu, laps kirjutab selle (heli ainult abiks)
        kokku — kõik sõnad on segamini, laps paneb järjekorda
        kuula — rida kõlab, eesti tähendus on näha, laps kirjutab
        tolgi — ainult eesti lause, laps kirjutab (nii kontrollib õpetaja)
      Esimesed neli on läbitud pärast üht õiget vastust. „tolgi" on selge
      alles siis, kui see on läinud õigesti ILMA kuulamisabita KAHES eri ringis
      (Fable ja Codex 15. sept: kaks õnnestumist ajas lahus, mitte järjest).
   4. Ring: kuni 5 rida, igaüks kuni 3 sammu, sammud vaheldumisi
      (esmalt iga rea esimene samm, siis teine …). Vale vastus tuleb samas
      ringis 3–5 ülesande pärast tagasi, kuni kaks korda. */
(function (root) {
  'use strict';

  var SAMMUD = ['tutvu', 'lunk', 'kokku', 'kuula', 'tolgi'];
  var RINGIS_RIDU = 5, RINGIS_SAMME = 3;

  /* ---------- võrdlus ---------- */
  function puhasta(s) {
    return String(s == null ? '' : s)
      .replace(/[\u2018\u2019\u02BC`\u00B4]/g, "'")
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,!?])/g, '$1')
      .trim();
  }
  function norm(s) {
    return puhasta(s).toLowerCase().replace(/[.!?]+$/, '').trim();
  }
  /* Sõna võrdlemiseks: väiketähed, kirjavahemärgid maha. */
  function sonaNorm(w) { return norm(w).replace(/[.,!?;:"]/g, ''); }

  function kontrolli(oige, vastus) {
    return norm(vastus) !== '' && norm(vastus) === norm(oige);
  }

  /* Sõnad nii, nagu need kaartidel on: kirjavahemärk jääb sõna külge
     („door."), suurtäht jääb alles. */
  function sonad(s) { return puhasta(s).split(' ').filter(Boolean); }

  /* Õige rea sõnad koos märkega: ok=false, kui see sõna lapse vastuses
     puudus või oli valesti. Joondus pikima ühise alamjada järgi. */
  function vordle(oige, vastus) {
    var a = sonad(oige), b = sonad(vastus);
    var A = a.map(sonaNorm), B = b.map(sonaNorm);
    var n = A.length, m = B.length, i, j;
    var L = [];
    for (i = 0; i <= n; i++) { L.push([]); for (j = 0; j <= m; j++) L[i].push(0); }
    for (i = n - 1; i >= 0; i--)
      for (j = m - 1; j >= 0; j--)
        L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var ok = a.map(function () { return false; });
    i = 0; j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { ok[i] = true; i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) i++;
      else j++;
    }
    return a.map(function (w, k) { return { sona: w, ok: ok[k] }; });
  }

  /* Õige kuju: suur algustäht; lausel (mitte algvormis fraasil) lõpumärk. */
  function kuju(en) { return puhasta(en); }

  /* ---------- lünk ---------- */
  /* Lünga sõna + kaks eksitajat teiste ridade lünkadest (sama tunni sõnad).
     Eksitajad on väiketähega, kui lünk on väiketähega, et suurtäht ei
     annaks vastust ette. */
  function lunk(rida, koik, juhus) {
    juhus = juhus || Math.random;
    var w = sonad(rida.en);
    var idx = -1;
    for (var k = 0; k < w.length; k++) if (sonaNorm(w[k]) === sonaNorm(rida.lunk)) { idx = k; break; }
    if (idx < 0) idx = w.length - 1;
    var puhas = w[idx].replace(/[.,!?]+$/, '');
    var lopp = w[idx].slice(puhas.length);
    var suur = /^[A-Z]/.test(puhas);
    var teised = koik.filter(function (r) { return r.id !== rida.id && r.lunk; })
      .map(function (r) { return r.lunk; })
      .filter(function (x, i, arr) { return arr.indexOf(x) === i && sonaNorm(x) !== sonaNorm(puhas); });
    segamini(teised, juhus);
    var kuju_ = function (x) {
      x = x.toLowerCase();
      return suur ? x.charAt(0).toUpperCase() + x.slice(1) : x;
    };
    var valikud = [puhas].concat(teised.slice(0, 2).map(kuju_));
    segamini(valikud, juhus);
    return { sonad: w, koht: idx, oige: puhas, lopp: lopp, valikud: valikud };
  }

  function segamini(arr, juhus) {
    juhus = juhus || Math.random;
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(juhus() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* Kaardid kokkupanekuks: segamini, aga mitte õiges järjekorras. */
  function kaardid(en, juhus) {
    var w = sonad(en);
    var k = w.map(function (s, i) { return { i: i, s: s }; });
    for (var t = 0; t < 10; t++) {
      segamini(k, juhus);
      if (k.some(function (x, i) { return x.i !== i; })) break;
    }
    return k;
  }

  /* ---------- sammud ---------- */
  function voti(reaId, samm) { return reaId + ':' + samm; }

  function tolgiSelge(s) { return !!(s && s.ringid && s.ringid.length >= 2); }

  function sammLabi(stats, reaId, samm) {
    var s = stats[voti(reaId, samm)];
    if (samm === 'tolgi') return tolgiSelge(s);
    return !!(s && s.labi);
  }

  /* Rea praegune samm (indeks sammude loendis); loendi pikkus = rida on selge.
     sammud: vaikimisi lausete viis sammu; ekraanisõnadel oma nimekiri (sonad.js). */
  function samm(stats, reaId, sammud) {
    sammud = sammud || SAMMUD;
    for (var i = 0; i < sammud.length; i++) if (!sammLabi(stats, reaId, sammud[i])) return i;
    return sammud.length;
  }
  function selge(stats, reaId, sammud) { return samm(stats, reaId, sammud) >= (sammud || SAMMUD).length; }

  /* Kirjuta tulemus statistikasse. abi = tõlkimisel kasutati kuulamist. */
  function salvesta(stats, q, ok, ringId, abi) {
    var k = voti(q.rida.id, q.samm);
    var s = stats[k] || (stats[k] = { n: 0, ok: 0, streak: 0, lastOk: false, t: 0 });
    s.n++; s.t = Date.now();
    var arvesta = ok && !abi;
    s.lastOk = arvesta;
    if (arvesta) { s.ok++; s.streak++; } else s.streak = 0;
    if (q.samm === 'tolgi') {
      s.ringid = s.ringid || [];
      if (arvesta) { if (s.ringid.indexOf(ringId) < 0) s.ringid.push(ringId); }
      else if (!ok) s.ringid = [];     /* unustatud rida tuleb uuesti selgeks teha */
    } else if (arvesta) {
      s.labi = true;
    }
    return s;
  }

  /* ---------- ring ---------- */
  function Ring(read, stats, opts) {
    opts = opts || {};
    var S = opts.sammud || SAMMUD;
    this.stats = stats;
    this.liik = opts.liik || 'lause';
    this.id = opts.ringId || String(Date.now());
    this.q = [];         // ootel ülesanded
    this.due = [];       // vale vastuse kordused (HMang loeb pikkust)
    this.asked = 0;
    this.repeats = {};
    this.valitud = [];
    var pooleli = read.filter(function (r) { return !selge(stats, r.id, S); });
    var valmis = read.filter(function (r) { return selge(stats, r.id, S); });
    if (opts.fookus && opts.fookus.length) {
      var f = opts.fookus;
      pooleli = pooleli.filter(function (r) { return f.indexOf(r.id) >= 0; })
        .concat(pooleli.filter(function (r) { return f.indexOf(r.id) < 0; }));
    }
    valmis.sort(function (a, b) {
      var ta = (stats[voti(a.id, 'tolgi')] || {}).t || 0, tb = (stats[voti(b.id, 'tolgi')] || {}).t || 0;
      return ta - tb;
    });
    var n = opts.ridu || RINGIS_RIDU;
    var valik = pooleli.slice(0, n);
    var korrata = valmis.slice(0, n - valik.length);
    var plaan = [];
    valik.forEach(function (r) {
      var algus = samm(stats, r.id, S), p = [];
      for (var i = algus; i < S.length && p.length < RINGIS_SAMME; i++) p.push(S[i]);
      plaan.push({ rida: r, sammud: p });
    });
    korrata.forEach(function (r) { plaan.push({ rida: r, sammud: ['tolgi'] }); });
    this.valitud = plaan.map(function (p) { return p.rida; });
    for (var kord = 0; kord < RINGIS_SAMME; kord++)
      plaan.forEach(function (p) {
        if (p.sammud[kord]) this.q.push(uus(p.rida, p.sammud[kord], false, this.liik));
      }, this);
    this.length = this.q.length;
  }
  function uus(rida, samm_, kordus, liik) {
    return { id: voti(rida.id, samm_), lemma: rida.id, rida: rida, samm: samm_, kordus: !!kordus, liik: liik || 'lause' };
  }
  Ring.prototype.next = function () {
    this.asked++;
    for (var i = 0; i < this.due.length; i++) {
      if (this.due[i].at <= this.asked) {
        var d = this.due.splice(i, 1)[0];
        this.length++;   /* kordus on lisaülesanne: loendur „N / M" jääb õigeks */
        return { item: d.item, repeat: true };
      }
    }
    if (this.q.length) return { item: this.q.shift(), repeat: false };
    if (this.due.length) { this.length++; return { item: this.due.shift().item, repeat: true }; }
    return null;
  };
  /* ok = vastus oli õige; abi = kuulamisabi (õige, aga ei loe). */
  Ring.prototype.record = function (it, ok, abi) {
    salvesta(this.stats, it, ok, this.id, abi);
    if (ok && !abi) return;
    this.repeats[it.id] = (this.repeats[it.id] || 0) + 1;
    if (this.repeats[it.id] > 2) return;
    this.due.push({ item: uus(it.rida, it.samm, true, it.liik), at: this.asked + 3 + Math.floor(Math.random() * 3) });
  };

  var api = {
    SAMMUD: SAMMUD, puhasta: puhasta, norm: norm, kontrolli: kontrolli, sonad: sonad,
    vordle: vordle, sonaNorm: sonaNorm, kuju: kuju, lunk: lunk, kaardid: kaardid, segamini: segamini,
    voti: voti, samm: samm, selge: selge, sammLabi: sammLabi, salvesta: salvesta, Ring: Ring
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KLause = api;
})(this);
