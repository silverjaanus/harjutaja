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

  /* Valitud tähtede rühm ja kaardi lahter jäävad meelde nagu teistes
     moodulites valitud tase (15. sept). */
  let set = D.set || "all", cell = D.cell || null;
  const jataValikMeelde = () => { D.set = set; D.cell = cell; save(); };
  let round = null, cur = null, audio = null, G = null, advanceTimer = null;
  let pendingAdvance = false, flagTimer = null;
  let tickTimer = null, deadline = 0, boardTab = "week";
  /* Viimase ringi vead: "Harjuta neid sõnu" peab päriselt neid sõnu harjutama,
     mitte lihtsalt uut ringi alustama. */
  let lastWrong = [];

  const today = (d) => { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const masteredCount = () => DATA.items.filter(it => HEngine.mastered(D.stats[it.id])).length;
  const bestTest = () => D.tests.reduce((b, t) => Math.max(b, t.ok), 0);
  const competedToday = () => D.lastCompete === today();

  const slug = w => w.replace(/õ/g, "6").replace(/ä/g, "2").replace(/ö/g, "7").replace(/ü/g, "y");
  const src = w => "audio/" + slug(w) + ".mp3";
  /* Võrdlushääl on teine salvestus kui küsimuse hääl. Kui laps saaks võrrelda
     sedasama klippi, vastaks ta klipi äratundmisega, mitte välte kuulmisega. */
  const cmpSrc = w => "audio2/" + slug(w) + ".mp3";
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
    $("cmpBtn").classList.remove("playing");
  }
  /* o.cmp = võrdlushääl (kaust audio2), o.btn = nupp, mis mängimise ajal süttib.
     Kui võrdlusklippi veel ei ole, kukub mängimine tagasi küsimuse häälele:
     puuduv fail ei tohi kuulamisabi vaikselt katki jätta. */
  function play(word, onend, o) {
    o = o || {};
    stop();
    const btn = $(o.btn || "listenBtn");
    const a = new Audio(o.cmp ? cmpSrc(word) : src(word)); audio = a;
    btn.classList.add("playing");
    const done = () => { if (audio === a) { btn.classList.remove("playing"); audio = null; } if (onend) onend(); };
    a.onended = done;
    a.onerror = () => { if (o.cmp) { play(word, onend, { btn: o.btn }); } else { done(); } };
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
          jataValikMeelde();
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

  /* ---------- eelmiste küsimuste vaatamine ----------
     Nool tagasi viib päris eelmise küsimuse juurde: sama lause, samad
     variandid ja see, mida laps vastas. Varem mängis see ainult heli ja
     ekraanil oli endiselt uus sõna — laps kuulis üht ja nägi teist.
     `review` on indeks G.history sees; null tähendab, et mäng käib. */
  let review = null;

  function vaadatav() { return review === null ? null : G.history[review]; }

  /* Mitmendale kirjele viib järgmine samm tagasi. Kui käiv küsimus on juba
     vastatud, on see ise ajaloos viimane, seega tuleb üks võrra kaugemale. */
  function eelmineIndeks() {
    if (!G) return -1;
    if (review !== null) return review - 1;
    return G.history.length - (cur && cur.done ? 2 : 1);
  }

  function renderPrevBtn() {
    const b = $("prevBtn"); if (!b) return;
    b.disabled = eelmineIndeks() < 0;
  }

  function openPrev() {
    const i = eelmineIndeks();
    if (i < 0) return;
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; pendingAdvance = true; }
    stop();
    review = i;
    const rec = G.history[review];
    const sammu = G.history.length - review;
    $("reviewWhich").textContent = sammu === 1 ? "Vaatad eelmist sõna" : "Vaatad sõna " + sammu + " sammu tagasi";
    $("reviewBar").hidden = false;
    $("flagNote").hidden = true;
    renderQuestion(rec.it);
    paintResult(rec);
    $("after").hidden = true;
    renderPrevBtn();
    play(rec.it.word);
  }

  /* Tagasi mängu: kui vahepeal ootas edasiliikumine, läheb mäng edasi,
     muidu joonistatakse käiv küsimus täpselt sellisena, nagu ta oli. */
  function exitReview() {
    if (review === null) return;
    review = null;
    stop();
    $("reviewBar").hidden = true;
    if (pendingAdvance) { pendingAdvance = false; next(); return; }
    if (!cur) return;
    renderQuestion(cur);
    if (cur.done) {
      const rec = G.history[G.history.length - 1];
      if (rec && rec.it === cur) {
        paintResult(rec);
        $("after").hidden = !(G.mode !== "test" && !rec.ok);
      }
    }
    renderPrevBtn();
  }

  /* ---------- midagi on valesti ---------- */
  /* Märge jääb alati sellesse seadmesse ja läheb lisaks serverisse, et
     Silver seda päriselt näeks. Ilma serverita on märge olemas ainult
     lapse enda telefonis - sellest ei ole viga parandades kasu. */
  function sendReports() {
    if (!window.HKlass || !HKlass.online() || !HKlass.issue) return Promise.resolve();
    const q = D.reports.filter(r => !r.sent);
    if (!q.length) return Promise.resolve();
    const ver = (window.KIRJUTAJA_DATA && KIRJUTAJA_DATA.version) || null;
    return q.reduce((chain, r) => chain.then(() =>
      HKlass.issue({
        module: MODULE, kind: "sona", item: r.id,
        detail: r.word + (r.sentence ? " / " + r.sentence : ""),
        note: r.why ? (MIKS[r.why] || r.why) : null, version: ver
      }).then(res => { if (res && res.ok) { r.sent = true; save(); } })
        .catch(() => { })
    ), Promise.resolve());
  }

  /* Küsimärgi asemel on nüüd tekstiga nupp ja päris aken. Laps ütleb ka,
     MIS on valesti — muidu tuleb märge ilma vihjeta, mida otsida. */
  const MIKS = {
    haal: "Häält ei ole kuulda või see ütleb valesti",
    lause: "Lause on imelik",
    vastus: "Mäng näitab valet vastust",
    muu: "Midagi muud"
  };

  function flagItem() {
    const rec = vaadatav();
    return rec ? rec.it : cur;
  }

  function openFlag() {
    const it = flagItem(); if (!it) return;
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; pendingAdvance = true; }
    stop();
    $("flagWord").textContent = it.word;
    $("flagSentence").textContent = it.sentence || "";
    $("flagSentence").hidden = !it.sentence;
    $("flagBox").hidden = false;
  }

  function closeFlag() {
    $("flagBox").hidden = true;
    if (pendingAdvance && review === null) { pendingAdvance = false; next(); }
  }

  function sendFlag(why) {
    const it = flagItem(); if (!it) return;
    const rec = D.reports.find(r => r.id === it.id);
    if (rec) { rec.why = why; rec.sent = false; }
    else D.reports.push({ id: it.id, word: it.word, sentence: it.sentence || "", why, at: new Date().toISOString(), sent: false });
    save();
    sendReports();
    closeFlag();
    const f = $("flagNote");
    f.textContent = "Aitäh! Andsid veast teada sõna „" + it.word + "“ juures.";
    f.hidden = false;
    clearTimeout(flagTimer);
    flagTimer = setTimeout(() => { f.hidden = true; }, 2600);
    renderReports();
  }
  function renderReports() {
    const box = $("reports"); if (!box) return;
    box.hidden = !D.reports.length;
    if (!D.reports.length) return;
    const list = $("reportList"); list.innerHTML = "";
    D.reports.forEach(r => {
      const li = document.createElement("li");
      li.textContent = r.word + (r.why ? " — " + (MIKS[r.why] || r.why).toLowerCase() : "");
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

  /* Sihitud ring: valed sõnad ees, aga mitte üksi. Kui laps eksis ühe sõnaga,
     ei ole kellelegi vaja sama sõna kuus korda järjest — täidame ringi sama
     valiku teiste sõnadega. Kordamismootor eelistab niikuinii nõrku. */
  function mixFocus(focus, all) {
    if (!focus || !focus.length) return all;
    const out = focus.slice(), seen = {};
    out.forEach(it => { seen[it.id] = 1; });
    const rest = all.slice().sort(() => Math.random() - 0.5);
    for (const it of rest) {
      if (out.length >= 8) break;
      if (!seen[it.id]) { seen[it.id] = 1; out.push(it); }
    }
    return out;
  }

  /* ---------- mäng ---------- */
  function start(mode, focus) {
    HSfx.unlock();
    const test = mode === "test";
    const p = test ? pickCompete() : mixFocus(focus, pool());
    if (!p.length) return;
    const st0 = {}; p.forEach(it => { st0[it.id] = HEngine.mastered(D.stats[it.id]); });
    round = test ? new TestRound(p) : new HEngine.Round(p, D.stats, Math.min(ROUND_LEN, Math.max(6, p.length)));
    /* help = millise küsimuse juures on kuulamisabi praegu vajutatud;
       usedHelp = mis sõnale on abi juba korra antud (see tuleb ilma abita tagasi);
       reasked = et üks sõna ei tuleks abi pärast rohkem kui üks kord juurde. */
    G = { mode: test ? "test" : "train", n: 0, ok: 0, wrong: [], st0, pool: p, history: [], t0: Date.now(), replays: 0,
          help: {}, usedHelp: {}, reasked: {}, nudged: false };
    $("prevBtn").hidden = test;
    $("flagBtn").hidden = test;
    renderPrevBtn();
    show("s-game");
    next();
    warmAudio();
  }

  function next() {
    clearTimeout(advanceTimer);
    stopTimer();
    review = null; $("reviewBar").hidden = true; $("flagNote").hidden = true;
    const q = round.next();
    if (!q) return finish();
    cur = q.item; cur.done = false;
    renderQuestion(cur);
    renderPrevBtn();   /* uus kusimus on vastamata, seega eelmine on jalle vaadatav */
    const total = round.length + round.due.length;
    $("bar").style.width = Math.min(100, 100 * (round.asked - 1) / Math.max(total, 1)) + "%";
    if (G.mode === "test") { G.replays = 0; $("listenBtn").disabled = false; }
    /* Võistluse taimer käivitub, kui sõna on kõlanud. Kordus ja vahelehe
       peitmine katkestavad esimese klipi, seega käivitab taimeri ka korduse
       lõpp ja igaks juhuks 6 s varukell — varem võis taimer jääda üldse
       käivitamata (Codexi leid 15. sept). */
    const kaivita = () => {
      if (G && G.mode === "test" && cur === q.item && !cur.done && !G.timerOn) { G.timerOn = true; startTimer(); }
    };
    G.timerOn = false; G.kaivita = kaivita;
    clearTimeout(G.varuTimer);
    if (G.mode === "test") G.varuTimer = setTimeout(kaivita, 6000);
    play(cur.word, kaivita);
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
    /* Kuulamisabi ainult harjutamises ja ainult siis, kui sellele sõnale ei ole
       seda selles ringis juba antud — abiga vastatud sõna tuleb ilma abita tagasi. */
    $("cmpRow").hidden = !(G && G.mode === "train" && !G.usedHelp[it.id]);
    $("cmpNote").hidden = true;
  }

  function hintText(it) {
    const L = LEN(it.answer);
    if (L === "lyhike") return "<b>" + it.word + "</b> — häälik on lühike ja nõrk, seepärast kirjutame <b>" + it.answer + "</b>.";
    if (L === "pikk") return "<b>" + it.word + "</b> — häälik on pikk, aga mitte ülipikk. Kirjutame ühe tähe: <b>" + it.answer + "</b>.";
    return "<b>" + it.word + "</b> — häälik venib kõige kauem, see on ülipikk. Kirjutame kaks tähte: <b>" + it.answer + "</b>.";
  }

  /* Joonistab vastatud kusimuse: taidetud lunk, oige ja vale variant,
     tagasiside ja vihje. Sama pilt kehtib nii vastamise hetkel kui siis,
     kui laps tuleb noolega tagasi seda kusimust vaatama. */
  function paintResult(rec) {
    const it = rec.it;
    $("cmpRow").hidden = true; $("cmpNote").hidden = true;
    [...$("opts").children].forEach(b => {
      b.disabled = true;
      b.classList.remove("right", "wrong", "lit");
      if (b.dataset.o === it.answer) b.classList.add("right");
      else if (b.dataset.o === rec.chosen) b.classList.add("wrong");
    });
    const gap = $("gap"); if (gap) { gap.textContent = it.answer; gap.classList.add("filled"); }
    if (rec.ok) {
      $("fb").textContent = rec.praise || "Oige!";
      $("fb").className = "feedback ok";
      $("hint").hidden = true;
      return;
    }
    $("fb").textContent = (rec.chosen === null ? "Aeg sai otsa. Õige on „" : "Õige on „") + it.word + "“.";
    $("fb").className = "feedback bad";
    if (G && G.mode === "test") { $("hint").hidden = true; return; }
    $("hint").innerHTML = KRobot("kind", { head: true }) + '<div class="hinttext">' + hintText(it) + "</div>";
    $("hint").hidden = false;
  }

  /* o === null tähendab, et võistluses sai aeg otsa. */
  function answer(o) {
    if (review !== null) return;   /* eelmise vaatamine ei vasta kunagi käivale küsimusele */
    const it = cur; if (!it || it.done) return; it.done = true;
    /* Vastamine on teadlik jätkamine: ✕ ootel olek kaob siin, mitte vaikse
       taimeriga lapse selja taga. */
    quitArm.disarm();
    stopTimer();
    const test = G.mode === "test";
    const ok = o === it.answer;
    /* Kuulamisabi kolmas reegel: abiga vastatud sõna ei lähe selgeks ja tuleb
       samas ringis 3-6 küsimuse pärast ilma abita tagasi. Oskust kontrollitakse
       alati abita — muidu ei erista mäng kuulmist klipi äratundmisest. */
    const helped = !!G.help[it.id]; delete G.help[it.id];
    round.record(it, ok); save();
    if (helped && !test) {
      G.usedHelp[it.id] = true;
      const s = D.stats[it.id];
      if (ok && s) s.streak = 0;
      if (ok && !G.reasked[it.id] && round.asked < round.length * 2) {
        G.reasked[it.id] = true;
        round.due.push({ item: it, at: round.asked + 3 + Math.floor(Math.random() * 4) });
      }
      save();
    }
    G.n++; if (ok) G.ok++; else if (!G.wrong.some(w => w.id === it.id)) G.wrong.push(it);
    const rec = { it, chosen: o, ok, praise: ok ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : "" };
    G.history.push(rec); renderPrevBtn();
    paintResult(rec);
    if (ok) {
      HSfx.ok();
      advanceTimer = setTimeout(() => { advanceTimer = null; next(); }, test ? 800 : 1100);
      return;
    }
    HSfx.bad();
    if (test) {
      // Võistluses ei õpetata: ei vihjet, ei variantide etteütlust. Ainult õige sõna.
      advanceTimer = setTimeout(() => { advanceTimer = null; next(); }, 1300);
      return;
    }
    $("hint").innerHTML = KRobot("kind", { head: true }) + '<div class="hinttext">' + hintText(it) + "</div>"; $("hint").hidden = false;
    $("after").hidden = false;
    /* Ainult siis, kui laps on ikka sama sõna juures: varem võis hilinenud
       kõne mängida juba järgmise küsimuse variandid (15. sept). */
    clearTimeout(allTimer);
    allTimer = setTimeout(() => { if (cur === it && review === null) playAll(); }, 600);
  }
  let allTimer = null;

  /* Kuulamisabi enne vastamist: kolm pikkust järjest, lühike - pikk - ülipikk.
     Kolm asja eristavad seda spikrist:
     1. õiget ei tähistata ja variantide sõnu ei kirjutata välja — kirjapilt
        annaks päris sõna ära; süttib ainult täht, mille kõla parasjagu käib;
     2. võrdlus tuleb teise häälega kui küsimus (kaust audio2);
     3. abiga vastatud sõna tuleb ilma abita tagasi (vt answer()). */
  function compare() {
    const it = cur; if (!it || it.done || review !== null || G.mode === "test") return;
    if (G.usedHelp[it.id]) return;
    G.help[it.id] = true;
    if (!G.nudged) { G.nudged = true; $("cmpNote").hidden = false; }
    const btns = [...$("opts").children];
    let k = 0;
    const step = () => {
      btns.forEach(b => b.classList.remove("lit"));
      if (cur !== it || it.done || k >= btns.length) { $("cmpBtn").classList.remove("playing"); return; }
      const b = btns[k++]; b.classList.add("lit");
      play(variant(it, b.dataset.o), () => setTimeout(step, 350), { cmp: true, btn: "cmpBtn" });
    };
    step();
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

  /* Tulemuse ekraani esmane nupp. Kui vigu oli, harjutab see päriselt neid
     sõnu — varem lubas silt "Harjuta neid sõnu" midagi, mida nupp ei teinud
     (ta alustas lihtsalt uut ringi). Vigadeta ringil ei ole "neid" olemas. */
  function setAgain() {
    lastWrong = G.wrong.slice();
    $("againBtn").textContent = lastWrong.length ? "Harjuta neid sõnu" : "Harjuta veel";
  }

  function finish() {
    /* Ootel edasiliikumine tuleb tühistada: ilma selleta võis ✕ vahetult
       pärast vastust jätta käima next()-i, mis jooksis juba tulemuse peal. */
    stop(); stopTimer(); clearTimeout(advanceTimer); advanceTimer = null; pendingAdvance = false;
    quitArm.disarm();
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
    setAgain();
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
    /* „Kõik õiged" ja „Tugev ring" ainult täis ringi puhul — muidu kiitis
       mäng last, kes lahkus pärast üht õiget vastust (15. sept). */
    const tais = G.n >= COMPETE_N;
    if (tais && G.ok === G.n) { title = "Kõik õiged!"; mood = "cheer"; HSfx.tada(); }
    else if (record) { title = "Uus rekord!"; mood = "cheer"; HSfx.tada(); }
    else if (tais && pct >= 0.8) { title = "Tugev ring!"; mood = "cheer"; }
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
    setAgain();
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

  const competeArm = HArm($("competeBtn"), {
    idleText: "Võistle",
    armedText: "Alustame?",
    note: $("competeNote"),
    message: HArm.COMPETE_MSG,
    enabled: () => !competedToday(),
    action: () => start("test"),
    onDisarm: renderCompete
  });

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
    quitArm.disarm();
    $("flagBox").hidden = true; $("reviewBar").hidden = true; $("flagNote").hidden = true;
    review = null;
    $("prevBtn").hidden = false; $("flagBtn").hidden = false;
    $("listenBtn").disabled = false;
    $("againBtn").textContent = "Harjuta veel";
    cur = null; renderMap(); renderCount(); renderReports(); renderKlass(); show("s-home");
  }

  /* ---------- sündmused ---------- */
  $("sets").addEventListener("click", e => {
    const c = e.target.closest(".chip"); if (!c) return;
    cell = null; setChips(c.dataset.set); jataValikMeelde(); renderMap(); renderCount();
  });
  $("sfxBtn").setAttribute("aria-pressed", HSfx.enabled ? "true" : "false");
  $("sfxBtn").onclick = () => { HSfx.enabled = !HSfx.enabled; D.sfx = HSfx.enabled; save(); $("sfxBtn").setAttribute("aria-pressed", HSfx.enabled ? "true" : "false"); };
  $("startBtn").onclick = () => start("train");
  /* Võistluses tohib heli üks kord korrata, aga aeg jookseb edasi. */
  $("listenBtn").onclick = () => {
    const vaade = flagItem();
    if (!vaade) return;
    if (review !== null) { play(vaade.word); return; }
    if (G && G.mode === "test") {
      if (cur.done || G.replays >= 1) return;
      G.replays++; $("listenBtn").disabled = true;
      play(cur.word, G.kaivita);
      return;
    }
    play(cur.word);
  };
  $("cmpBtn").onclick = compare;
  $("allBtn").onclick = playAll;
  $("nextBtn").onclick = next;
  /* Võistluses küsib ✕ kinnitust: pooleli jäetud ring läheb ikka kirja ja
     päev on siis kasutatud, nii et eksikombel vajutamine oleks kallis.
     Kinnitust hoiab core/arm.js — nupp ise läheb nähtavalt ootele. */
  const quitArm = HArm($("quitBtn"), {
    note: $("quitNote"),
    message: HArm.quitMsg("Kirjutajas"),
    needsConfirm: () => !!(G && G.mode === "test" && G.n),
    action: () => { if (G && G.n) finish(); else goHome(); }
  });
  $("prevBtn").onclick = openPrev;
  $("reviewBack").onclick = exitReview;
  $("flagBtn").onclick = openFlag;
  $("flagCancel").onclick = closeFlag;
  $("flagBox").onclick = e => { if (e.target === $("flagBox")) closeFlag(); };
  $("flagOpts").addEventListener("click", e => {
    const b = e.target.closest("button[data-why]"); if (!b) return;
    sendFlag(b.dataset.why);
  });
  $("reportClear").onclick = () => { D.reports = []; save(); renderReports(); };
  $("againBtn").onclick = () => start("train", lastWrong);
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
  /* Klahvid käivad samade nuppude kaudu kui puudutus: tühik = kuulamisnupp
     (võistluses üks kordus, eelmise vaatamisel eelmine sõna). Varem mängis
     tühik piiramatult ja numbriklahv vastas eelmise vaatamise ajal käivale
     küsimusele (15. sept). */
  document.addEventListener("keydown", e => {
    if ($("s-game").hidden || !cur) return;
    if (!$("flagBox").hidden) { if (e.key === "Escape") { e.preventDefault(); closeFlag(); } return; }
    if (e.key === " ") { e.preventDefault(); if (!$("listenBtn").disabled) $("listenBtn").click(); return; }
    if (review !== null) { if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); exitReview(); } return; }
    if (e.key === "Enter" && cur.done && !$("after").hidden) { e.preventDefault(); next(); }
    else { const n = parseInt(e.key, 10); if (n >= 1 && n <= 3 && !cur.done) answer(cur.options[n - 1]); }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });

  $("mascot").innerHTML = KRobot("wave");
  $("mascot").onclick = () => {
    HSfx.unlock(); HSfx.ok();
    const svg = $("mascot").querySelector("svg"); svg.classList.remove("hop"); void svg.getBBox(); svg.classList.add("hop");
  };
  if (!pool().length) { set = "all"; cell = null; }   /* vana salvestus võib enam mitte kehtida */
  setChips(cell ? null : set);
  renderMap(); renderCount(); renderReports(); renderKlass();
  flushOutbox();
  sendReports();   /* võrguta jäänud märked lähevad teele, kui võrk on tagasi */

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

  /* Heli ette vahemällu. Service worker hoidis mp3-sid alles esimesest
     kuulamisest, mis tähendas, et võrguta töötasid ainult juba kuuldud sõnad —
     ja just Kirjutaja kohta oli avalehel lubadus, et ta töötab ilma
     internetita. Kogu komplekt on ~8 MB, seega laadime selle vaikselt taustal
     kümne kaupa ja alles siis, kui laps on esimese ringi alustanud: lehe
     avamine üksi ei tohi mobiilset andmesidet ära süüa. Lipp läheb kirja alles
     siis, kui kõik klipid on käes — muidu jääks pooleli laadimine lõplikuks. */
  function warmAudio() {
    if (!window.fetch || D.audioWarm === DATA.version) return;
    const seen = {}, list = [];
    DATA.items.forEach(it => it.options.forEach(o => {
      const u = src(variant(it, o));
      if (!seen[u]) { seen[u] = 1; list.push(u); }
    }));
    /* Lipp läheb kirja ainult siis, kui KÕIK klipid tulid päriselt kätte.
       Varem loeti ebaõnnestunud laadimine ka tehtuks ja uuesti ei proovitud
       (Codexi leid 15. sept). */
    let i = 0, vigu = 0;
    const step = () => {
      if (i >= list.length) { if (!vigu) { D.audioWarm = DATA.version; save(); } return; }
      const batch = list.slice(i, i + 10); i += 10;
      Promise.all(batch.map(u => fetch(u).then(r => { if (!r.ok) vigu++; }).catch(() => { vigu++; })))
        .then(() => setTimeout(step, 400))
        .catch(() => {});
    };
    step();
  }
})();
