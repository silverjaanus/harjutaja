/* Kirjutaja — õigekirjamäng: kuula sõna, vali lünka g/k/kk, b/p/pp või d/t/tt. */
(function () {
  const DATA = window.KIRJUTAJA_DATA || { items: [], total: 0 };
  const KEY = "kirjutaja_v1";
  const D = HStore.load(KEY, { stats: {}, sfx: true, rounds: [] });
  D.stats = D.stats || {}; D.rounds = D.rounds || []; D.reports = D.reports || [];
  D.tests = D.tests || [];          // võistlusringid: {t, n, ok}
  D.lastCompete = D.lastCompete || "";
  D.outbox = D.outbox || [];        // saatmata võistlustulemused
  D.board = D.board || null;        // viimane edetabel, et võrguta ka midagi näidata
  HSfx.enabled = D.sfx !== false;
  const save = () => HStore.save(KEY, D);
  const $ = id => document.getElementById(id);

  const SERIES = { g: "k", k: "k", kk: "k", b: "p", p: "p", pp: "p", d: "t", t: "t", tt: "t" };
  const LEN = a => (a === "g" || a === "b" || a === "d") ? "lyhike" : (a.length === 2 ? "ylipikk" : "pikk");
  const CELL_LETTERS = { k: ["g", "k", "kk"], p: ["b", "p", "pp"], t: ["d", "t", "tt"] };
  const LENS = ["lyhike", "pikk", "ylipikk"];
  const LEN_LABEL = { lyhike: "lühike", pikk: "pikk", ylipikk: "ülipikk" };
  const ROUND_LEN = 15;
  /* Võistluse reeglid (Silveri otsus 13. sept): 20 sõna, 10 sekundit igaüks,
     üks kord Eesti kalendripäevas. Neid ei muudeta ilma Silveri otsuseta. */
  const COMPETE_N = 20, COMPETE_SEC = 10, MODULE = "kirjutaja", OP = "sulg";
  const PRAISE = ["Õige!", "Täpselt!", "Tubli!", "Just nii!", "Väga hea!"];
  const LETTERS = "a-zõäöüšž";

  let set = "all", cell = null;
  let round = null, cur = null, audio = null, G = null, advanceTimer = null;
  let pendingAdvance = false, flagTimer = null;
  let tickTimer = null, deadline = 0, boardTab = "week", competeArmed = false;

  const today = (d) => { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const masteredCount = () => DATA.items.filter(it => HEngine.mastered(D.stats[it.id])).length;
  const bestTest = () => D.tests.reduce((b, t) => Math.max(b, t.ok), 0);
  const competedToday = () => D.lastCompete === today();

  const slug = w => w.replace(/õ/g, "6").replace(/ä/g, "2").replace(/ö/g, "7").replace(/ü/g, "y");
  const src = w => "audio/" + slug(w) + ".mp3";
  const variant = (it, o) => it.pre + o + it.post;

  function pool() {
    return DATA.items.filter(it => {
      if (cell) return SERIES[it.answer] === cell.s && LEN(it.answer) === cell.l;
      return set === "all" || SERIES[it.answer] === set;
    });
  }

  function show(id) {
    ["s-home", "s-game", "s-result", "s-board"].forEach(s => { $(s).hidden = s !== id; });
    window.scrollTo(0, 0);
  }

  /* ---------- heli ---------- */
  function stop() {
    if (audio) { audio.onended = audio.onerror = null; audio.pause(); audio = null; }
    $("listenBtn").classList.remove("playing");
  }
  function play(word, onend) {
    stop();
    const a = new Audio(src(word)); audio = a;
    $("listenBtn").classList.add("playing");
    const done = () => { if (audio === a) { $("listenBtn").classList.remove("playing"); audio = null; } if (onend) onend(); };
    a.onended = done; a.onerror = done;
    a.play().catch(done);
  }

  /* ---------- häälikukaart ---------- */
  function cellInfo(s, l) {
    const its = DATA.items.filter(it => SERIES[it.answer] === s && LEN(it.answer) === l);
    let seen = 0, ok = 0, n = 0, mastered = 0;
    its.forEach(it => {
      const st = D.stats[it.id];
      if (st && st.n) { seen++; n += st.n; ok += st.ok; if (HEngine.mastered(st)) mastered++; }
    });
    let cls = "";
    if (n >= 3) cls = (mastered / its.length >= 0.7) ? "g" : (ok / n >= 0.6 ? "y" : "r");
    return { total: its.length, seen, mastered, cls };
  }
  function renderMap() {
    const m = $("map"); m.innerHTML = "";
    m.append(document.createElement("span"));
    LENS.forEach(l => { const h = document.createElement("span"); h.className = "h"; h.textContent = LEN_LABEL[l]; m.append(h); });
    ["k", "p", "t"].forEach(s => {
      const rh = document.createElement("span"); rh.className = "rh"; rh.textContent = s + "-rida"; m.append(rh);
      LENS.forEach((l, i) => {
        const info = cellInfo(s, l);
        const b = document.createElement("button");
        b.className = "cell " + info.cls + (cell && cell.s === s && cell.l === l ? " sel" : "");
        b.id = "cell-" + s + "-" + l;
        b.disabled = !info.total;
        b.innerHTML = "";
        b.append(CELL_LETTERS[s][i]);
        const sm = document.createElement("small"); sm.textContent = info.total ? info.seen + " / " + info.total : "–"; b.append(sm);
        if (info.total) {
          const bar = document.createElement("i"); bar.className = "fill";
          bar.style.setProperty("--seen", Math.round(100 * info.seen / info.total) + "%");
          bar.style.setProperty("--sure", Math.round(100 * info.mastered / info.total) + "%");
          b.append(bar);
        }
        b.setAttribute("aria-label", CELL_LETTERS[s][i] + ", " + LEN_LABEL[l] + ": harjutatud " + info.seen
          + " sõna " + info.total + "-st, neist selge " + info.mastered);
        b.onclick = () => {
          cell = (cell && cell.s === s && cell.l === l) ? null : { s, l };
          if (cell) setChips(null); else setChips("all");
          renderMap(); renderCount();
        };
        m.append(b);
      });
    });
  }
  function setChips(v) {
    if (v) set = v;
    document.querySelectorAll("#sets .chip").forEach(c => c.setAttribute("aria-pressed", v && c.dataset.set === v ? "true" : "false"));
  }
  function renderCount() {
    const n = pool().length;
    let t = "";
    if (cell || set !== "all") t = "Valitud: " + n + " sõna.";
    $("countNote").textContent = t;
    $("startBtn").disabled = !n;
  }

  /* Klass on kogu Harjutaja ühine: liitud ühes moodulis, kehtib kõigis.
     Praegu ainult näitame, et see kohale jõuab — võistlus ja edetabel
     tulevad Kirjutajasse järgmise etapiga. */
  function renderKlass() {
    const el = $("klassNote");
    const c = window.HKlass ? HKlass.current() : null;
    if (!c || !c.class_name) { el.hidden = true; return; }
    el.textContent = "Sinu klass: " + c.class_name + " · " + (c.nick || "");
    el.hidden = false;
  }

  /* ---------- eelmine sõna ---------- */
  function renderPrevBtn() {
    const b = $("prevBtn"); if (!b) return;
    b.disabled = !(G && G.history.length);
  }
  function openPrev() {
    if (!G || !G.history.length) return;
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; pendingAdvance = true; }
    const it = G.history[G.history.length - 1];
    $("prevWord").textContent = it.word;
    $("prevSentence").textContent = it.sentence || it.word;
    $("prevPlay").onclick = () => play(it.word);
    $("prevBox").hidden = false;
    play(it.word);
  }
  function closePrev() {
    $("prevBox").hidden = true;
    if (pendingAdvance) { pendingAdvance = false; next(); }
  }

  /* ---------- midagi on valesti ---------- */
  function flagCurrent() {
    const it = cur; if (!it) return;
    if (!D.reports.some(r => r.id === it.id)) {
      D.reports.push({ id: it.id, word: it.word, sentence: it.sentence || "", at: new Date().toISOString() });
      save();
    }
    const f = $("flagNote");
    f.textContent = "Märkisin sõna „" + it.word + "“. Aitäh!";
    f.hidden = false;
    clearTimeout(flagTimer);
    flagTimer = setTimeout(() => { f.hidden = true; }, 2200);
  }
  function renderReports() {
    const box = $("reports"); if (!box) return;
    box.hidden = !D.reports.length;
    if (!D.reports.length) return;
    const list = $("reportList"); list.innerHTML = "";
    D.reports.forEach(r => {
      const li = document.createElement("li");
      li.innerHTML = "<b>" + r.word + "</b>" + (r.sentence ? " — " + r.sentence : "");
      list.append(li);
    });
    $("reportCount").textContent = D.reports.length;
  }

  /* ---------- võistlusring ----------
     Harjutamises valib mäng küsimused selle järgi, mis on raske. Võistluses
     valib juhus ja formaat on kõigil sama — ainult nii saab tulemusi võrrelda.
     Sellepärast on siin oma pisike ring, mitte HEngine.Round. */
  function TestRound(items) {
    this.items = items; this.length = items.length; this.asked = 0; this.due = [];
  }
  TestRound.prototype.next = function () {
    if (this.asked >= this.length) return null;
    return { item: this.items[this.asked++], repeat: false };
  };
  TestRound.prototype.record = function (it, ok) {
    const s = D.stats[it.id] || (D.stats[it.id] = { n: 0, ok: 0, streak: 0, lastOk: false, t: 0 });
    s.n++; s.t = Date.now(); s.lastOk = ok;
    if (ok) { s.ok++; s.streak++; } else { s.streak = 0; }
  };

  function pickCompete() {
    const all = DATA.items.slice();
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    const out = [], seen = {};
    for (const it of all) {                       // sama lemma ei tule kaks korda
      if (seen[it.lemma]) continue;
      seen[it.lemma] = 1; out.push(it);
      if (out.length >= COMPETE_N) break;
    }
    return out;
  }

  /* ---------- taimer (ainult võistluses) ---------- */
  function stopTimer() {
    clearInterval(tickTimer); tickTimer = null;
    $("timer").hidden = true;
  }
  function startTimer() {
    clearInterval(tickTimer);
    deadline = performance.now() + COMPETE_SEC * 1000;
    const fill = $("timerFill");
    $("timer").hidden = false;
    fill.classList.remove("low");
    const tick = () => {
      const left = deadline - performance.now();
      const pct = Math.max(0, Math.min(100, 100 * left / (COMPETE_SEC * 1000)));
      fill.style.width = pct + "%";
      fill.classList.toggle("low", left <= 3000);
      if (left <= 0) { clearInterval(tickTimer); tickTimer = null; if (cur && !cur.done) answer(null); }
    };
    tick();
    tickTimer = setInterval(tick, 100);
  }

  /* ---------- mäng ---------- */
  function start(mode) {
    HSfx.unlock();
    const test = mode === "test";
    const p = test ? pickCompete() : pool();
    if (!p.length) return;
    const st0 = {}; p.forEach(it => { st0[it.id] = HEngine.mastered(D.stats[it.id]); });
    round = test ? new TestRound(p) : new HEngine.Round(p, D.stats, Math.min(ROUND_LEN, Math.max(6, p.length)));
    G = { mode: test ? "test" : "train", n: 0, ok: 0, wrong: [], st0, pool: p, history: [], t0: Date.now(), replays: 0 };
    $("prevBtn").hidden = test;
    $("flagBtn").hidden = test;
    renderPrevBtn();
    show("s-game");
    next();
  }

  function next() {
    clearTimeout(advanceTimer);
    stopTimer();
    const q = round.next();
    if (!q) return finish();
    cur = q.item; cur.done = false;
    renderQuestion(cur);
    const total = round.length + round.due.length;
    $("bar").style.width = Math.min(100, 100 * (round.asked - 1) / Math.max(total, 1)) + "%";
    if (G.mode === "test") { G.replays = 0; $("listenBtn").disabled = false; }
    play(cur.word, () => { if (G.mode === "test" && cur === q.item && !cur.done) startTimer(); });
  }

  function renderQuestion(it) {
    const s = it.sentence || it.word;
    const re = new RegExp("(^|[^" + LETTERS + "])(" + it.word + ")(?=[^" + LETTERS + "]|$)", "i");
    const m = re.exec(s);
    const box = $("sentence"); box.innerHTML = "";
    const target = document.createElement("span"); target.className = "target";
    let before = "", after = "", shown = it.word;
    if (m) { before = s.slice(0, m.index + m[1].length); shown = m[2]; after = s.slice(m.index + m[1].length + m[2].length); }
    const pre = shown.slice(0, it.pre.length), post = shown.slice(it.pre.length + it.answer.length);
    const gap = document.createElement("span"); gap.className = "gap"; gap.id = "gap"; gap.textContent = " ";
    target.append(pre, gap, post);
    box.append(before, target, after);
    const opts = $("opts"); opts.innerHTML = "";
    it.options.forEach((o, k) => {
      const b = document.createElement("button");
      b.className = "opt"; b.id = "opt-" + k; b.dataset.o = o; b.textContent = o;
      b.onclick = () => answer(o);
      opts.append(b);
    });
    $("fb").textContent = ""; $("fb").className = "feedback";
    $("hint").hidden = true; $("after").hidden = true;
  }

  function hintText(it) {
    const L = LEN(it.answer);
    if (L === "lyhike") return "<b>" + it.word + "</b> — häälik on lühike ja nõrk, seepärast kirjutame <b>" + it.answer + "</b>.";
    if (L === "pikk") return "<b>" + it.word + "</b> — häälik on pikk, aga mitte ülipikk. Kirjutame ühe tähe: <b>" + it.answer + "</b>.";
    return "<b>" + it.word + "</b> — häälik venib kõige kauem, see on ülipikk. Kirjutame kaks tähte: <b>" + it.answer + "</b>.";
  }

  /* o === null tähendab, et võistluses sai aeg otsa. */
  function answer(o) {
    const it = cur; if (!it || it.done) return; it.done = true;
    stopTimer();
    const test = G.mode === "test";
    const ok = o === it.answer;
    round.record(it, ok); save();
    G.n++; if (ok) G.ok++; else if (!G.wrong.some(w => w.id === it.id)) G.wrong.push(it);
    G.history.push(it); renderPrevBtn();
    [...$("opts").children].forEach(b => {
      b.disabled = true;
      if (b.dataset.o === it.answer) b.classList.add("right");
      else if (b.dataset.o === o) b.classList.add("wrong");
    });
    const gap = $("gap"); gap.textContent = it.answer; gap.classList.add("filled");
    if (ok) {
      HSfx.ok();
      $("fb").textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      $("fb").className = "feedback ok";
      advanceTimer = setTimeout(() => { advanceTimer = null; next(); }, test ? 800 : 1100);
      return;
    }
    HSfx.bad();
    $("fb").textContent = (o === null ? "Aeg sai otsa. Õige on \u201E" : "Õige on \u201E") + it.word + "\u201C.";
    $("fb").className = "feedback bad";
    if (test) {
      // Võistluses ei õpetata: ei vihjet, ei variantide etteütlust. Ainult õige sõna.
      advanceTimer = setTimeout(() => { advanceTimer = null; next(); }, 1300);
      return;
    }
    $("hint").innerHTML = KRobot("kind", { head: true }) + '<div class="hinttext">' + hintText(it) + "</div>"; $("hint").hidden = false;
    $("after").hidden = false;
    setTimeout(playAll, 600);
  }

  function playAll() {
    const it = cur; if (!it) return;
    const btns = [...$("opts").children];
    btns.forEach(b => {
      let sm = b.querySelector("small");
      if (!sm) { sm = document.createElement("small"); b.append(sm); }
      sm.textContent = variant(it, b.dataset.o);
    });
    let k = 0;
    const step = () => {
      btns.forEach(b => b.classList.remove("lit"));
      if (cur !== it || k >= btns.length) return;
      const b = btns[k++]; b.classList.add("lit");
      play(variant(it, b.dataset.o), () => setTimeout(step, 350));
    };
    step();
  }

  function finish() {
    stop(); stopTimer();
    const pct = G.n ? G.ok / G.n : 0;
    const newly = G.pool.filter(it => !G.st0[it.id] && HEngine.mastered(D.stats[it.id]));
    if (G.mode === "test") return finishCompete(pct, newly);
    D.rounds.push({ t: Date.now(), n: G.n, ok: G.ok, set: cell ? cell.s + "-" + cell.l : set });
    if (D.rounds.length > 20) D.rounds.shift();
    save();
    let title, sub = "", mood = "happy";
    if (G.n < 5) { title = "Hea algus!"; mood = "wave"; }
    else if (pct >= 0.9) { title = "Suurepärane!"; mood = "cheer"; HSfx.tada(); }
    else if (pct >= 0.7) { title = "Hästi tehtud!"; mood = newly.length ? "cheer" : "happy"; }
    else { title = "Hästi harjutatud!"; mood = "kind"; sub = "Vead näitavad, mida veel harjutada – nii see pähe jääbki."; }
    $("resRobot").innerHTML = KRobot(mood);
    $("resTitle").textContent = title; $("resSub").textContent = sub; $("resSub").hidden = !sub;
    const stats = $("resStats"); stats.innerHTML = "";
    const add = (big, small) => { const d = document.createElement("div"); d.className = "stat"; const b = document.createElement("b"); b.textContent = big; const s = document.createElement("span"); s.textContent = small; d.append(b, s); stats.append(d); };
    add(G.ok + " / " + G.n, "õigesti");
    if (newly.length) add(String(newly.length), "sõna sai selgeks");
    const nb = $("resNext"); nb.innerHTML = "";
    G.wrong.forEach(it => { const s = document.createElement("span"); const mk = document.createElement("mark"); mk.textContent = it.answer; s.append(it.pre, mk, it.post); nb.append(s); });
    $("resNextBlock").hidden = !G.wrong.length;
    show("s-result");
  }

  function finishCompete(pct, newly) {
    D.tests.push({ t: Date.now(), n: G.n, ok: G.ok });
    if (D.tests.length > 40) D.tests.shift();
    const prevBest = D.tests.slice(0, -1).reduce((b, t) => Math.max(b, t.ok), 0);
    D.lastCompete = today();
    const avg = G.n ? (Date.now() - G.t0) / 1000 / G.n : 0;
    D.outbox.push({ module: MODULE, mode: "test", op: OP, n: G.n, ok: G.ok, score: G.ok, avg: Math.round(avg * 10) / 10 });
    save();
    flushOutbox();

    const record = G.ok > prevBest && D.tests.length > 1;
    let title, sub = "", mood = "happy";
    if (G.ok === G.n) { title = "Kõik õiged!"; mood = "cheer"; HSfx.tada(); }
    else if (record) { title = "Uus rekord!"; mood = "cheer"; HSfx.tada(); }
    else if (pct >= 0.8) { title = "Tugev ring!"; mood = "cheer"; }
    else if (pct >= 0.5) { title = "Tubli võistlus!"; mood = "happy"; }
    else { title = "Võistlus tehtud!"; mood = "kind"; sub = "Harjutamine tõstab tulemust. Homme saad uuesti võistelda."; }
    if (!sub) sub = "Uus võistlus on homme.";
    $("resRobot").innerHTML = KRobot(mood);
    $("resTitle").textContent = title; $("resSub").textContent = sub; $("resSub").hidden = false;

    const stats = $("resStats"); stats.innerHTML = "";
    const add = (big, small) => { const d = document.createElement("div"); d.className = "stat"; const b = document.createElement("b"); b.textContent = big; const s = document.createElement("span"); s.textContent = small; d.append(b, s); stats.append(d); };
    add(G.ok + " / " + G.n, "õigesti");
    add(String(bestTest()), record ? "uus rekord" : "sinu rekord");
    if (newly.length) add(String(newly.length), "sõna sai selgeks");

    const nb = $("resNext"); nb.innerHTML = "";
    G.wrong.forEach(it => { const s = document.createElement("span"); const mk = document.createElement("mark"); mk.textContent = it.answer; s.append(it.pre, mk, it.post); nb.append(s); });
    $("resNextBlock").hidden = !G.wrong.length;
    $("againBtn").textContent = "Harjuta neid sõnu";
    show("s-result");
  }

  /* ---------- tulemuste saatmine ----------
     Võrguta jääb tulemus outbox'i ja läheb teel järgmisel korral. Server
     otsustab, kas võistlus läheb kirja — telefoni kell ei loe. */
  function flushOutbox() {
    if (!window.HKlass || !HKlass.online() || !HKlass.current() || !D.outbox.length) return Promise.resolve();
    const it = D.outbox[0];
    return HKlass.report(Object.assign({}, it, {
      greens: masteredCount(),
      state: D.outbox.length === 1 ? { stats: D.stats, tests: D.tests } : null
    })).then(r => {
      if (r && r.error === "auth") { D.outbox = []; HKlass.clear(); save(); renderKlass(); return; }
      D.outbox.shift(); save();
      return flushOutbox();
    }).catch(() => {});
  }

  /* ---------- klass ja võistlusnupp avalehel ---------- */
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
    n.textContent = COMPETE_N + " juhuslikku sõna, igale " + COMPETE_SEC + " sekundit. Vihjeid ei näidata.";
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
  const num = n => String(Math.round(n || 0));

  function openBoard() {
    show("s-board");
    renderBoard();
    flushOutbox().then(loadBoard);
  }

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

  /* Kui klassiaste on teada, ütleme selle välja („3. klassid") — see on lapsele
     palju selgem kui sõna „klassiaste". */
  function boardHint(tab, grade) {
    const g = grade ? grade + ". klassid" : "sama astme klassid";
    if (tab === "week") return "Nädalapunktid on sinu viie parima päeva õiged vastused kokku. Nädalavahetusel ei pea mängima.";
    if (tab === "sure") return "Selge sõna on see, mille oled kaks korda järjest õigesti kirjutanud.";
    if (tab === "best") return "Sinu kõige parem võistlus. Igas võistluses on " + COMPETE_N + " sõna.";
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

    /* Ühe ja mitme puhul on eesti keeles eri vorm: 1 võistluspäev, 2 võistluspäeva. */
    const days = n => !n ? "" : (n === 1 ? "1 võistluspäev" : n + " võistluspäeva");
    const players = n => n === 1 ? "1 võistleja" : (n || 0) + " võistlejat";

    let rows = [];
    if (boardTab === "week") rows = (b.players || []).map(p => ({ name: p.nick, v: p.week_n, sub: days(p.days), me: p.id === b.me })).sort((x, y) => y.v - x.v);
    else if (boardTab === "sure") rows = (b.players || []).map(p => ({ name: p.nick, v: p.greens, sub: "selgeks saanud sõna", me: p.id === b.me })).sort((x, y) => y.v - x.v);
    else if (boardTab === "best") rows = (b.players || []).map(p => ({ name: p.nick, v: p.best_test, sub: "õiget parimas võistluses", me: p.id === b.me })).sort((x, y) => y.v - x.v);
    else if (boardTab === "school") rows = (b.siblings || []).map(g => ({ name: g.name, v: g.per_player, sub: players(g.active), me: b.class && g.id === b.class.id }));
    else rows = (b.peers || []).map(g => ({ name: g.name, v: g.per_player, sub: (g.school || ""), me: b.class && g.id === b.class.id }));

    if (!rows.length) {
      const li = document.createElement("li");
      li.className = "brow empty";
      li.textContent = boardTab === "school" || boardTab === "country"
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
    stop(); stopTimer(); clearTimeout(advanceTimer); advanceTimer = null; pendingAdvance = false;
    $("prevBox").hidden = true; $("flagNote").hidden = true;
    $("prevBtn").hidden = false; $("flagBtn").hidden = false;
    $("listenBtn").disabled = false;
    $("againBtn").textContent = "Harjuta veel";
    cur = null; renderMap(); renderCount(); renderReports(); renderKlass(); show("s-home");
  }

  /* ---------- sündmused ---------- */
  $("sets").addEventListener("click", e => {
    const c = e.target.closest(".chip"); if (!c) return;
    cell = null; setChips(c.dataset.set); renderMap(); renderCount();
  });
  $("sfxBtn").setAttribute("aria-pressed", HSfx.enabled ? "true" : "false");
  $("sfxBtn").onclick = () => { HSfx.enabled = !HSfx.enabled; D.sfx = HSfx.enabled; save(); $("sfxBtn").setAttribute("aria-pressed", HSfx.enabled ? "true" : "false"); };
  $("startBtn").onclick = () => start("train");
  $("competeBtn").onclick = onCompete;
  /* Võistluses tohib heli üks kord korrata, aga aeg jookseb edasi. */
  $("listenBtn").onclick = () => {
    if (!cur) return;
    if (G && G.mode === "test") {
      if (cur.done || G.replays >= 1) return;
      G.replays++; $("listenBtn").disabled = true;
    }
    play(cur.word);
  };
  $("allBtn").onclick = playAll;
  $("nextBtn").onclick = next;
  /* Võistluses küsib ✕ kinnitust: pooleli jäetud ring läheb ikka kirja ja
     päev on siis kasutatud, nii et eksikombel vajutamine oleks kallis. */
  let quitArmed = false;
  $("quitBtn").onclick = () => {
    if (G && G.mode === "test" && G.n && !quitArmed) {
      quitArmed = true;
      $("fb").textContent = "Kindel? Pooleli jäänud ring läheb ikka kirja. Vajuta ✕ veel kord.";
      $("fb").className = "feedback bad";
      setTimeout(() => { quitArmed = false; }, 4000);
      return;
    }
    quitArmed = false;
    if (G && G.n) finish(); else goHome();
  };
  $("prevBtn").onclick = openPrev;
  $("prevClose").onclick = closePrev;
  $("flagBtn").onclick = flagCurrent;
  $("reportClear").onclick = () => { D.reports = []; save(); renderReports(); };
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
    if (e.key === " " ) { e.preventDefault(); play(cur.word); }
    else if (e.key === "Enter" && cur.done && !$("after").hidden) { e.preventDefault(); next(); }
    else { const n = parseInt(e.key, 10); if (n >= 1 && n <= 3 && !cur.done) answer(cur.options[n - 1]); }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });

  $("mascot").innerHTML = KRobot("wave");
  $("mascot").onclick = () => {
    HSfx.unlock(); HSfx.ok();
    const svg = $("mascot").querySelector("svg"); svg.classList.remove("hop"); void svg.getBBox(); svg.classList.add("hop");
  };
  renderMap(); renderCount(); renderReports(); renderKlass();
  flushOutbox();

  /* Kutselink kujul #k=KOOD avab liitumise juba täidetud koodiga. Kuulame ka
     hashchange't: kui laps on leht juba lahti ja klõpsab kutselingil, ei laadi
     brauser lehte uuesti ja ilma selleta ei juhtuks midagi. */
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
