/* Kirjutaja — õigekirjamäng: kuula sõna, vali lünka g/k/kk, b/p/pp või d/t/tt. */
(function () {
  const DATA = window.KIRJUTAJA_DATA || { items: [], total: 0 };
  const KEY = "kirjutaja_v1";
  const D = HStore.load(KEY, { stats: {}, sfx: true, rounds: [] });
  D.stats = D.stats || {}; D.rounds = D.rounds || []; D.reports = D.reports || [];
  HSfx.enabled = D.sfx !== false;
  const save = () => HStore.save(KEY, D);
  const $ = id => document.getElementById(id);

  const SERIES = { g: "k", k: "k", kk: "k", b: "p", p: "p", pp: "p", d: "t", t: "t", tt: "t" };
  const LEN = a => (a === "g" || a === "b" || a === "d") ? "lyhike" : (a.length === 2 ? "ylipikk" : "pikk");
  const CELL_LETTERS = { k: ["g", "k", "kk"], p: ["b", "p", "pp"], t: ["d", "t", "tt"] };
  const LENS = ["lyhike", "pikk", "ylipikk"];
  const LEN_LABEL = { lyhike: "lühike", pikk: "pikk", ylipikk: "ülipikk" };
  const ROUND_LEN = 15;
  const PRAISE = ["Õige!", "Täpselt!", "Tubli!", "Just nii!", "Väga hea!"];
  const LETTERS = "a-zõäöüšž";

  let set = "all", cell = null;
  let round = null, cur = null, audio = null, G = null, advanceTimer = null;
  let pendingAdvance = false, flagTimer = null;

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
    ["s-home", "s-game", "s-result"].forEach(s => { $(s).hidden = s !== id; });
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

  /* ---------- mäng ---------- */
  function start() {
    HSfx.unlock();
    const p = pool(); if (!p.length) return;
    const st0 = {}; p.forEach(it => { st0[it.id] = HEngine.mastered(D.stats[it.id]); });
    round = new HEngine.Round(p, D.stats, Math.min(ROUND_LEN, Math.max(6, p.length)));
    G = { n: 0, ok: 0, wrong: [], st0, pool: p, history: [] };
    renderPrevBtn();
    show("s-game");
    next();
  }

  function next() {
    clearTimeout(advanceTimer);
    const q = round.next();
    if (!q) return finish();
    cur = q.item; cur.done = false;
    renderQuestion(cur);
    const total = round.length + round.due.length;
    $("bar").style.width = Math.min(100, 100 * (round.asked - 1) / Math.max(total, 1)) + "%";
    play(cur.word);
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

  function answer(o) {
    const it = cur; if (!it || it.done) return; it.done = true;
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
      advanceTimer = setTimeout(() => { advanceTimer = null; next(); }, 1100);
    } else {
      HSfx.bad();
      $("fb").textContent = "Õige on " + it.word + ".";
      $("fb").className = "feedback bad";
      $("hint").innerHTML = KRobot("kind", { head: true }) + '<div class="hinttext">' + hintText(it) + "</div>"; $("hint").hidden = false;
      $("after").hidden = false;
      setTimeout(playAll, 600);
    }
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
    stop();
    const pct = G.n ? G.ok / G.n : 0;
    const newly = G.pool.filter(it => !G.st0[it.id] && HEngine.mastered(D.stats[it.id]));
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

  function goHome() {
    stop(); clearTimeout(advanceTimer); advanceTimer = null; pendingAdvance = false;
    $("prevBox").hidden = true; $("flagNote").hidden = true;
    cur = null; renderMap(); renderCount(); renderReports(); show("s-home");
  }

  /* ---------- sündmused ---------- */
  $("sets").addEventListener("click", e => {
    const c = e.target.closest(".chip"); if (!c) return;
    cell = null; setChips(c.dataset.set); renderMap(); renderCount();
  });
  $("sfxBtn").setAttribute("aria-pressed", HSfx.enabled ? "true" : "false");
  $("sfxBtn").onclick = () => { HSfx.enabled = !HSfx.enabled; D.sfx = HSfx.enabled; save(); $("sfxBtn").setAttribute("aria-pressed", HSfx.enabled ? "true" : "false"); };
  $("startBtn").onclick = start;
  $("listenBtn").onclick = () => { if (cur) play(cur.word); };
  $("allBtn").onclick = playAll;
  $("nextBtn").onclick = next;
  $("quitBtn").onclick = () => { if (G && G.n) finish(); else goHome(); };
  $("prevBtn").onclick = openPrev;
  $("prevClose").onclick = closePrev;
  $("flagBtn").onclick = flagCurrent;
  $("reportClear").onclick = () => { D.reports = []; save(); renderReports(); };
  $("againBtn").onclick = start;
  $("homeBtn").onclick = goHome;
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
  renderMap(); renderCount(); renderReports();
  if ("serviceWorker" in navigator) { navigator.serviceWorker.register("../sw.js").catch(() => {}); }
})();
