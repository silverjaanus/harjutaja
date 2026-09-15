/* Teisendaja mäng. Kogu sisu (ühikud, tasemed, ülesanded, diagnoos, vihjed)
   elab failis yhik.js — siin on ainult ekraanid, ring ja tagasiside.
   Maskott on mõõdulint (tegelane.js, KLint), redel on redel.js. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  const KEY = "teisendaja_v1";
  const D = HStore.load(KEY, {
    stats: {}, sfx: true, level: 2, kat: "koik",
    rounds: [], tests: [], outbox: [], reports: [], board: null
  });
  D.stats = D.stats || {};
  D.rounds = D.rounds || []; D.tests = D.tests || [];
  D.outbox = D.outbox || []; D.reports = D.reports || [];
  HSfx.enabled = D.sfx !== false;
  const save = () => HStore.save(KEY, D);

  /* Pindala ja ruumala ilmuvad valikusse alles neljandal tasemel, sest need
     on 5. klassi teema (vt claude/teisendaja-plaan.md). */
  const KATID = [
    { id: "koik", nimi: "Kõik segi" },
    { id: "pikkus", nimi: "Pikkus" },
    { id: "mass", nimi: "Mass" },
    { id: "maht", nimi: "Maht" },
    { id: "aeg", nimi: "Aeg" },
    { id: "raha", nimi: "Raha" },
    { id: "pindala", nimi: "Pindala", tase: 4 },
    { id: "ruumala", nimi: "Ruumala", tase: 4 }
  ];

  const ROUND_LEN = 12;
  /* Võistlus on Silveri otsus 14. sept: 15 ülesannet, 15 sekundit igaüks,
     alati tasemel 2 ja kõigist kategooriatest segi. Aeg on pikem kui teistes
     moodulites, sest siin kirjutatakse vastus, mitte ei vajutata nuppu. */
  const COMPETE_N = 15, COMPETE_SEC = 15, COMPETE_TASE = 2;
  const MODULE = "teisendaja", OP = "yhik";
  const PRAISE = ["Õige!", "Täpselt!", "Tubli!", "Just nii!", "Väga hea!"];

  let round = null, cur = null, G = null, kb = null;
  let advanceTimer = null, tickTimer = null, deadline = 0;
  let boardTab = "week";
  /* Viimase ringi vead: "Harjuta neid teisendusi" peab päriselt neid
     harjutama, mitte lihtsalt uut ringi alustama. */
  let lastWrong = [];

  const today = (d) => { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const competedToday = () => D.lastCompete === today();
  const bestTest = () => D.tests.reduce((b, t) => Math.max(b, t.ok), 0);
  const num = n => String(Math.round(n || 0));

  function show(id) {
    ["s-home", "s-game", "s-result", "s-board"].forEach(s => { $(s).hidden = s !== id; });
    window.scrollTo(0, 0);
  }

  /* ---------- ülesannete pakk ----------
     yhik.js genereerib ülesandeid, aga kordamismootor tahab nimekirja, kus
     igal kirjel on id ja lemma (= oskus, nt "km>m"). Seega teeme paki ette ära
     ja laseme mootoril sealt valida: sama oskus võib pakis olla mitu korda eri
     arvudega, statistika käib ikka oskuse järgi. */
  function pakk(tase, kat, mitu) {
    const out = [], nahtud = {};
    for (let i = 0; i < mitu * 8 && out.length < mitu; i++) {
      const q = TYhik.genereeri(tase, kat);
      if (!q || nahtud[TYhik.voti(q)]) continue;
      nahtud[TYhik.voti(q)] = 1;
      out.push(q);
    }
    return out;
  }

  /* Võistlusring: kindel järjekord, kordusi ei ole, vead ei tule tagasi. */
  function TestRound(items) { this.items = items; this.length = items.length; this.asked = 0; this.due = []; }
  TestRound.prototype.next = function () {
    if (this.asked >= this.length) return null;
    return { item: this.items[this.asked++], repeat: false };
  };
  TestRound.prototype.record = function (it, ok) { salvesta(it, ok); };

  function salvesta(it, ok) {
    const s = D.stats[it.id] || (D.stats[it.id] = { n: 0, ok: 0, streak: 0, lastOk: false, t: 0 });
    s.n++; s.t = Date.now(); s.lastOk = ok;
    if (ok) { s.ok++; s.streak++; } else { s.streak = 0; }
  }

  /* ---------- taimer (ainult võistluses) ---------- */
  function stopTimer() { clearInterval(tickTimer); tickTimer = null; $("timer").hidden = true; }
  function startTimer() {
    stopTimer();
    $("timer").hidden = false;
    const fill = $("timerFill");
    deadline = performance.now() + COMPETE_SEC * 1000;
    const tick = () => {
      const left = deadline - performance.now();
      const osa = Math.max(0, left / (COMPETE_SEC * 1000));
      fill.style.width = (osa * 100).toFixed(1) + "%";
      fill.classList.toggle("low", osa < 0.25);
      if (left <= 0) { stopTimer(); answer(null); }
    };
    tick();
    tickTimer = setInterval(tick, 100);
  }

  /* ---------- ring ---------- */
  function start(mode, focus) {
    HSfx.unlock();
    const test = mode === "test";
    const tase = test ? COMPETE_TASE : D.level;
    const kat = test ? "koik" : D.kat;
    let items = pakk(tase, kat, test ? COMPETE_N : 40);
    /* Sihitud ring: valed teisendused ees, aga mitte üksi — üht ülesannet
       kaksteist korda järjest ei ole kellelegi vaja. */
    if (!test && focus && focus.length) {
      const seen = {}, out = focus.slice();
      out.forEach(q => { seen[TYhik.voti(q)] = 1; });
      const rest = items.slice().sort(() => Math.random() - 0.5);
      for (const q of rest) {
        if (out.length >= 8) break;
        if (!seen[TYhik.voti(q)]) { seen[TYhik.voti(q)] = 1; out.push(q); }
      }
      items = out;
    }
    if (!items.length) return;
    round = test ? new TestRound(items) : new HEngine.Round(items, D.stats, ROUND_LEN);
    G = { mode, n: 0, ok: 0, wrong: [], history: [], t0: Date.now(), tase };
    cur = null;
    review = null; pendingAdvance = false; draft = null;
    $("reviewBar").hidden = true;
    $("prevBtn").hidden = test;
    $("flagBtn").hidden = test;   /* võistluses ei märgita, seal mõõdetakse */
    $("bar").style.width = "0%";
    $("flagNote").hidden = true;
    show("s-game");
    next();
  }

  function next() {
    clearTimeout(advanceTimer); advanceTimer = null;
    review = null; pendingAdvance = false; draft = null;
    $("reviewBar").hidden = true;
    $("flagBox").hidden = true; flagQ = null;
    $("fb").textContent = ""; $("fb").className = "feedback";
    $("hint").hidden = true; $("after").hidden = true;
    const q = round.next();
    if (!q) return finish();
    cur = q.item;
    cur.done = false;
    renderQuestion(cur);
    const total = round.length + (round.due ? round.due.length : 0);
    $("bar").style.width = Math.min(100, (G.n / total) * 100) + "%";
    if (G.mode === "test") startTimer();
    renderPrevBtn();
  }

  function renderQuestion(q) {
    $("askText").textContent = q.kysimus;
    const pad = $("pad"), opts = $("opts");
    pad.innerHTML = ""; opts.innerHTML = "";
    kb = null;
    if (q.valjad > 0) {
      opts.hidden = true; pad.hidden = false;
      kb = HKlahvistik.loo({
        host: pad,
        valjad: q.valjad,
        sildid: (q.sildid || []).map(t => TYhik.silt(t)),
        koma: q.tase >= 4,
        onVastus: v => answer(v)
      });
      kb.fookus();
      return;
    }
    /* „Kumb on suurem?" ja „Milline ühik sobib?" on nupuvajutused — seal ei ole
       midagi kirjutada. Segamoodus on juba Kellas olemas. */
    pad.hidden = true; opts.hidden = false;
    const sildid = q.valikudSildid || q.valikud;
    q.valikud.forEach((v, i) => {
      const b = document.createElement("button");
      b.className = "opt";
      b.textContent = sildid[i];
      b.dataset.k = q.tyyp === "vordle" ? String(i) : v;
      b.onclick = () => answer(b.dataset.k);
      opts.append(b);
    });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }

  function oigeTekst(q) {
    if (q.valjad === 2) return TYhik.vormU(q.vastus[0], q.sildid[0]) + " " + TYhik.vormU(q.vastus[1], q.sildid[1]);
    if (q.valjad === 1) return TYhik.vormU(q.vastus, q.mida);
    if (q.tyyp === "vordle") return q.valikud[q.vastus];
    return TYhik.silt(q.vastus);
  }

  function answer(vastus) {
    /* Eelmise ülesande vaatamise ajal on väljad lukus, aga igaks juhuks:
       vaatamine ei tohi kunagi käiva ülesande vastust anda. */
    if (review !== null) return;
    const q = cur; if (!q || q.done) return;
    /* Tühi „Vastan" ei ole vale vastus: laps vajutas kogemata. Ülesanne jääb
       lahti ja väli saab fookuse (Fable'i ja Codexi leid 15. sept). */
    if (vastus !== null && vastus !== undefined && q.valjad > 0 && TYhik.kontrolli(q, vastus).tyhi) {
      $("fb").textContent = q.valjad === 2 ? "Kirjuta arv mõlemasse lahtrisse." : "Kirjuta vastus enne lahtrisse.";
      $("fb").className = "feedback";
      if (kb) kb.fookus();
      return;
    }
    q.done = true;
    /* Vastamine on teadlik jätkamine: ✕ ootel olek kaob siin. */
    quitArm.disarm();
    stopTimer();
    if (kb) kb.lukusta();
    const test = G.mode === "test";
    const aegOtsas = (vastus === null || vastus === undefined);
    const K = aegOtsas ? { oige: false, tyhi: true } : TYhik.kontrolli(q, vastus);
    const ok = !!K.oige;
    round.record(q, ok); save();
    G.n++;
    if (ok) G.ok++;
    else if (!G.wrong.some(w => TYhik.voti(w) === TYhik.voti(q))) G.wrong.push(q);

    const rec = {
      q, ok, aegOtsas,
      vastus: aegOtsas ? null : vastus,
      praise: ok ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : "",
      hint: (!ok && !test) ? vihjeKaart(q, vastus, aegOtsas) : ""
    };
    G.history.push(rec); renderPrevBtn();
    paintResult(rec);

    if (ok) {
      HSfx.ok();
      advanceTimer = setTimeout(() => { advanceTimer = null; next(); }, test ? 800 : 1000);
      return;
    }
    HSfx.bad();
    if (test) {
      advanceTimer = setTimeout(() => { advanceTimer = null; next(); }, 1400);
      return;
    }
    $("after").hidden = false;
  }

  /* Vihjekaart: kõigepealt diagnoos (MIS viga sa tegid), siis tehe ette,
     siis redel. Diagnoos on mooduli mõte — vt yhik.js diagnoosi(). */
  function vihjeKaart(q, vastus, aegOtsas) {
    const d = aegOtsas ? { liik: "tyhi", lause: "" } : TYhik.diagnoosi(q, vastus);
    const redel = (q.mille && q.mida && q.tyyp !== "yhik" && window.HRedel)
      ? HRedel.svg(q.suurus, { from: q.mille, to: q.mida }) : "";
    return KLint("kind", { head: true }) +
      '<div class="hinttext">' +
      (d.lause ? '<p class="diag">' + esc(d.lause) + "</p>" : "") +
      "<p>" + esc(TYhik.vihje(q)) + "</p>" +
      (redel ? '<div class="redelbox">' + redel + "</div>" : "") +
      "</div>";
  }

  /* Joonistab vastatud ülesande: valikunupud, tagasiside ja vihje. Sama pilt
     kehtib vastamise hetkel ja siis, kui laps tuleb noolega seda vaatama. */
  function paintResult(rec) {
    const q = rec.q;
    if (q.valjad === 0) {
      [...$("opts").children].forEach(b => {
        b.disabled = true;
        b.classList.remove("right", "wrong");
        const onOige = q.tyyp === "vordle" ? Number(b.dataset.k) === q.vastus : b.dataset.k === q.vastus;
        if (onOige) b.classList.add("right");
        else if (!rec.aegOtsas && b.dataset.k === String(rec.vastus)) b.classList.add("wrong");
      });
    } else if (kb) {
      if (rec.vastus !== null) kb.pane(rec.vastus);
      kb.lukusta();
    }
    if (rec.ok) {
      $("fb").textContent = rec.praise;
      $("fb").className = "feedback ok";
      $("hint").hidden = true;
      return;
    }
    $("fb").textContent = (rec.aegOtsas ? "Aeg sai otsa. " : "") + "Õige vastus on " + oigeTekst(q) + ".";
    $("fb").className = "feedback bad";
    $("hint").innerHTML = rec.hint;
    $("hint").hidden = !rec.hint;
  }

  /* ---------- eelmiste ülesannete vaatamine ----------
     Sama muster nagu Kirjutajas: nool viib päris eelmise ülesande juurde,
     koos lapse vastuse, õige vastuse ja vihjega. Ainult harjutusringis.
     `review` on indeks G.history sees; null tähendab, et mäng käib. */
  let review = null, pendingAdvance = false, draft = null;

  function vaadatav() { return review === null ? null : G.history[review].q; }

  /* Kui käiv ülesanne on juba vastatud, on see ise ajaloos viimane, seega
     tuleb esimene samm üks võrra kaugemale. */
  function eelmineIndeks() {
    if (!G) return -1;
    if (review !== null) return review - 1;
    return G.history.length - (cur && cur.done ? 2 : 1);
  }

  function renderPrevBtn() {
    $("prevBtn").disabled = eelmineIndeks() < 0;
  }

  function openPrev() {
    const i = eelmineIndeks();
    if (i < 0) return;
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; pendingAdvance = true; }
    /* Pooleli kirjutatud vastus ei tohi vaatamise ajal kaduma minna. */
    if (review === null && cur && !cur.done && kb) draft = kb.vaartused();
    review = i;
    const rec = G.history[i];
    const sammu = G.history.length - i;
    $("reviewWhich").textContent = sammu === 1 ? "Vaatad eelmist ülesannet" : "Vaatad ülesannet " + sammu + " sammu tagasi";
    $("reviewBar").hidden = false;
    $("flagNote").hidden = true;
    $("after").hidden = true;
    renderQuestion(rec.q);
    paintResult(rec);
    renderPrevBtn();
  }

  /* Tagasi mängu: kui vahepeal ootas edasiliikumine, läheb mäng edasi,
     muidu joonistatakse käiv ülesanne täpselt sellisena, nagu ta oli. */
  function exitReview() {
    if (review === null) return;
    review = null;
    $("reviewBar").hidden = true;
    if (pendingAdvance) { pendingAdvance = false; draft = null; next(); return; }
    if (!cur) return;
    $("fb").textContent = ""; $("fb").className = "feedback";
    $("hint").hidden = true; $("after").hidden = true;
    renderQuestion(cur);
    const rec = G.history[G.history.length - 1];
    if (cur.done && rec && rec.q === cur) {
      paintResult(rec);
      $("after").hidden = rec.ok || G.mode === "test";
    } else if (draft && kb) {
      kb.pane(draft);
    }
    draft = null;
    renderPrevBtn();
  }

  /* ---------- tulemus ---------- */
  function statKast(stats, big, small) {
    const d = document.createElement("div"); d.className = "stat";
    const b = document.createElement("b"); b.textContent = big;
    const s = document.createElement("span"); s.textContent = small;
    d.append(b, s); stats.append(d);
  }

  function naitaVead() {
    const nb = $("resNext"); nb.innerHTML = "";
    G.wrong.slice(0, 6).forEach(q => {
      const s = document.createElement("span");
      s.className = "vaeg";
      s.innerHTML = "<b>" + esc(q.kysimus) + "</b><small>" + esc(oigeTekst(q)) + "</small>";
      nb.append(s);
    });
    $("resNextBlock").hidden = !G.wrong.length;
  }

  /* Tulemuse ekraani esmane nupp: kui vigu oli, harjutab see päriselt neid
     teisendusi. Vigadeta ringil ei ole "neid" olemas. */
  function setAgain() {
    lastWrong = G.wrong.slice();
    $("againBtn").textContent = lastWrong.length ? "Harjuta neid teisendusi" : "Harjuta veel";
  }

  function finish() {
    /* Ootel edasiliikumine tuleb tühistada: ilma selleta võis ✕ vahetult
       pärast vastust jätta käima next()-i, mis jooksis juba tulemuse peal. */
    stopTimer(); clearTimeout(advanceTimer); advanceTimer = null;
    quitArm.disarm();
    const pct = G.n ? G.ok / G.n : 0;
    if (G.mode === "test") return finishCompete(pct);
    D.rounds.push({ t: Date.now(), n: G.n, ok: G.ok, level: D.level });
    if (D.rounds.length > 20) D.rounds.shift();
    save();
    let title, sub = "", mood = "happy";
    if (G.n < 4) { title = "Hea algus!"; mood = "wave"; }
    else if (pct >= 0.9) { title = "Suurepärane!"; mood = "cheer"; HSfx.tada(); }
    else if (pct >= 0.7) { title = "Hästi tehtud!"; mood = "happy"; }
    else { title = "Hästi harjutatud!"; mood = "kind"; sub = "Ühikud lähevad kergesti segi. Iga ring teeb redeli selgemaks."; }
    $("resLint").innerHTML = KLint(mood);
    $("resTitle").textContent = title;
    $("resSub").textContent = sub; $("resSub").hidden = !sub;
    const stats = $("resStats"); stats.innerHTML = "";
    statKast(stats, G.ok + " / " + G.n, "õigesti");
    naitaVead();
    setAgain();
    show("s-result");
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
    /* „Kõik õiged" ja „Tugev ring" ainult täis ringi puhul (15. sept). */
    const tais = G.n >= COMPETE_N;
    if (tais && G.ok === G.n) { title = "Kõik õiged!"; mood = "cheer"; HSfx.tada(); }
    else if (record) { title = "Uus rekord!"; mood = "cheer"; HSfx.tada(); }
    else if (tais && pct >= 0.8) { title = "Tugev ring!"; mood = "cheer"; }
    else if (pct >= 0.5) { title = "Tubli võistlus!"; mood = "happy"; }
    else { title = "Võistlus tehtud!"; mood = "kind"; sub = "Harjutamine tõstab tulemust. Homme saad uuesti võistelda."; }
    $("resLint").innerHTML = KLint(mood);
    $("resTitle").textContent = title;
    $("resSub").textContent = sub; $("resSub").hidden = false;
    const stats = $("resStats"); stats.innerHTML = "";
    statKast(stats, G.ok + " / " + G.n, "õigesti");
    statKast(stats, String(bestTest()), record ? "uus rekord" : "sinu rekord");
    naitaVead();
    setAgain();
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

  /* „Selge" on oskus (nt km>m), mille laps on kaks korda järjest õigesti teinud. */
  const selged = () => Object.keys(D.stats).filter(k => HEngine.mastered(D.stats[k])).length;

  /* ---------- veateade ---------- */
  let flagTimer = null;

  function reportKey(q) {
    if (!q) return null;
    /* detail on tekst, nagu Kirjutajas ja Kellas: serveri väli on text.
       Võrdluse puhul on valikud sees, muidu ei tea, millisest käis jutt. */
    const valik = q.valikud ? " (" + (q.valikudSildid || q.valikud).join(" / ") + ")" : "";
    return { item: TYhik.voti(q), detail: q.kysimus + valik + " — õige: " + oigeTekst(q) + " — tase " + q.tase + ", " + q.tyyp };
  }

  function sendReports() {
    if (!window.HKlass || !HKlass.online() || !HKlass.issue) return Promise.resolve();
    const q = D.reports.filter(r => !r.sent);
    if (!q.length) return Promise.resolve();
    return Promise.all(q.map(r =>
      HKlass.issue({ module: MODULE, kind: "ulesanne", item: r.item, detail: r.detail, note: r.why })
        .then(res => { if (res && res.ok) r.sent = true; }).catch(() => {})   /* ainult päris õnnestumine */
    )).then(save);
  }

  const MIKS = {
    ulesanne: "Ülesanne on imelik",
    vastus: "Mäng näitab valet vastust",
    raske: "Ei saa aru, mida küsitakse",
    muu: "Midagi muud"
  };

  /* Veateade käib selle ülesande kohta, mis on ekraanil — ka siis, kui laps
     vaatab noolega eelmist. */
  /* Aken lukustab ülesande, mille kohta ta avati, ja peatab edasimineku;
     muidu võis märge minna juba järgmise ülesande kohta (15. sept). */
  let flagQ = null;
  function openFlag() {
    const q = vaadatav() || cur;
    const k = reportKey(q); if (!k) return;
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; pendingAdvance = true; }
    flagQ = q;
    $("flagSentence").textContent = q.kysimus;
    $("flagBox").hidden = false;
  }
  function closeFlag() {
    $("flagBox").hidden = true;
    flagQ = null;
    if (pendingAdvance && review === null) { pendingAdvance = false; next(); }
  }

  function sendFlag(why) {
    const k = reportKey(flagQ || vaadatav() || cur); if (!k) return;
    const rec = D.reports.find(r => r.item === k.item);
    if (rec) { rec.why = why; rec.sent = false; }
    else D.reports.push({ item: k.item, detail: k.detail, why, sent: false, t: Date.now() });
    save(); closeFlag(); sendReports();
    const f = $("flagNote");
    f.textContent = "Aitäh! Andsid veast teada.";   /* sama tekst mis Kirjutajas ja Kellas */
    f.hidden = false;
    clearTimeout(flagTimer);
    flagTimer = setTimeout(() => { f.hidden = true; }, 2600);
  }

  /* ---------- avaleht ---------- */
  /* Näita ainult kategooriaid, milles sellel tasemel on ülesandeid
     (näiteks tasemel 1 mahtu ei ole). */
  function katid() { return KATID.filter(k => (!k.tase || D.level >= k.tase) && TYhik.kategooriaOlemas(D.level, k.id)); }

  function renderKatid() {
    const box = $("kats"); box.innerHTML = "";
    if (!katid().some(k => k.id === D.kat)) D.kat = "koik";
    katid().forEach(k => {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = k.nimi;
      b.setAttribute("aria-pressed", k.id === D.kat ? "true" : "false");
      b.onclick = () => { D.kat = k.id; save(); renderKatid(); renderKaart(); renderRedel(); };
      box.append(b);
    });
  }

  function renderTasemed() {
    const box = $("levels"); box.innerHTML = "";
    TYhik.TASEMED.forEach(t => {
      if (!t) return;
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = t.nimi;
      b.setAttribute("aria-pressed", t.nr === D.level ? "true" : "false");
      b.onclick = () => { D.level = t.nr; save(); renderTasemed(); renderKatid(); renderKaart(); renderRedel(); };
      box.append(b);
    });
    const t = TYhik.TASEMED[D.level];
    $("levelNote").textContent = t ? "See tase sobib umbes " + t.klass.replace("klass", "klassile") + "." : "";
  }

  /* Kaart näitab valitud taseme ühikupaare: roheline siis, kui mõlemad suunad
     on kaks korda järjest õiged olnud. */
  function paarid() {
    const t = TYhik.TASEMED[D.level];
    if (!t) return [];
    const out = [], seen = {};
    t.paarid.forEach(p => {
      const T = TYhik.tegur(p[0], p[1]);
      if (!T) return;
      if (D.kat !== "koik" && T.suurus !== D.kat) return;
      const k = p[0] + ">" + p[1];
      if (seen[k]) return;
      seen[k] = 1; out.push(p);
    });
    return out.slice(0, 12);
  }

  function renderKaart() {
    const box = $("map"); box.innerHTML = "";
    paarid().forEach(p => {
      const a = D.stats[p[0] + ">" + p[1]], b = D.stats[p[1] + ">" + p[0]];
      const selge = HEngine.mastered(a) && HEngine.mastered(b);
      const alustatud = (a && a.n) || (b && b.n);
      const d = document.createElement("div");
      d.className = "mcell" + (selge ? " g" : (alustatud ? " y" : ""));
      d.innerHTML = "<b>" + esc(TYhik.silt(p[0])) + " → " + esc(TYhik.silt(p[1])) + "</b>" +
        "<small>×" + esc(TYhik.vorm(TYhik.tegur(p[0], p[1]).tegur)) + "</small>";
      box.append(d);
    });
  }

  function renderRedel() {
    const suurus = D.kat === "koik" ? "pikkus" : D.kat;
    $("homeRedel").innerHTML = window.HRedel ? HRedel.svg(suurus, {}) : "";
    $("homeRedelNote").textContent = suurus === "aeg"
      ? "Aeg ei ole kümnendsüsteemis: tunnis on 60 minutit, ööpäevas 24 tundi."
      : "Iga aste korrutab või jagab arvu selle teguriga.";
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
    b.classList.remove("armed");
    if (competedToday()) {
      b.textContent = "Võistlus tehtud";
      b.disabled = true;
      n.textContent = "Võistelda saab üks kord päevas. Uus ring homme.";
      return;
    }
    b.disabled = false;
    b.textContent = "Võistle";
    n.textContent = COMPETE_N + " ülesannet, igale " + COMPETE_SEC + " sekundit. Võistluses on alati naaberühikud ja täisarvud, et tulemused oleksid võrreldavad.";
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
    if (tab === "sure") return "Selge on teisendus, mille oled mõlemat pidi kaks korda järjest õigesti teinud.";
    if (tab === "best") return "Sinu kõige parem võistlus. Igas võistluses on " + COMPETE_N + " ülesannet.";
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
    const selged_ = n => n === 1 ? "selge teisendus" : "selget teisendust";

    let rows = [];
    if (boardTab === "week") rows = (b.players || []).map(p => ({ name: p.nick, v: p.week_n, sub: days(p.days), me: p.id === b.me })).sort((x, y) => y.v - x.v);
    else if (boardTab === "sure") rows = (b.players || []).map(p => ({ name: p.nick, v: p.greens, sub: selged_(p.greens), me: p.id === b.me })).sort((x, y) => y.v - x.v);
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
    quitArm.disarm();
    cur = null;
    review = null; pendingAdvance = false; draft = null;
    $("reviewBar").hidden = true;
    $("flagBox").hidden = true; flagQ = null;
    $("againBtn").textContent = "Harjuta veel";
    renderTasemed(); renderKatid(); renderKaart(); renderRedel(); renderKlass();
    show("s-home");
  }

  /* ---------- sündmused ---------- */
  $("sfxBtn").setAttribute("aria-pressed", HSfx.enabled ? "true" : "false");
  $("sfxBtn").onclick = () => {
    HSfx.enabled = !HSfx.enabled; D.sfx = HSfx.enabled; save();
    $("sfxBtn").setAttribute("aria-pressed", HSfx.enabled ? "true" : "false");
  };
  $("startBtn").onclick = () => start("train");
  $("nextBtn").onclick = next;
  $("prevBtn").onclick = openPrev;
  $("reviewBack").onclick = exitReview;
  $("flagBtn").onclick = openFlag;
  $("flagCancel").onclick = closeFlag;
  $("flagBox").onclick = e => { if (e.target === $("flagBox")) closeFlag(); };
  $("flagOpts").addEventListener("click", e => {
    const b = e.target.closest("button[data-why]"); if (!b) return;
    sendFlag(b.dataset.why);
  });

  /* Võistluses küsib ✕ kinnitust: pooleli jäetud ring läheb ikka kirja ja
     päev on siis kasutatud. Kinnitust hoiab core/arm.js — nupp ise läheb
     nähtavalt ootele ja hoiatus saab oma rea. */
  const quitArm = HArm($("quitBtn"), {
    note: $("quitNote"),
    message: HArm.quitMsg("Teisendajas"),
    needsConfirm: () => !!(G && G.mode === "test" && G.n),
    action: () => { if (G && G.n) finish(); else goHome(); }
  });

  $("againBtn").onclick = () => start("train", lastWrong);
  $("homeBtn").onclick = goHome;
  $("joinBtn").onclick = () => HKlass.openJoin({ app: "Teisendajas", onDone: () => { renderKlass(); openBoard(); } });
  $("boardBtn").onclick = openBoard;
  $("bBack").onclick = goHome;
  $("bRefresh").onclick = () => flushOutbox().then(loadBoard);
  $("bInvite").onclick = invite;
  $("bTabs").addEventListener("click", e => {
    const c = e.target.closest(".chip"); if (!c) return;
    boardTab = c.dataset.t; renderBoard();
  });

  /* Enter viib edasi siis, kui vastus on juba antud. Numbriklahvid kuuluvad
     klahvistikule, seega siin neid ei püüta. */
  document.addEventListener("keydown", e => {
    if ($("s-game").hidden || !cur || e.defaultPrevented) return;   /* klahvistik võttis klahvi juba */
    if (!$("flagBox").hidden) { if (e.key === "Escape") { e.preventDefault(); closeFlag(); } return; }
    if (review !== null) { if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); exitReview(); } return; }
    if (e.key === "Enter" && cur.done && !$("after").hidden) { e.preventDefault(); next(); return; }
    /* Valikküsimustel valivad numbrid vastuse, nagu Kellas ja Kirjutajas. */
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4 && !cur.done && cur.valjad === 0) {
      const b = $("opts").children[n - 1];
      if (b) { e.preventDefault(); b.click(); }
    }
  });

  $("mascot").innerHTML = KLint("wave");
  $("mascot").onclick = () => {
    HSfx.unlock(); HSfx.ok();
    const svg = $("mascot").querySelector("svg");
    svg.classList.remove("hop"); void svg.getBBox(); svg.classList.add("hop");
  };

  renderTasemed(); renderKatid(); renderKaart(); renderRedel(); renderKlass();
  flushOutbox();
  sendReports();   /* võrguta jäänud märked lähevad teele, kui võrk on tagasi */

  function maybeInvite() {
    const m = /[#&]k=([A-Za-z0-9]{4,8})/.exec(location.hash || "");
    if (!m || !window.HKlass) return;
    history.replaceState(null, "", location.pathname);
    HKlass.openJoin({ code: m[1].toUpperCase(), app: "Teisendajas", onDone: () => { renderKlass(); openBoard(); } });
  }
  window.addEventListener("hashchange", maybeInvite);
  maybeInvite();

  if ("serviceWorker" in navigator) { navigator.serviceWorker.register("../sw.js").catch(() => {}); }
})();
