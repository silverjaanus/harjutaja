/* Kell — analoogkella lugemine eesti keeles.
   Kaks ülesannet: „Mis kell on?" (kell ekraanil, vali sõnad) ja tagurpidi
   („Kell on pool neli. Milline kell seda näitab?"). */
(function () {
  'use strict';
  const KEY = "kell_v1";
  const D = HStore.load(KEY, { stats: {}, sfx: true, level: 2, rounds: [] });
  D.stats = D.stats || {}; D.rounds = D.rounds || [];
  D.level = D.level || 2;
  D.tests = D.tests || [];
  D.lastCompete = D.lastCompete || "";
  D.outbox = D.outbox || [];
  D.board = D.board || null;
  HSfx.enabled = D.sfx !== false;
  const save = () => HStore.save(KEY, D);
  const $ = id => document.getElementById(id);

  /* Raskusastmed. Iga aste lisab eelmisele juurde, nii et laps ei kaota
     varem õpitut. Nimed on lapse omad, mitte arendaja omad. */
  const TASEMED = [
    { id: 1, nimi: "Täistunnid", mins: [0] },
    { id: 2, nimi: "Ja pooled", mins: [0, 30] },
    { id: 3, nimi: "Ja veerandid", mins: [0, 15, 30, 45] },
    { id: 4, nimi: "Viie minuti täpsus", mins: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] },
  ];
  const tase = () => TASEMED.find(t => t.id === D.level) || TASEMED[1];

  const ROUND_LEN = 12;
  /* Võistluse reeglid: 20 küsimust, 10 sekundit igaüks, üks kord päevas.
     Võistlus kasutab ALATI viie minuti täpsust, olenemata sellest, mis taseme
     laps harjutamiseks valis — muidu poleks tulemused võrreldavad. */
  const COMPETE_N = 20, COMPETE_SEC = 10, COMPETE_MINS = TASEMED[3].mins;
  const MODULE = "kell", OP = "lugemine";
  const PRAISE = ["Õige!", "Täpselt!", "Tubli!", "Just nii!", "Väga hea!"];

  let round = null, cur = null, G = null, advanceTimer = null;
  let tickTimer = null, deadline = 0, boardTab = "week", competeArmed = false;

  const today = (d) => { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const competedToday = () => D.lastCompete === today();
  const bestTest = () => D.tests.reduce((b, t) => Math.max(b, t.ok), 0);
  const num = n => String(Math.round(n || 0));

  function show(id) {
    ["s-home", "s-game", "s-result", "s-board"].forEach(s => { $(s).hidden = s !== id; });
    window.scrollTo(0, 0);
  }

  /* ---------- küsimuste koostamine ---------- */
  const võti = t => t.h + ":" + t.m;

  /* Eksitajad on alati mõne TEISE aja õige vorm — mitte kunagi sama aja teine
     ütlemisviis. Eelistame vigu, mida laps päriselt teeb: tunninihe (pool neli
     vs pool kolm) ja peegeldus (veerand vs kolmveerand). */
  function eksitajad(h, m, mins) {
    const out = [], seen = {};
    seen[võti({ h, m })] = 1;
    const lisa = t => { if (!seen[võti(t)]) { seen[võti(t)] = 1; out.push(t); } };
    const nihe = d => ((h - 1 + d + 12) % 12) + 1;

    lisa({ h: nihe(Math.random() < 0.5 ? 1 : -1), m });

    let peegel = null;
    if (m === 15 && mins.indexOf(45) >= 0) peegel = 45;
    else if (m === 45 && mins.indexOf(15) >= 0) peegel = 15;
    else if (m === 0 && mins.indexOf(30) >= 0) peegel = 30;
    else if (m === 30 && mins.indexOf(0) >= 0) peegel = 0;
    else if (mins.indexOf(60 - m) >= 0) peegel = 60 - m;
    if (peegel !== null) lisa({ h, m: peegel });

    let kaitse = 0;
    while (out.length < 3 && kaitse++ < 300) {
      lisa({ h: 1 + Math.floor(Math.random() * 12), m: mins[Math.floor(Math.random() * mins.length)] });
    }
    return out.slice(0, 3);
  }

  function sega(arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }

  /* Harjutamise kaardipakk: kõik selle taseme ajad. lemma = minut, nii et
     kordamismootor ei küsi sama minutimustrit kaks korda järjest. */
  function pakk(mins) {
    const out = [];
    for (let h = 1; h <= 12; h++) for (const m of mins) out.push({ id: h + ":" + m, lemma: String(m), h, m });
    return out;
  }

  /* ---------- taimer (ainult võistluses) ---------- */
  function stopTimer() { clearInterval(tickTimer); tickTimer = null; $("timer").hidden = true; }
  function startTimer() {
    clearInterval(tickTimer);
    deadline = performance.now() + COMPETE_SEC * 1000;
    const fill = $("timerFill");
    $("timer").hidden = false;
    const tick = () => {
      const left = deadline - performance.now();
      fill.style.width = Math.max(0, Math.min(100, 100 * left / (COMPETE_SEC * 1000))) + "%";
      fill.classList.toggle("low", left <= 3000);
      if (left <= 0) { clearInterval(tickTimer); tickTimer = null; if (cur && !cur.done) answer(null); }
    };
    tick();
    tickTimer = setInterval(tick, 100);
  }

  /* ---------- võistlusring ---------- */
  function TestRound(items) { this.items = items; this.length = items.length; this.asked = 0; this.due = []; }
  TestRound.prototype.next = function () {
    if (this.asked >= this.length) return null;
    return { item: this.items[this.asked++], repeat: false };
  };
  TestRound.prototype.record = function (it, ok) { salvesta(it, ok); };

  function salvesta(it, ok) {
    const s = D.stats[it.lemma] || (D.stats[it.lemma] = { n: 0, ok: 0, streak: 0, lastOk: false, t: 0 });
    s.n++; s.t = Date.now(); s.lastOk = ok;
    if (ok) { s.ok++; s.streak++; } else { s.streak = 0; }
  }

  function võistluspakk() {
    const kõik = sega(pakk(COMPETE_MINS));
    const out = [], nähtud = {};
    for (const it of kõik) {                       // sama minutimuster mitte liiga tihti
      const k = it.lemma;
      nähtud[k] = (nähtud[k] || 0) + 1;
      if (nähtud[k] > 2) continue;
      out.push(it);
      if (out.length >= COMPETE_N) break;
    }
    return out;
  }

  /* ---------- mäng ---------- */
  function start(mode) {
    HSfx.unlock();
    const test = mode === "test";
    const mins = test ? COMPETE_MINS : tase().mins;
    const p = test ? võistluspakk() : pakk(mins);
    if (!p.length) return;
    round = test ? new TestRound(p) : new HEngine.Round(p, D.stats, ROUND_LEN);
    G = { mode: test ? "test" : "train", n: 0, ok: 0, wrong: [], mins, t0: Date.now() };
    show("s-game");
    next();
  }

  function next() {
    clearTimeout(advanceTimer);
    stopTimer();
    const q = round.next();
    if (!q) return finish();
    cur = q.item; cur.done = false;
    /* Kaks ülesannet vaheldumisi: iga kolmas on tagurpidi. Võistluses sama
       jaotus, et formaat oleks kõigil ühesugune. */
    cur.tyyp = (round.asked % 3 === 0) ? "vali-kell" : "mis-kell";
    renderQuestion(cur);
    const total = round.length + round.due.length;
    $("bar").style.width = Math.min(100, 100 * (round.asked - 1) / Math.max(total, 1)) + "%";
    if (G.mode === "test") startTimer();
  }

  function renderQuestion(it) {
    const mins = G.mins;
    const kõik = sega([{ h: it.h, m: it.m }].concat(eksitajad(it.h, it.m, mins)));
    const opts = $("opts");
    opts.innerHTML = "";
    $("fb").textContent = ""; $("fb").className = "feedback";
    $("hint").hidden = true; $("after").hidden = true;

    if (it.tyyp === "mis-kell") {
      $("askClock").innerHTML = HSihverplaat.svg(it.h, it.m, { size: 210 });
      $("askClock").hidden = false;
      $("askText").textContent = "Mis kell on?";
      opts.className = "opts sõnad";
      kõik.forEach(t => {
        const b = document.createElement("button");
        b.className = "opt"; b.textContent = HAeg.utle(t.h, t.m);
        b.onclick = () => answer(t);
        b.dataset.k = võti(t);
        opts.append(b);
      });
    } else {
      $("askClock").hidden = true;
      $("askText").textContent = "Kell on " + HAeg.utle(it.h, it.m) + ". Milline kell seda näitab?";
      opts.className = "opts kellad";
      kõik.forEach(t => {
        const b = document.createElement("button");
        b.className = "opt kellopt"; b.innerHTML = HSihverplaat.svg(t.h, t.m, { size: 130 });
        b.setAttribute("aria-label", "kell " + HAeg.utle(t.h, t.m));
        b.onclick = () => answer(t);
        b.dataset.k = võti(t);
        opts.append(b);
      });
    }
  }

  function vihje(it) {
    const m = it.m, j = HAeg.utle(it.h, it.m);
    if (m === 0) return "Kui pikk osuti on kaheteistkümne peal, on täistund. Lühike osuti näitab, mitu — <b>" + j + "</b>.";
    if (m === 30) return "Pool tundi on veel <b>minemata</b>, seepärast öeldakse järgmise tunni järgi: <b>" + j + "</b>, mitte pool kolm.";
    if (m === 15) return "Veerand tundi on <b>tehtud</b> ja kolm veerandit veel ees. Eesti keeles öeldakse selle tunni järgi, kuhu jõuame: <b>" + j + "</b>.";
    if (m === 45) return "Kolm veerandit on tehtud, üks veerand jäänud. Seepärast <b>" + j + "</b> — nimetatakse tundi, kuhu jõuame.";
    if (m < 30) return "Pikk osuti on alles teel: tund <b>" + HAeg.utle(it.h, 0) + "</b> on läbi ja minuteid on juurde tulnud. <b>" + j + "</b>.";
    return "Pikk osuti on juba üle poole: loeme, kui palju on järgmise tunnini <b>puudu</b>. <b>" + j + "</b>.";
  }

  function answer(valik) {
    const it = cur; if (!it || it.done) return; it.done = true;
    stopTimer();
    const test = G.mode === "test";
    const õige = võti({ h: it.h, m: it.m });
    const ok = !!valik && võti(valik) === õige;
    round.record(it, ok); save();
    G.n++; if (ok) G.ok++; else if (!G.wrong.some(w => w.id === it.id)) G.wrong.push(it);

    [...$("opts").children].forEach(b => {
      b.disabled = true;
      if (b.dataset.k === õige) b.classList.add("right");
      else if (valik && b.dataset.k === võti(valik)) b.classList.add("wrong");
    });

    if (ok) {
      HSfx.ok();
      $("fb").textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      $("fb").className = "feedback ok";
      advanceTimer = setTimeout(() => { advanceTimer = null; next(); }, test ? 800 : 1000);
      return;
    }
    HSfx.bad();
    $("fb").textContent = (valik === null ? "Aeg sai otsa. " : "") + "Kell on " + HAeg.utle(it.h, it.m) + ".";
    $("fb").className = "feedback bad";
    if (test) {
      advanceTimer = setTimeout(() => { advanceTimer = null; next(); }, 1400);
      return;
    }
    $("hint").innerHTML = KKagu("kind", { head: true }) + '<div class="hinttext">' + vihje(it) + "</div>";
    $("hint").hidden = false;
    $("after").hidden = false;
  }

  /* ---------- tulemus ---------- */
  function statKast(stats, big, small) {
    const d = document.createElement("div"); d.className = "stat";
    const b = document.createElement("b"); b.textContent = big;
    const s = document.createElement("span"); s.textContent = small;
    d.append(b, s); stats.append(d);
  }

  function finish() {
    stopTimer();
    const pct = G.n ? G.ok / G.n : 0;
    if (G.mode === "test") return finishCompete(pct);
    D.rounds.push({ t: Date.now(), n: G.n, ok: G.ok, level: D.level });
    if (D.rounds.length > 20) D.rounds.shift();
    save();
    let title, sub = "", mood = "happy";
    if (G.n < 4) { title = "Hea algus!"; mood = "wave"; }
    else if (pct >= 0.9) { title = "Suurepärane!"; mood = "cheer"; HSfx.tada(); }
    else if (pct >= 0.7) { title = "Hästi tehtud!"; mood = "happy"; }
    else { title = "Hästi harjutatud!"; mood = "kind"; sub = "Kell on keeruline asi. Iga ring teeb selle selgemaks."; }
    $("resKagu").innerHTML = KKagu(mood);
    $("resTitle").textContent = title; $("resSub").textContent = sub; $("resSub").hidden = !sub;
    const stats = $("resStats"); stats.innerHTML = "";
    statKast(stats, G.ok + " / " + G.n, "õigesti");
    näitaVead();
    $("againBtn").textContent = "Harjuta veel";
    show("s-result");
  }

  function näitaVead() {
    const nb = $("resNext"); nb.innerHTML = "";
    G.wrong.slice(0, 6).forEach(it => {
      const s = document.createElement("span");
      s.className = "vaeg";
      s.innerHTML = HSihverplaat.svg(it.h, it.m, { size: 54, numbers: false }) +
        "<small>" + HAeg.utle(it.h, it.m) + "</small>";
      nb.append(s);
    });
    $("resNextBlock").hidden = !G.wrong.length;
  }

  function finishCompete(pct) {
    D.tests.push({ t: Date.now(), n: G.n, ok: G.ok });
    if (D.tests.length > 40) D.tests.shift();
    const prevBest = D.tests.slice(0, -1).reduce((b, t) => Math.max(b, t.ok), 0);
    D.lastCompete = today();
    const avg = G.n ? (Date.now() - G.t0) / 1000 / G.n : 0;
    D.outbox.push({ module: MODULE, mode: "test", op: OP, n: G.n, ok: G.ok, score: G.ok, avg: Math.round(avg * 10) / 10 });
    save();
    flushOutbox();

    const record = G.ok > prevBest && D.tests.length > 1;
    let title, sub = "Uus võistlus on homme.", mood = "happy";
    if (G.ok === G.n) { title = "Kõik õiged!"; mood = "cheer"; HSfx.tada(); }
    else if (record) { title = "Uus rekord!"; mood = "cheer"; HSfx.tada(); }
    else if (pct >= 0.8) { title = "Tugev ring!"; mood = "cheer"; }
    else if (pct >= 0.5) { title = "Tubli võistlus!"; mood = "happy"; }
    else { title = "Võistlus tehtud!"; mood = "kind"; sub = "Harjutamine tõstab tulemust. Homme saad uuesti võistelda."; }
    $("resKagu").innerHTML = KKagu(mood);
    $("resTitle").textContent = title; $("resSub").textContent = sub; $("resSub").hidden = false;
    const stats = $("resStats"); stats.innerHTML = "";
    statKast(stats, G.ok + " / " + G.n, "õigesti");
    statKast(stats, String(bestTest()), record ? "uus rekord" : "sinu rekord");
    näitaVead();
    $("againBtn").textContent = "Harjuta neid kellaaegu";
    show("s-result");
  }

  /* ---------- tulemuste saatmine ---------- */
  function flushOutbox() {
    if (!window.HKlass || !HKlass.online() || !HKlass.current() || !D.outbox.length) return Promise.resolve();
    const it = D.outbox[0];
    return HKlass.report(Object.assign({}, it, {
      greens: selged(),
      state: D.outbox.length === 1 ? { stats: D.stats, tests: D.tests, level: D.level } : null
    })).then(r => {
      if (r && r.error === "auth") { D.outbox = []; HKlass.clear(); save(); renderKlass(); return; }
      D.outbox.shift(); save();
      return flushOutbox();
    }).catch(() => {});
  }

  /* „Selge" on minutimuster, mille laps on kaks korda järjest õigesti öelnud. */
  const selged = () => TASEMED[3].mins.filter(m => HEngine.mastered(D.stats[String(m)])).length;

  /* ---------- avaleht ---------- */
  function renderTasemed() {
    const box = $("levels"); box.innerHTML = "";
    TASEMED.forEach(t => {
      const b = document.createElement("button");
      b.className = "chip"; b.textContent = t.nimi;
      b.setAttribute("aria-pressed", t.id === D.level ? "true" : "false");
      b.onclick = () => { D.level = t.id; save(); renderTasemed(); renderKaart(); };
      box.append(b);
    });
  }

  /* Väike kaart: iga minutimuster ja kui selge see on. */
  function renderKaart() {
    const box = $("map"); box.innerHTML = "";
    tase().mins.forEach(m => {
      const s = D.stats[String(m)];
      const d = document.createElement("div");
      d.className = "mcell" + (HEngine.mastered(s) ? " g" : (s && s.n ? " y" : ""));
      d.innerHTML = HSihverplaat.svg(12, m, { size: 46, numbers: false }) +
        "<small>" + HAeg.utle(12, m) + "</small>";
      box.append(d);
    });
  }

  function renderKlass() {
    const c = window.HKlass ? HKlass.current() : null;
    const note = $("klassNote");
    if (c && c.class_name) {
      note.textContent = c.class_name + " · " + (c.nick || "");
      $("joinBtn").textContent = "Vaheta klassi";
      $("boardBtn").hidden = false;
    } else {
      note.textContent = "Sa pole veel klassis. Klassis saad võistelda sõpradega.";
      $("joinBtn").textContent = "Liitu klassiga";
      $("boardBtn").hidden = true;
    }
    renderCompete();
  }

  function renderCompete() {
    const b = $("competeBtn"), n = $("competeNote");
    competeArmed = false;
    b.classList.remove("armed");
    if (competedToday()) {
      b.textContent = "Võistlus tehtud";
      b.disabled = true;
      n.textContent = "Võistelda saab üks kord päevas. Uus ring homme.";
      return;
    }
    b.disabled = false;
    b.textContent = "Võistle";
    n.textContent = COMPETE_N + " kellaaega, igale " + COMPETE_SEC + " sekundit. Võistluses on alati viie minuti täpsus, et tulemused oleksid võrreldavad.";
  }

  function onCompete() {
    if (competedToday()) return;
    if (!competeArmed) {
      competeArmed = true;
      $("competeBtn").textContent = "Alustame?";
      $("competeBtn").classList.add("armed");
      $("competeNote").textContent = "Tulemus läheb kirja ka siis, kui ring läheb halvasti. Vajuta veel kord.";
      return;
    }
    competeArmed = false;
    $("competeBtn").classList.remove("armed");
    start("test");
  }

  /* ---------- edetabel ---------- */
  function openBoard() { show("s-board"); renderBoard(); flushOutbox().then(loadBoard); }

  function loadBoard() {
    if (!window.HKlass || !HKlass.current()) return;
    $("bStatus").textContent = "Laadin…";
    return HKlass.board(MODULE).then(r => {
      if (r && r.error === "auth") { HKlass.clear(); D.board = null; save(); renderKlass(); show("s-home"); return; }
      if (!r || r.error) { $("bStatus").textContent = "Ei õnnestunud."; return; }
      D.board = r;
      if (r.competed_today) D.lastCompete = today();
      save(); renderBoard(); renderCompete();
      $("bStatus").textContent = "";
    }).catch(() => {
      renderBoard();
      $("bStatus").textContent = D.board ? "Internetti pole. Näitan viimast seisu." : "Internetti pole.";
    });
  }

  function boardHint(tab, grade) {
    const g = grade ? grade + ". klassid" : "sama astme klassid";
    if (tab === "week") return "Nädalapunktid on sinu viie parima päeva õiged vastused kokku. Nädalavahetusel ei pea mängima.";
    if (tab === "sure") return "Selge on kellaaeg, mille oled kaks korda järjest õigesti öelnud. Kokku on neid kaksteist.";
    if (tab === "best") return "Sinu kõige parem võistlus. Igas võistluses on " + COMPETE_N + " kellaaega.";
    if (tab === "school") return "Sinu kooli teised " + g + ". Võrdleme punkte ühe võistleja kohta, mitte kogusummat.";
    return "Kõik Eesti " + g + ". Punktid ühe võistleja kohta.";
  }

  function renderBoard() {
    const b = D.board;
    const c = window.HKlass ? HKlass.current() : null;
    $("bClass").textContent = b && b.class ? b.class.name : (c ? c.class_name : "");
    $("bHint").textContent = boardHint(boardTab, b && b.class && b.class.grade);
    document.querySelectorAll("#bTabs .chip").forEach(x => x.setAttribute("aria-pressed", x.dataset.t === boardTab ? "true" : "false"));
    const list = $("bList"); list.innerHTML = "";
    if (!b) { $("bStatus").textContent = $("bStatus").textContent || "Laadin edetabelit…"; return; }

    const days = n => !n ? "" : (n === 1 ? "1 võistluspäev" : n + " võistluspäeva");
    const players = n => n === 1 ? "1 võistleja" : (n || 0) + " võistlejat";

    let rows = [];
    if (boardTab === "week") rows = (b.players || []).map(p => ({ name: p.nick, v: p.week_n, sub: days(p.days), me: p.id === b.me })).sort((x, y) => y.v - x.v);
    else if (boardTab === "sure") rows = (b.players || []).map(p => ({ name: p.nick, v: p.greens, sub: "selget kellaaega", me: p.id === b.me })).sort((x, y) => y.v - x.v);
    else if (boardTab === "best") rows = (b.players || []).map(p => ({ name: p.nick, v: p.best_test, sub: "õiget parimas võistluses", me: p.id === b.me })).sort((x, y) => y.v - x.v);
    else if (boardTab === "school") rows = (b.siblings || []).map(g => ({ name: g.name, v: g.per_player, sub: players(g.active), me: b.class && g.id === b.class.id }));
    else rows = (b.peers || []).map(g => ({ name: g.name, v: g.per_player, sub: (g.school || ""), me: b.class && g.id === b.class.id }));

    if (!rows.length) {
      const li = document.createElement("li");
      li.className = "brow empty";
      li.textContent = (boardTab === "school" || boardTab === "country")
        ? "Siin pole veel kedagi. Klass ilmub siia pärast esimest võistlust."
        : "Keegi pole veel võistelnud. Ole esimene!";
      list.append(li);
      return;
    }
    rows.forEach((r, i) => {
      const li = document.createElement("li");
      li.className = "brow" + (r.me ? " me" : "");
      const pos = document.createElement("b"); pos.className = "pos"; pos.textContent = (i + 1) + ".";
      const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = r.name || "";
      const sb = document.createElement("small"); sb.textContent = r.sub || "";
      const v = document.createElement("b"); v.className = "val"; v.textContent = num(r.v);
      const mid = document.createElement("span"); mid.className = "mid"; mid.append(nm, sb);
      li.append(pos, mid, v);
      list.append(li);
    });
  }

  function invite() {
    const c = window.HKlass ? HKlass.current() : null;
    if (!c) return;
    const url = location.origin + location.pathname + "#k=" + encodeURIComponent(c.code);
    const text = "Liitu minu klassiga Harjutajas! Klassikood on " + c.code + ". " + url;
    const note = $("bInviteNote");
    if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        note.textContent = "Kutse on kopeeritud — kleebi see sõbrale sõnumisse.";
        note.hidden = false;
      }).catch(() => { note.textContent = "Klassikood on " + c.code + "."; note.hidden = false; });
      return;
    }
    note.textContent = "Klassikood on " + c.code + ".";
    note.hidden = false;
  }

  function goHome() {
    stopTimer(); clearTimeout(advanceTimer); advanceTimer = null;
    cur = null;
    $("againBtn").textContent = "Harjuta veel";
    renderTasemed(); renderKaart(); renderKlass(); show("s-home");
  }

  /* ---------- sündmused ---------- */
  $("sfxBtn").setAttribute("aria-pressed", HSfx.enabled ? "true" : "false");
  $("sfxBtn").onclick = () => {
    HSfx.enabled = !HSfx.enabled; D.sfx = HSfx.enabled; save();
    $("sfxBtn").setAttribute("aria-pressed", HSfx.enabled ? "true" : "false");
  };
  $("startBtn").onclick = () => start("train");
  $("competeBtn").onclick = onCompete;
  $("nextBtn").onclick = next;

  let quitArmed = false;
  $("quitBtn").onclick = () => {
    if (G && G.mode === "test" && G.n && !quitArmed) {
      quitArmed = true;
      $("fb").textContent = "Kindel? Pooleli ring läheb ikka kirja. Vajuta ✕ veel kord.";
      $("fb").className = "feedback bad";
      setTimeout(() => { quitArmed = false; }, 4000);
      return;
    }
    quitArmed = false;
    if (G && G.n) finish(); else goHome();
  };

  $("againBtn").onclick = () => start("train");
  $("homeBtn").onclick = goHome;
  $("joinBtn").onclick = () => HKlass.openJoin({ onDone: () => { renderKlass(); openBoard(); } });
  $("boardBtn").onclick = openBoard;
  $("bBack").onclick = goHome;
  $("bRefresh").onclick = () => flushOutbox().then(loadBoard);
  $("bInvite").onclick = invite;
  $("bTabs").addEventListener("click", e => {
    const c = e.target.closest(".chip"); if (!c) return;
    boardTab = c.dataset.t; renderBoard();
  });

  document.addEventListener("keydown", e => {
    if ($("s-game").hidden || !cur) return;
    if (e.key === "Enter" && cur.done && !$("after").hidden) { e.preventDefault(); next(); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4 && !cur.done) {
      const b = $("opts").children[n - 1];
      if (b) b.click();
    }
  });

  $("mascot").innerHTML = KKagu("wave");
  $("mascot").onclick = () => {
    HSfx.unlock(); HSfx.ok();
    const svg = $("mascot").querySelector("svg");
    svg.classList.remove("hop"); void svg.getBBox(); svg.classList.add("hop");
  };

  /* Nüüdiskell abitekstis, et laps näeks kohe päris näidet. */
  (function () {
    const n = new Date();
    $("nowClock").innerHTML = HSihverplaat.svg(n.getHours(), n.getMinutes(), { size: 96 });
    $("nowText").textContent = "Praegu on kell " + HAeg.utle(n.getHours(), n.getMinutes()) + ".";
  })();

  renderTasemed(); renderKaart(); renderKlass();
  flushOutbox();

  function maybeInvite() {
    const m = /[#&]k=([A-Za-z0-9]{4,8})/.exec(location.hash || "");
    if (!m || !window.HKlass) return;
    history.replaceState(null, "", location.pathname);
    HKlass.openJoin({ code: m[1].toUpperCase(), onDone: () => { renderKlass(); openBoard(); } });
  }
  window.addEventListener("hashchange", maybeInvite);
  maybeInvite();

  if ("serviceWorker" in navigator) { navigator.serviceWorker.register("../sw.js").catch(() => {}); }
})();
