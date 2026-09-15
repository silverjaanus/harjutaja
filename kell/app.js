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
  D.reports = D.reports || [];   /* „midagi on valesti" märked, kuni need on saadetud */
  /* Mida laps harjutab: kella lugemist või ajaarvutust tekstülesannetega. */
  D.opp = D.opp === "tekst" ? "tekst" : "lugemine";
  D.tekstStat = D.tekstStat || { n: 0, ok: 0 };
  /* Heli sees/väljas on ühine eelistus (core/eelistused.js), mitte mooduli oma lipp. */
  const save = () => HStore.save(KEY, D);
  const $ = id => document.getElementById(id);

  /* Raskusastmed. Iga aste lisab eelmisele juurde, nii et laps ei kaota
     varem õpitut. Nimed on lapse omad, mitte arendaja omad. */
  const TASEMED = [
    { id: 1, nimi: "Täistunnid", mins: [0] },
    { id: 2, nimi: "Ja pooled", mins: [0, 30] },
    { id: 3, nimi: "Ja veerandid", mins: [0, 15, 30, 45] },
    /* „Kõik" ütleb, et eelmised astmed on sees (Silver 15. sept: vana nimi
       „Viie minuti täpsus" ei andnud seda välja). */
    { id: 4, nimi: "Kõik, 5 min kaupa", mins: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] },
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
  let tickTimer = null, deadline = 0, boardTab = "week";
  /* Viimase ringi valed kellaajad: "Harjuta neid kellaaegu" peab päriselt
     neid harjutama, mitte lihtsalt uut ringi alustama. */
  let lastWrong = [];

  const today = (d) => { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const competedToday = () => D.lastCompete === today();
  const bestTest = () => D.tests.reduce((b, t) => Math.max(b, t.ok), 0);
  const num = n => String(Math.round(n || 0));

  function show(id) {
    ["s-home", "s-game", "s-result", "s-board"].forEach(s => { $(s).hidden = s !== id; });
    /* Võistluses muusikat ei ole, seega pole ka muusikanuppu. */
    $("s-game").classList.toggle("voistlus", !!(G && G.mode === "test"));
    if (window.HMuusika) HMuusika.mang(id === "s-game" && !!G && G.mode === "train");
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

  /* Harjutamise kaardipakk: kõik selle taseme ajad.
     `id` JA `lemma` on mõlemad minut, mitte kellaaeg — sest õpitav oskus on
     minutimuster („pool", „kolmveerand"), mitte konkreetne kellaaeg. Tund on
     ainult variatsioon. HEngine kirjutab statistika `id` järgi, seega just
     sellest sõltub, kas kaart läheb roheliseks ja mis läheb edetabelisse. */
  function pakk(mins) {
    const out = [];
    for (let h = 1; h <= 12; h++) for (const m of mins) out.push({ id: String(m), lemma: String(m), h, m });
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

  /* ---------- tekstülesannete ring ----------
     Lood on eluliselt sõnastatud ja osa neist kahesammulised: esimene küsimus
     annab sündmuse alguse, teine küsib, mis kell tuleb kodust välja minna. */
  function TekstRound(samm, mitu, numbrid) {
    this.items = [];
    let kaitse = 0;
    while (this.items.length < mitu && kaitse++ < 60) {
      const lugu = numbrid ? HTekst.looNr() : HTekst.loo(samm);
      lugu.sammud.forEach((s, i) => this.items.push({
        id: "tekst", lemma: "tekst", tekst: true, step: s, osa: i + 1, kokku: lugu.sammud.length, samm
      }));
    }
    this.length = this.items.length; this.asked = 0; this.due = [];
  }
  TekstRound.prototype.next = function () {
    if (this.asked >= this.length) return null;
    return { item: this.items[this.asked++], repeat: false };
  };
  TekstRound.prototype.record = function (it, ok) {
    D.tekstStat.n++; if (ok) D.tekstStat.ok++;
  };

  /* ---------- mäng ----------
     focus = eelmise ringi valed kellaajad. Tekstülesannetega seda ei tehta:
     lood on genereeritud ja sama loo kordamine ei õpeta midagi. */
  function start(mode, focus) {
    HSfx.unlock();
    const test = mode === "test";
    /* „Harjuta neid kellaaegu" harjutab alati kella lugemist, ka siis, kui
       avalehel on valitud „Arvutan aega" (vead tulevad võistlusest). */
    const tekst = !test && D.opp === "tekst" && !(focus && focus.length);
    const lvlSamm = tase().mins.length > 1 ? tase().mins[1] : 60;
    /* Tekstülesannetes ei minda veerandtunnist peenemaks, ka siis mitte, kui
       laps on valinud viie minuti täpsuse. Põhjus on keeles: kestust „20 minuti
       pärast" ei saa lauses öelda, sest täpselt sama sõnadega algab kellaaeg
       „kahekümne minuti pärast seitse" (6.40) — laps jääb ootama tunninime.
       Tundidega seda muret ei ole: kellaaega ei öelda kunagi „kolme tunni
       pärast". Vt kell/tekst.js päist, reegel 2. Ja viie minuti täpsusega
       sõnalist ajaarvutust koolis niikuinii ei õpetata. */
    /* Tase „minuti täpsus" annab tekstirežiimis numbritega ülesanded (8.28),
       kus „pärast"-lõksu ei ole ja minuti täpsus on päris elu oma. */
    const numbrid = tekst && D.level === 4;
    const samm = tekst ? Math.max(15, lvlSamm) : lvlSamm;
    const tekstMins = [];
    for (let m = 0; m < 60; m += samm) tekstMins.push(m);
    const mins = test ? COMPETE_MINS : (tekst ? tekstMins : tase().mins);
    const p = test ? võistluspakk() : (tekst ? null : pakk(mins));
    /* Sihitud ring: valed kellaajad ees, aga mitte üksi — üht kellaaega kaksteist
       korda järjest ei ole kellelegi vaja. Täidame ringi sama taseme aegadega. */
    let kordus = null;
    if (!test && !tekst && focus && focus.length) {
      const võti = it => it.h + ":" + it.m + ":" + it.tyyp;
      const seen = {}; kordus = focus.slice();
      kordus.forEach(it => { seen[võti(it)] = 1; });
      const rest = p.slice().sort(() => Math.random() - 0.5);
      for (const it of rest) {
        if (kordus.length >= 8) break;
        if (!seen[võti(it)]) { seen[võti(it)] = 1; kordus.push(it); }
      }
    }
    if (tekst) round = new TekstRound(samm, 10, numbrid);
    else if (test) round = new TestRound(p);
    else round = new HEngine.Round(kordus || p, D.stats, ROUND_LEN);
    if (!tekst && !p.length) return;
    /* st0 = mis oli juba selge enne ringi. Ilma selleta ei saa tulemuse
       ekraanil öelda, mitu kellaaega selles ringis selgeks sai. */
    const st0 = {};
    if (p) p.forEach(it => { st0[it.lemma] = HEngine.mastered(D.stats[it.lemma]); });
    G = { mode: test ? "test" : "train", tekst, n: 0, ok: 0, wrong: [], history: [], mins, t0: Date.now(), pool: tekst ? null : p, st0 };
    $("flagBtn").hidden = test;   /* võistluses ei märgita, seal mõõdetakse */
    $("prevBtn").hidden = test;   /* võistluses tagasi ei vaadata */
    review = null; pendingAdvance = false; liveSnap = null;
    $("reviewBar").hidden = true;
    show("s-game");
    next();
  }

  /* ---------- midagi on valesti ----------
     Kella ülesanded on genereeritud, seega just siin tuleb imelik lause
     välja. Märge jääb seadmesse ja läheb serverisse; kontekst (lugu ja
     küsimus, nii nagu laps neid ekraanil nägi) tuleb kaasa ise. */
  let flagTimer = null;

  function reportKey(it) {
    if (!it) return null;
    if (it.tyyp === "tekst") {
      const s = it.step || {};
      return { item: "tekst-" + (s.tyyp || "?") + "-" + (s.kysimus || "").slice(0, 60),
               detail: ((s.lugu || "") + " " + (s.kysimus || "")).trim() };
    }
    return { item: "kell-" + it.tyyp + "-" + it.h + "." + (it.m < 10 ? "0" : "") + it.m,
             detail: (it.tyyp === "vali-kell" ? "Milline kell näitab: " : "Mis kell on: ") + HAeg.utle(it.h, it.m) };
  }

  function sendReports() {
    if (!window.HKlass || !HKlass.online() || !HKlass.issue) return Promise.resolve();
    const q = D.reports.filter(r => !r.sent);
    if (!q.length) return Promise.resolve();
    return q.reduce((chain, r) => chain.then(() =>
      HKlass.issue({ module: MODULE, kind: "ulesanne", item: r.item, detail: r.detail,
        note: r.why ? (MIKS[r.why] || r.why) : null })
        .then(res => { if (res && res.ok) { r.sent = true; save(); } })
        .catch(() => { })
    ), Promise.resolve());
  }

  /* Nupp on lause all ja ütleb sõnadega, mida ta teeb. Aken küsib ka, MIS on
     valesti — ilma selleta tuleb märge ilma vihjeta, mida otsida. */
  const MIKS = {
    lause: "Ülesande jutt on imelik",
    vastus: "Mäng näitab valet vastust",
    raske: "Ei saa aru, mida küsitakse",
    muu: "Midagi muud"
  };

  /* Veateade käib selle ülesande kohta, mis on ekraanil — ka eelmise vaatamisel. */
  function openFlag() {
    const k = reportKey(vaadatav() || cur); if (!k) return;
    /* Ootel edasiminek jääb ootele ja jätkub akna sulgemisel. Varem jäi
       mäng pärast õiget vastust siia kinni (15. sept). */
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; pendingAdvance = true; }
    flagIt = vaadatav() || cur;
    $("flagSentence").textContent = k.detail;
    $("flagBox").hidden = false;
  }

  let flagIt = null;
  function closeFlag() {
    $("flagBox").hidden = true;
    flagIt = null;
    if (pendingAdvance && review === null) { pendingAdvance = false; next(); }
  }

  function sendFlag(why) {
    const k = reportKey(flagIt || vaadatav() || cur); if (!k) return;
    const rec = D.reports.find(r => r.item === k.item);
    if (rec) { rec.why = why; rec.sent = false; }
    else D.reports.push({ item: k.item, detail: k.detail, why, at: new Date().toISOString(), sent: false });
    save();
    sendReports();
    closeFlag();
    const f = $("flagNote");
    f.textContent = "Aitäh! Andsid veast teada.";
    f.hidden = false;
    clearTimeout(flagTimer);
    flagTimer = setTimeout(() => { f.hidden = true; }, 2600);
  }

  function next() {
    clearTimeout(advanceTimer);
    stopTimer();
    review = null; pendingAdvance = false; liveSnap = null;
    $("reviewBar").hidden = true;
    $("flagNote").hidden = true; $("flagBox").hidden = true;
    const q = round.next();
    if (!q) return finish();
    cur = q.item; cur.done = false;
    /* Kaks ülesannet vaheldumisi: iga kolmas on tagurpidi. Võistluses sama
       jaotus, et formaat oleks kõigil ühesugune. */
    cur.tyyp = cur.tekst ? "tekst" : ((round.asked % 3 === 0) ? "vali-kell" : "mis-kell");
    renderQuestion(cur);
    const total = round.length + round.due.length;
    $("bar").style.width = Math.min(100, 100 * (round.asked - 1) / Math.max(total, 1)) + "%";
    if (G.mode === "test") startTimer();
    renderPrevBtn();
  }

  function renderQuestion(it) {
    const mins = G.mins;
    const opts = $("opts");
    opts.innerHTML = "";
    $("fb").textContent = ""; $("fb").className = "feedback";
    $("hint").hidden = true; $("after").hidden = true;
    $("lugu").hidden = true;

    /* Tekstülesanne: lugu jääb ekraanile, küsimus on eraldi rea peal. */
    if (it.tyyp === "tekst") {
      const s = it.step;
      $("askClock").hidden = true;
      $("lugu").textContent = s.lugu + (it.kokku > 1 ? "  (" + it.osa + "/" + it.kokku + ")" : "");
      $("lugu").hidden = false;
      $("askText").textContent = s.kysimus;
      opts.className = "opts sonad";
      let variandid, silt, võtmed;
      if (s.tyyp === "kestus") {
        variandid = sega(s.valikud.filter(v => v !== s.vastus).slice(0, 3).concat([s.vastus]));
        /* Numbritega ülesandes on vastus alati minutites; sõnadega ülesandes
           „tund aega", „poolteist tundi" jne. */
        silt = v => (s.numbritega ? HTekst.mitu(v) : HTekst.kestus(v));
        võtmed = v => "d:" + v;
        it.oigeK = "d:" + s.vastus;
      } else if (s.tyyp === "kellNr") {
        variandid = sega(s.valikud.filter(v => v !== s.vastus).slice(0, 3).concat([s.vastus]));
        silt = v => HTekst.kellNr(v);
        võtmed = v => "n:" + v;
        it.oigeK = "n:" + s.vastus;
      } else {
        variandid = sega([s.vastus].concat(eksitajad(s.vastus.h, s.vastus.m, mins)));
        silt = v => HAeg.utle(v.h, v.m);
        võtmed = v => võti(v);
        it.oigeK = võti(s.vastus);
      }
      variandid.forEach(v => {
        const b = document.createElement("button");
        b.className = "opt"; b.textContent = silt(v);
        b.dataset.k = võtmed(v);
        b.onclick = () => answer(b.dataset.k);
        opts.append(b);
      });
      return;
    }

    const kõik = sega([{ h: it.h, m: it.m }].concat(eksitajad(it.h, it.m, mins)));
    it.oigeK = võti({ h: it.h, m: it.m });

    if (it.tyyp === "mis-kell") {
      $("askClock").innerHTML = HSihverplaat.svg(it.h, it.m, { size: 210 });
      $("askClock").hidden = false;
      $("askText").textContent = "Mis kell on?";
      opts.className = "opts sonad";
      kõik.forEach(t => {
        const b = document.createElement("button");
        b.className = "opt"; b.textContent = HAeg.utle(t.h, t.m);
        b.dataset.k = võti(t);
        b.onclick = () => answer(b.dataset.k);
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
        b.dataset.k = võti(t);
        b.onclick = () => answer(b.dataset.k);
        opts.append(b);
      });
    }
  }

  function vihje(it) {
    const m = it.m, j = HAeg.utle(it.h, it.m);
    if (m === 0) return "Kui pikk osuti on kaheteistkümne peal, on täistund. Lühike osuti näitab, mis tund on — <b>" + j + "</b>.";
    if (m === 30) return "Pool tundi on veel <b>ees</b>, seepärast öeldakse järgmise tunni järgi. Kell on <b>" + j + "</b>.";
    if (m === 15) return "Veerand tundi on <b>tehtud</b> ja kolm veerandit veel ees. Nimetame tundi, kuhu jõuame: kell on <b>" + j + "</b>.";
    if (m === 45) return "Kolm veerandit on tehtud, üks veerand veel ees. Nimetame tundi, kuhu jõuame: kell on <b>" + j + "</b>.";
    if (m < 30) return "Pikk osuti on alles teel: kell <b>" + HAeg.utle(it.h, 0) + "</b> on läbi ja minutid tulevad juurde. Kell on <b>" + j + "</b>.";
    return "Pikk osuti on juba üle poole: loeme, kui palju on järgmise tunnini <b>puudu</b>. Kell on <b>" + j + "</b>.";
  }

  /* ---------- eelmiste ülesannete vaatamine ----------
     Sama muster nagu Kirjutajas: nool viib päris eelmise ülesande juurde.
     Kellas on valikud segatud ja eksitajad juhuslikud, seega ülesannet ei
     joonistata uuesti, vaid talletatakse ekraanipilt (kell, lugu, küsimus,
     nupud koos värvidega, tagasiside, vihje) täpselt sellisena, nagu laps
     seda nägi. Ainult harjutusringis. `review` = indeks G.history sees. */
  let review = null, pendingAdvance = false, liveSnap = null;

  function pilt() {
    return {
      clock: $("askClock").innerHTML, clockHidden: $("askClock").hidden,
      lugu: $("lugu").textContent, luguHidden: $("lugu").hidden,
      ask: $("askText").textContent,
      optsClass: $("opts").className, opts: $("opts").innerHTML,
      fb: $("fb").textContent, fbClass: $("fb").className,
      hint: $("hint").innerHTML, hintHidden: $("hint").hidden
    };
  }

  function taasta(p) {
    $("askClock").innerHTML = p.clock; $("askClock").hidden = p.clockHidden;
    $("lugu").textContent = p.lugu; $("lugu").hidden = p.luguHidden;
    $("askText").textContent = p.ask;
    $("opts").className = p.optsClass; $("opts").innerHTML = p.opts;
    [...$("opts").children].forEach(b => { b.onclick = () => answer(b.dataset.k); });
    $("fb").textContent = p.fb; $("fb").className = p.fbClass;
    $("hint").innerHTML = p.hint; $("hint").hidden = p.hintHidden;
  }

  function vaadatav() { return review === null ? null : G.history[review].it; }

  function talleta(it, ok) {
    if (!G.history) return;
    G.history.push({ it, ok, pilt: pilt() });
    renderPrevBtn();
  }

  /* Kui käiv ülesanne on juba vastatud, on see ise ajaloos viimane. */
  function eelmineIndeks() {
    if (!G || !G.history) return -1;
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
    if (review === null) liveSnap = pilt();
    review = i;
    const sammu = G.history.length - i;
    $("reviewWhich").textContent = sammu === 1 ? "Vaatad eelmist ülesannet" : "Vaatad ülesannet " + sammu + " sammu tagasi";
    $("reviewBar").hidden = false;
    $("flagNote").hidden = true;
    $("after").hidden = true;
    taasta(G.history[i].pilt);
    renderPrevBtn();
  }

  function exitReview() {
    if (review === null) return;
    review = null;
    $("reviewBar").hidden = true;
    if (pendingAdvance) { pendingAdvance = false; liveSnap = null; next(); return; }
    if (liveSnap) taasta(liveSnap);
    liveSnap = null;
    const rec = G.history[G.history.length - 1];
    $("after").hidden = !(cur && cur.done && rec && rec.it === cur && !rec.ok && G.mode !== "test");
    renderPrevBtn();
  }

  /* `valitud` on nupu võti (aeg „3:15" või kestus „d:20"); null = aeg sai otsa. */
  function answer(valitud) {
    if (review !== null) return;
    const it = cur; if (!it || it.done) return; it.done = true;
    /* Vastamine on teadlik jätkamine: ✕ ootel olek kaob siin. */
    quitArm.disarm();
    stopTimer();
    const test = G.mode === "test";
    const õige = it.oigeK;
    const ok = !!valitud && valitud === õige;
    round.record(it, ok); save();
    G.n++;
    if (ok) G.ok++;
    else if (it.tekst) { if (G.wrong.length < 6) G.wrong.push(it); }
    else if (!G.wrong.some(w => w.id === it.id && w.h === it.h && w.m === it.m)) G.wrong.push(it);

    let õigeSilt = "";
    [...$("opts").children].forEach(b => {
      b.disabled = true;
      if (b.dataset.k === õige) { b.classList.add("right"); õigeSilt = b.textContent; }
      else if (valitud && b.dataset.k === valitud) b.classList.add("wrong");
    });

    if (ok) {
      HSfx.ok();
      $("fb").textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      $("fb").className = "feedback ok";
      talleta(it, ok);
      advanceTimer = setTimeout(() => { advanceTimer = null; next(); }, test ? 800 : 1000);
      return;
    }
    HSfx.bad();
    $("fb").textContent = (valitud === null ? "Aeg sai otsa. " : "") +
      (it.tekst ? "Õige vastus on " + õigeSilt + "." : "Kell on " + HAeg.utle(it.h, it.m) + ".");
    $("fb").className = "feedback bad";
    if (test) {
      talleta(it, ok);
      advanceTimer = setTimeout(() => { advanceTimer = null; next(); }, 1400);
      return;
    }
    $("hint").innerHTML = KKagu("kind", { head: true }) + '<div class="hinttext">' +
      (it.tekst ? it.step.vihje : vihje(it)) + "</div>";
    $("hint").hidden = false;
    talleta(it, ok);
    $("after").hidden = false;
  }

  /* ---------- tulemus ---------- */
  function statKast(stats, big, small) {
    const d = document.createElement("div"); d.className = "stat";
    const b = document.createElement("b"); b.textContent = big;
    const s = document.createElement("span"); s.textContent = small;
    d.append(b, s); stats.append(d);
  }

  /* Mitu kellaaega selles ringis selgeks sai. Sama lemma (minutimuster) võib
     pakis mitu korda olla, seega loeme iga mustrit üks kord. */
  function uuedSelged() {
    if (!G.pool) return 0;
    const seen = {}; let n = 0;
    G.pool.forEach(it => {
      if (seen[it.lemma]) return;
      seen[it.lemma] = 1;
      if (!G.st0[it.lemma] && HEngine.mastered(D.stats[it.lemma])) n++;
    });
    return n;
  }

  function selgeksKast(stats) {
    const n = uuedSelged();
    if (n) statKast(stats, String(n), n === 1 ? "kellaaeg sai selgeks" : "kellaaega sai selgeks");
  }

  /* Tulemuse ekraani esmane nupp: kui vigu oli, harjutab see päriselt neid
     kellaaegu. Tekstülesannete lood on genereeritud ja neid ei korrata. */
  function setAgain() {
    lastWrong = G.tekst ? [] : G.wrong.slice();
    $("againBtn").textContent = lastWrong.length ? "Harjuta neid kellaaegu" : "Harjuta veel";
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
    else { title = "Hästi harjutatud!"; mood = "kind"; sub = "Kell on keeruline asi. Iga ring teeb selle selgemaks."; }
    $("resKagu").innerHTML = KKagu(mood);
    $("resTitle").textContent = title; $("resSub").textContent = sub; $("resSub").hidden = !sub;
    const stats = $("resStats"); stats.innerHTML = "";
    statKast(stats, G.ok + " / " + G.n, "õigesti");
    selgeksKast(stats);
    näitaVead();
    setAgain();
    show("s-result");
  }

  function näitaVead() {
    const nb = $("resNext"); nb.innerHTML = "";
    G.wrong.slice(0, 6).forEach(it => {
      const s = document.createElement("span");
      if (it.tekst) {
        s.className = "vaeg lugu";
        s.innerHTML = "<b>" + it.step.kysimus + "</b><small>" + it.step.lugu + "</small>";
      } else {
        s.className = "vaeg";
        s.innerHTML = HSihverplaat.svg(it.h, it.m, { size: 54, numbers: false }) +
          "<small>" + HAeg.utle(it.h, it.m) + "</small>";
      }
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
    /* „Kõik õiged" ja „Tugev ring" ainult täis ringi puhul (15. sept). */
    const tais = G.n >= COMPETE_N;
    if (tais && G.ok === G.n) { title = "Kõik õiged!"; mood = "cheer"; HSfx.tada(); }
    else if (record) { title = "Uus rekord!"; mood = "cheer"; HSfx.tada(); }
    else if (tais && pct >= 0.8) { title = "Tugev ring!"; mood = "cheer"; }
    else if (pct >= 0.5) { title = "Tubli võistlus!"; mood = "happy"; }
    else { title = "Võistlus tehtud!"; mood = "kind"; sub = "Harjutamine tõstab tulemust. Homme saad uuesti võistelda."; }
    $("resKagu").innerHTML = KKagu(mood);
    $("resTitle").textContent = title; $("resSub").textContent = sub; $("resSub").hidden = false;
    const stats = $("resStats"); stats.innerHTML = "";
    statKast(stats, G.ok + " / " + G.n, "õigesti");
    statKast(stats, String(bestTest()), record ? "uus rekord" : "sinu rekord");
    selgeksKast(stats);
    näitaVead();
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

  /* „Selge" on minutimuster, mille laps on kaks korda järjest õigesti öelnud. */
  const selged = () => TASEMED[3].mins.filter(m => HEngine.mastered(D.stats[String(m)])).length;

  /* ---------- avaleht ---------- */
  function renderTasemed() {
    const box = $("levels"); box.innerHTML = "";
    TASEMED.forEach(t => {
      const b = document.createElement("button");
      b.className = "chip";
      /* Neljas tase tähendab kella lugemises viie minuti, tekstülesannetes
         minuti täpsust — silt ütleb seda, mis parajasti kehtib. */
      b.textContent = (t.id === 4 && D.opp === "tekst") ? "Kõik, minuti kaupa" : t.nimi;
      b.setAttribute("aria-pressed", t.id === D.level ? "true" : "false");
      b.onclick = () => { D.level = t.id; save(); renderTasemed(); renderModes(); renderKaart(); };
      box.append(b);
    });
  }

  function renderModes() {
    document.querySelectorAll("#modes .chip").forEach(c => {
      c.setAttribute("aria-pressed", c.dataset.o === D.opp ? "true" : "false");
      c.onclick = () => { D.opp = c.dataset.o; save(); renderModes(); renderTasemed(); renderKaart(); };
    });
    const tekst = D.opp === "tekst";
    $("mapBlock").hidden = tekst;
    $("tekstBlock").hidden = !tekst;
    $("lblLevel").textContent = "Kui täpselt?";
    $("startBtn").textContent = tekst ? "Arvuta" : "Harjuta";
    const s = D.tekstStat;
    const peen = !tekst ? ""
      : D.level === 4
        ? " Siin on kellaajad numbritega nagu bussiplaanis (8.28) ja arvutad minuti täpsusega."
        : " Sõnadega ülesannetes on ajad veerandtundide kaupa (veerand, pool, kolmveerand), nii nagu kellaaega sõnadega öeldakse. Minuti täpsusega arvutamiseks vali „Kõik, minuti kaupa“.";
    $("tekstStat").textContent = (s.n
      ? "Tehtud " + s.n + " ülesannet, õigesti " + s.ok + "."
      : "Elulised ülesanded: mis kell film lõpeb, kui kaua trenn kestab, mis kell pead kodust välja minema.") + peen;
  }

  /* Väike kaart: iga minutimuster ja kui selge see on. */
  function renderKaart() {
    const box = $("map"); box.innerHTML = "";
    tase().mins.forEach(m => {
      const s = D.stats[String(m)];
      const d = document.createElement("div");
      d.className = "mcell" + (HEngine.mastered(s) ? " g" : (s && s.n ? " y" : ""));
      /* Näide alati kella kolme juures: „kolm, veerand neli, pool neli,
         kolmveerand neli" on üks selge rida, mitte iga ruut eri tunni pealt. */
      d.innerHTML = HSihverplaat.svg(3, m, { size: 46, numbers: false }) +
        "<small>" + HAeg.utle(3, m) + "</small>";
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
    const selged_ = n => n === 1 ? "selge kellaaeg" : "selget kellaaega";

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
    review = null; pendingAdvance = false; liveSnap = null;
    $("reviewBar").hidden = true;
    $("againBtn").textContent = "Harjuta veel";
    renderTasemed(); renderModes(); renderKaart(); renderKlass(); show("s-home");
  }

  /* ---------- sündmused ---------- */
  HSfx.nupp($("sfxBtn")); HSfx.nupp($("sfxBtnG"));
  HMuusika.init({ src: "muusika.mp3" });
  HMuusika.nupp($("musicBtn")); HMuusika.nupp($("musicBtnG"));
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
    message: HArm.quitMsg("Kellas"),
    needsConfirm: () => !!(G && G.mode === "test" && G.n),
    action: () => { if (G && G.n) finish(); else goHome(); }
  });

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

  document.addEventListener("keydown", e => {
    if ($("s-game").hidden || !cur) return;
    if (!$("flagBox").hidden) { if (e.key === "Escape") { e.preventDefault(); closeFlag(); } return; }
    if (review !== null) { if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); exitReview(); } return; }
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

  /* Nüüdiskell abitekstis, et laps näeks kohe päris näidet. Uueneb iga
     minutiga ja avalehele naastes — enne 15. septembrit jäi see lehe
     avamise hetke ja näitas kella õpetavas moodulis vale aega. */
  let nowMin = -1;
  function renderNow() {
    const n = new Date();
    const m = n.getHours() * 60 + n.getMinutes();
    if (m === nowMin) return;
    nowMin = m;
    $("nowClock").innerHTML = HSihverplaat.svg(n.getHours(), n.getMinutes(), { size: 96 });
    $("nowText").textContent = "Praegu on kell " + HAeg.utle(n.getHours(), n.getMinutes()) + ".";
  }
  renderNow();
  setInterval(() => { if (!$("s-home").hidden && !document.hidden) renderNow(); }, 5000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) renderNow(); });

  renderTasemed(); renderModes(); renderKaart(); renderKlass();
  flushOutbox();
  sendReports();   /* võrguta jäänud märked lähevad teele, kui võrk on tagasi */

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
