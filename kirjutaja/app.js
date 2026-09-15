/* Kirjutaja — õigekirjamäng: kuula sõna, vali lünka g/k/kk, b/p/pp või d/t/tt.

   Raamistiku etapp 3 (15. sept 2026): mängu liikumine — päis, ✕, eelmise
   vaatamine, edasiminek, taimer, klaviatuur, veateate aken — tuleb failist
   core/mang.js, võistluse nupp ja päevapiir failist core/voistlus.js,
   saatmine failist core/saatmine.js. Siin on see, mis on Kirjutaja oma:
   kuulamine, kuulamisabi, häälikukaart, tulemus ja edetabel. Kuulamine on
   raamile üks erand: võistluse aeg hakkab jooksma alles siis, kui sõna on
   kõlanud (`taimerIse`). */
(function () {
  const DATA = window.KIRJUTAJA_DATA || { items: [], total: 0 };
  const KEY = "kirjutaja_v1";
  const D = HStore.load(KEY, { stats: {}, rounds: [] });
  D.stats = D.stats || {}; D.rounds = D.rounds || []; D.reports = D.reports || [];
  D.tests = D.tests || [];          // võistlusringid: {t, n, ok}
  D.lastCompete = D.lastCompete || "";
  D.outbox = D.outbox || [];        // saatmata tulemused
  D.board = D.board || null;        // viimane edetabel, et võrguta ka midagi näidata
  /* Vanad märked (enne 15. sept) hoidsid sõna väljadel id/word/sentence.
     Ühine saatmine tahab item/detail/sona — loeme vanad üle, midagi ei kustu. */
  D.reports.forEach(r => {
    if (!r.item && r.id) r.item = r.id;
    if (!r.detail && r.word) r.detail = r.word + (r.sentence ? " / " + r.sentence : "");
    if (!r.sona && r.word) r.sona = r.word;
  });
  /* Heli sees/väljas on ühine eelistus (core/eelistused.js), mitte mooduli oma lipp. */
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
  const LETTERS = "a-zõäöüšž";
  const MIKS = {
    haal: "Häält ei ole kuulda või see ütleb valesti",
    lause: "Lause on imelik",
    vastus: "Mäng näitab valet vastust",
    muu: "Midagi muud"
  };

  /* Valitud tähtede rühm ja kaardi lahter jäävad meelde nagu teistes
     moodulites valitud tase (15. sept). */
  let set = D.set || "all", cell = D.cell || null;
  const jataValikMeelde = () => { D.set = set; D.cell = cell; save(); };
  let round = null, audio = null;
  /* Ringi seis, mis on Kirjutaja oma:
     help = millise sõna juures on kuulamisabi praegu vajutatud;
     usedHelp = mis sõnale on abi juba korra antud (see tuleb ilma abita tagasi);
     reasked = et üks sõna ei tuleks abi pärast rohkem kui üks kord juurde;
     replays = mitu korda on võistluses sõna uuesti kuulatud. */
  let R = {};
  /* Viimase ringi vead: "Harjuta neid sõnu" peab päriselt neid sõnu harjutama. */
  let lastWrong = [];
  let allTimer = null;

  const masteredCount = () => DATA.items.filter(it => HEngine.mastered(D.stats[it.id])).length;

  const slug = w => w.replace(/õ/g, "6").replace(/ä/g, "2").replace(/ö/g, "7").replace(/ü/g, "y");
  const src = w => "audio/" + slug(w) + ".mp3";
  /* Võrdlushääl on teine salvestus kui küsimuse hääl. Kui laps saaks võrrelda
     sedasama klippi, vastaks ta klipi äratundmisega, mitte välte kuulmisega. */
  const cmpSrc = w => "audio2/" + slug(w) + ".mp3";
  const variant = (it, o) => it.pre + o + it.post;
  const test = () => !!(mang.G && mang.G.mode === "test");

  function pool() {
    return DATA.items.filter(it => {
      if (cell) return SERIES[it.answer] === cell.s && LEN(it.answer) === cell.l;
      return set === "all" || SERIES[it.answer] === set;
    });
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


  /* ---------- mooduli osa mängust ---------- */
  function joonistaLause(it) {
    const s = it.sentence || it.word;
    const re = new RegExp("(^|[^" + LETTERS + "])(" + it.word + ")(?=[^" + LETTERS + "]|$)", "i");
    const m = re.exec(s);
    const box = $("sentence"); box.innerHTML = "";
    const target = document.createElement("span"); target.className = "target";
    let before = "", after = "", shown = it.word;
    if (m) { before = s.slice(0, m.index + m[1].length); shown = m[2]; after = s.slice(m.index + m[1].length + m[2].length); }
    const pre = shown.slice(0, it.pre.length), post = shown.slice(it.pre.length + it.answer.length);
    const gap = document.createElement("span"); gap.className = "gap"; gap.id = "gap"; gap.textContent = " ";
    target.append(pre, gap, post);
    box.append(before, target, after);
  }

  function hintText(it) {
    const L = LEN(it.answer);
    if (L === "lyhike") return "<b>" + it.word + "</b> — häälik on lühike ja nõrk, seepärast kirjutame <b>" + it.answer + "</b>.";
    if (L === "pikk") return "<b>" + it.word + "</b> — häälik on pikk, aga mitte ülipikk. Kirjutame ühe tähe: <b>" + it.answer + "</b>.";
    return "<b>" + it.word + "</b> — häälik venib kõige kauem, see on ülipikk. Kirjutame kaks tähte: <b>" + it.answer + "</b>.";
  }


  const moodul = {
    joonista(it, vasta, vaade) {
      stop();
      joonistaLause(it);
      const opts = $("opts"); opts.innerHTML = "";
      it.options.forEach((o, k) => {
        const b = document.createElement("button");
        b.className = "opt"; b.id = "opt-" + k; b.dataset.o = o; b.textContent = o;
        b.onclick = () => vasta(o);
        opts.append(b);
      });
      /* Kuulamisabi ainult harjutamises ja ainult siis, kui sellele sõnale ei ole
         seda selles ringis juba antud — abiga vastatud sõna tuleb ilma abita tagasi. */
      $("cmpRow").hidden = vaade || test() || !!R.usedHelp[it.id];
      $("cmpNote").hidden = true;
      if (vaade) play(it.word);
    },
    /* Uus sõna ekraanil: mängi see ette. Võistluse taimer käivitub, kui sõna
       on kõlanud. Kordus ja vahelehe peitmine katkestavad esimese klipi,
       seega käivitab taimeri ka korduse lõpp ja igaks juhuks 6 s varukell —
       varem võis taimer jääda üldse käivitamata (Codexi leid 15. sept). */
    algus(it) {
      clearTimeout(R.varuTimer);
      R.timerOn = false;
      if (test()) {
        R.replays = 0; $("listenBtn").disabled = false;
        R.kaivita = () => {
          if (test() && mang.cur === it && !it.done && !R.timerOn) { R.timerOn = true; mang.kaivitaTaimer(); }
        };
        R.varuTimer = setTimeout(R.kaivita, 6000);
      } else {
        R.kaivita = null;
      }
      play(it.word, R.kaivita);
    },
    kontrolli: (it, o) => o === it.answer,
    oige: it => "„" + it.word + "“",
    valeLause: rec => "Õige on „" + rec.q.word + "“.",
    vihje: it => KRobot("kind", { head: true }) + '<div class="hinttext">' + hintText(it) + "</div>",
    sama: (a, b) => a.id === b.id,
    naitaVastus(rec) {
      const it = rec.q;
      $("cmpRow").hidden = true; $("cmpNote").hidden = true;
      [...$("opts").children].forEach(b => {
        b.disabled = true;
        b.classList.remove("right", "wrong", "lit");
        if (b.dataset.o === it.answer) b.classList.add("right");
        else if (b.dataset.o === rec.vastus) b.classList.add("wrong");
      });
      const gap = $("gap"); if (gap) { gap.textContent = it.answer; gap.classList.add("filled"); }
    },
    /* Vale vastuse järel loeb mäng kõik kolm varianti ette — aga ainult siis,
       kui laps on ikka sama sõna juures (varem võis hilinenud kõne mängida
       juba järgmise küsimuse variandid, 15. sept). */
    vastatud(rec) {
      if (rec.ok || test()) return;
      clearTimeout(allTimer);
      allTimer = setTimeout(() => { if (mang.cur === rec.q && !mang.review) playAll(); }, 600);
    },
    valikud: () => [...$("opts").children],
    aken() { stop(); },
    veateade: it => ({
      item: it.id, sona: it.word, lause: it.sentence || "",
      detail: it.word + (it.sentence ? " / " + it.sentence : "")
    }),
    /* Tühik käib kuulamisnupu kaudu: võistluses üks kordus, eelmise
       vaatamisel eelmine sõna (15. sept). */
    klahv(e) {
      if (e.key !== " ") return false;
      e.preventDefault();
      if (!$("listenBtn").disabled) $("listenBtn").click();
      return true;
    }
  };

  /* Kuulamisabi kolmas reegel: abiga vastatud sõna ei lähe selgeks ja tuleb
     samas ringis 3-6 küsimuse pärast ilma abita tagasi. Oskust kontrollitakse
     alati abita — muidu ei erista mäng kuulmist klipi äratundmisest. */
  function salvesta(it, ok) {
    stop();
    const helped = !!R.help[it.id]; delete R.help[it.id];
    round.record(it, ok);
    if (helped && !test()) {
      R.usedHelp[it.id] = true;
      const s = D.stats[it.id];
      if (ok && s) s.streak = 0;
      if (ok && !R.reasked[it.id] && round.asked < round.length * 2) {
        R.reasked[it.id] = true;
        round.due.push({ item: it, at: round.asked + 3 + Math.floor(Math.random() * 4) });
      }
    }
    save();
  }

  const mang = HMang.loo({
    kus: "Kirjutajas",
    sek: COMPETE_SEC,
    taimerIse: true,
    ekraanid: ["s-home", "s-game", "s-result", "s-board", "s-settings"],
    eelmineTekst: "Vaatad eelmist sõna",
    sammuTekst: n => "Vaatad sõna " + n + " sammu tagasi",
    moodul,
    salvesta,
    lopp: finish,
    kodu: goHome,
    teata: t => { saatmine.teata(t); renderReports(); }
  });

  const voistlus = HVoistlus.loo({
    D, save,
    nupp: $("competeBtn"), silt: $("competeLbl"), rida: $("competeNote"), lisarida: $("competeMeta"),
    kirjeldus: COMPETE_N + " juhuslikku sõna, iga sõna jaoks " + COMPETE_SEC + " sekundit. Vihjeid ei näidata.",
    alusta: () => start("test")
  });

  const saatmine = HSaatmine.loo({
    D, save, moodul: MODULE, op: OP, liik: "sona", miks: MIKS,
    versioon: DATA.version || null,
    lisa: () => ({ greens: masteredCount(), state: { stats: D.stats, tests: D.tests } }),
    tehtud: () => voistlus.margi(),
    auth: () => { D.board = null; save(); renderKlass(); }
  });

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
    $("trainMeta").textContent = n ? ringiPikkus(n) + " sõna" : "";
  }


  /* ---------- märgitud sõnad ---------- */
  function renderReports() {
    const box = $("reports"); if (!box) return;
    box.hidden = !D.reports.length;
    if (!D.reports.length) return;
    const list = $("reportList"); list.innerHTML = "";
    D.reports.forEach(r => {
      const li = document.createElement("li");
      li.textContent = (r.sona || r.word || r.item) + (r.why ? " — " + (MIKS[r.why] || r.why).toLowerCase() : "");
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


  /* ---------- ring ---------- */
  function start(mode, focus) {
    const t = mode === "test";
    const p = t ? pickCompete() : mixFocus(focus, pool());
    if (!p.length) return;
    const st0 = {}; p.forEach(it => { st0[it.id] = HEngine.mastered(D.stats[it.id]); });
    round = t ? new TestRound(p) : new HEngine.Round(p, D.stats, ringiPikkus(p.length));
    R = { pool: p, st0, help: {}, usedHelp: {}, reasked: {}, nudged: false, replays: 0 };
    $("listenBtn").disabled = false;
    mang.alusta(round, t ? "test" : "train");
    warmAudio();
  }
  const ringiPikkus = n => Math.min(ROUND_LEN, Math.max(6, n));

  /* Kuulamisabi enne vastamist: kolm pikkust järjest, lühike - pikk - ülipikk.
     Kolm asja eristavad seda spikrist:
     1. õiget ei tähistata ja variantide sõnu ei kirjutata välja — kirjapilt
        annaks päris sõna ära; süttib ainult täht, mille kõla parasjagu käib;
     2. võrdlus tuleb teise häälega kui küsimus (kaust audio2);
     3. abiga vastatud sõna tuleb ilma abita tagasi (vt salvesta()). */
  function compare() {
    const it = mang.cur; if (!it || it.done || mang.review || test()) return;
    if (R.usedHelp[it.id]) return;
    R.help[it.id] = true;
    if (!R.nudged) { R.nudged = true; $("cmpNote").hidden = false; }
    const btns = [...$("opts").children];
    let k = 0;
    const step = () => {
      btns.forEach(b => b.classList.remove("lit"));
      if (mang.cur !== it || it.done || k >= btns.length) { $("cmpBtn").classList.remove("playing"); return; }
      const b = btns[k++]; b.classList.add("lit");
      play(variant(it, b.dataset.o), () => setTimeout(step, 350), { cmp: true, btn: "cmpBtn" });
    };
    step();
  }

  function playAll() {
    const it = mang.vaadatav() || mang.cur; if (!it) return;
    const btns = [...$("opts").children];
    btns.forEach(b => {
      let sm = b.querySelector("small");
      if (!sm) { sm = document.createElement("small"); b.append(sm); }
      sm.textContent = variant(it, b.dataset.o);
    });
    let k = 0;
    const step = () => {
      btns.forEach(b => b.classList.remove("lit"));
      if ((mang.vaadatav() || mang.cur) !== it || k >= btns.length) return;
      const b = btns[k++]; b.classList.add("lit");
      play(variant(it, b.dataset.o), () => setTimeout(step, 350));
    };
    step();
  }


  /* ---------- tulemus ---------- */
  const tulemus = HTulemus.loo({
    D, save, saatmine, voistlus, mang, n: COMPETE_N,
    maskott: KRobot,
    alamTekst: "Vead näitavad, mida veel harjutada – nii see pähe jääbki.",
    selgeks: ["sõna", "sõna"],
    harjutaNeid: "Harjuta neid sõnu",
    veaPiir: 30,
    ringiLisa: () => ({ set: cell ? cell.s + "-" + cell.l : set }),
    veaRida: it => {
      const s = document.createElement("span");
      const mk = document.createElement("mark"); mk.textContent = it.answer;
      s.append(it.pre, mk, it.post);
      return s;
    }
  });

  function finish(G) {
    stop(); clearTimeout(allTimer); clearTimeout(R.varuTimer);
    const uued = R.pool.filter(it => !R.st0[it.id] && HEngine.mastered(D.stats[it.id])).length;
    lastWrong = tulemus.naita(G, { uued });
  }

  /* ---------- klass ja edetabel ---------- */
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
    voistlus.joonista();
  }

  const edetabel = HEdetabel.loo({
    D, save, moodul: MODULE, kus: "Kirjutajas", mang, saatmine, voistlus,
    n: COMPETE_N, asjad: "sõna",
    selged: { sakk: "Selged sõnad", yks: "selge sõna", mitu: "selget sõna",
              selgitus: "Selge sõna on see, mille oled kaks korda järjest õigesti kirjutanud." },
    kodu: () => mang.koju(), klass: renderKlass
  });
  const openBoard = () => edetabel.ava();
  const liitu = () => HKlass.openJoin({ app: "Kirjutajas", onDone: () => { renderKlass(); openBoard(); } });
  HSeaded.loo({
    mang, kodu: () => mang.koju(), muusika: false, liitu,
    lahkus: () => { D.board = null; save(); renderKlass(); }
  });

  function goHome() {
    stop(); clearTimeout(allTimer); clearTimeout(R.varuTimer);
    $("listenBtn").disabled = false;
    $("againBtn").textContent = "Harjuta veel";
    renderMap(); renderCount(); renderReports(); renderKlass();
    mang.naita("s-home");
  }

  /* ---------- sündmused ---------- */
  $("sets").addEventListener("click", e => {
    const c = e.target.closest(".chip"); if (!c) return;
    cell = null; setChips(c.dataset.set); jataValikMeelde(); renderMap(); renderCount();
  });
  HSfx.nupp($("sfxBtn")); HSfx.nupp($("sfxBtnG"));
  $("competeMeta").textContent = COMPETE_N + " sõna";
  $("startBtn").onclick = () => start("train");
  /* Võistluses tohib heli üks kord korrata, aga aeg jookseb edasi. */
  $("listenBtn").onclick = () => {
    const vaade = mang.vaadatav();
    if (vaade) { play(vaade.word); return; }
    const it = mang.cur; if (!it) return;
    if (test()) {
      if (it.done || R.replays >= 1) return;
      R.replays++; $("listenBtn").disabled = true;
      play(it.word, R.kaivita);
      return;
    }
    play(it.word);
  };
  $("cmpBtn").onclick = compare;
  $("allBtn").onclick = playAll;
  $("reportClear").onclick = () => { D.reports = []; save(); renderReports(); };
  $("againBtn").onclick = () => start("train", lastWrong);
  $("homeBtn").onclick = () => mang.koju();
  $("joinBtn").onclick = liitu;
  $("boardBtn").onclick = openBoard;
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });

  $("mascot").innerHTML = KRobot("wave");
  $("mascot").onclick = () => {
    HSfx.unlock(); HSfx.blip();
    const svg = $("mascot").querySelector("svg"); svg.classList.remove("hop"); void svg.getBBox(); svg.classList.add("hop");
  };
  if (!pool().length) { set = "all"; cell = null; }   /* vana salvestus võib enam mitte kehtida */
  setChips(cell ? null : set);
  renderMap(); renderCount(); renderReports(); renderKlass();
  saatmine.saada();
  saatmine.saadaTeated();   /* võrguta jäänud märked lähevad teele, kui võrk on tagasi */

  /* Kutselink kujul #k=KOOD avab liitumise juba täidetud koodiga. Kuulame ka
     hashchange't: kui laps on leht juba lahti ja klõpsab kutselingil, ei laadi
     brauser lehte uuesti ja ilma selleta ei juhtuks midagi. */
  function maybeInvite() {
    const m = /[#&]k=([A-Za-z0-9]{4,8})/.exec(location.hash || "");
    if (!m || !window.HKlass) return;
    history.replaceState(null, "", location.pathname);
    HKlass.openJoin({ code: m[1].toUpperCase(), app: "Kirjutajas", onDone: () => { renderKlass(); openBoard(); } });
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
