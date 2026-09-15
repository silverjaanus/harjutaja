/* Kell — analoogkella lugemine eesti keeles.
   Kaks ülesannet: „Mis kell on?" (kell ekraanil, vali sõnad) ja tagurpidi
   („Kell on pool neli. Milline kell seda näitab?"), lisaks ajaarvutuse
   tekstülesanded (tekst.js).

   Raamistiku etapp 3 (15. sept 2026): mängu liikumine tuleb failist
   core/mang.js, võistluse nupp ja päevapiir failist core/voistlus.js,
   saatmine failist core/saatmine.js. Siin on see, mis on Kella oma. */
(function () {
  'use strict';
  const KEY = "kell_v1";
  const D = HStore.load(KEY, { stats: {}, level: 2, rounds: [] });
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

  /* Ringi seis, mis on Kella oma (mang.js hoiab ülejäänut). */
  let round = null, R = {};
  /* Viimase ringi valed kellaajad: "Harjuta neid kellaaegu" peab päriselt
     neid harjutama, mitte lihtsalt uut ringi alustama. */
  let lastWrong = [];


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


  /* ---------- mooduli osa mängust ----------
     Iga ülesanne valmistatakse ette üks kord: tüüp ja segatud valikud
     pannakse ülesande KOOPIA külge. Nii näeb ‹ eelmise vaatamine täpselt
     sama pilti, mida laps nägi, ka siis, kui sama kellaaeg tuleb hiljem
     uute valikutega tagasi. */
  function valmista(item) {
    const it = Object.assign({}, item);
    const mins = R.mins;
    /* Kaks ülesannet vaheldumisi: iga kolmas on tagurpidi. Võistluses sama
       jaotus, et formaat oleks kõigil ühesugune. */
    it.tyyp = it.tekst ? "tekst" : ((round.asked % 3 === 0) ? "vali-kell" : "mis-kell");
    if (it.tyyp === "tekst") {
      const s = it.step;
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
      it.nupud = variandid.map(v => ({ k: võtmed(v), silt: silt(v) }));
      return it;
    }
    const kõik = sega([{ h: it.h, m: it.m }].concat(eksitajad(it.h, it.m, mins)));
    it.oigeK = võti({ h: it.h, m: it.m });
    it.nupud = kõik.map(t => ({ k: võti(t), silt: HAeg.utle(t.h, t.m), h: t.h, m: t.m }));
    return it;
  }

  const moodul = {
    valmista,
    joonista(it, vasta) {
      const opts = $("opts");
      opts.innerHTML = "";
      $("lugu").hidden = true;
      const nupp = (n, klass) => {
        const b = document.createElement("button");
        b.className = klass;
        b.dataset.k = n.k;
        b.onclick = () => vasta(n.k);
        opts.append(b);
        return b;
      };
      /* Tekstülesanne: lugu jääb ekraanile, küsimus on eraldi rea peal. */
      if (it.tyyp === "tekst") {
        const s = it.step;
        $("askClock").hidden = true;
        $("lugu").textContent = s.lugu + (it.kokku > 1 ? "  (" + it.osa + "/" + it.kokku + ")" : "");
        $("lugu").hidden = false;
        $("askText").textContent = s.kysimus;
        opts.className = "opts sonad";
        it.nupud.forEach(n => { nupp(n, "opt").textContent = n.silt; });
        return;
      }
      if (it.tyyp === "mis-kell") {
        $("askClock").innerHTML = HSihverplaat.svg(it.h, it.m, { size: 210 });
        $("askClock").hidden = false;
        $("askText").textContent = "Mis kell on?";
        opts.className = "opts sonad";
        it.nupud.forEach(n => { nupp(n, "opt").textContent = n.silt; });
        return;
      }
      $("askClock").hidden = true;
      $("askText").textContent = "Kell on " + HAeg.utle(it.h, it.m) + ". Milline kell seda näitab?";
      opts.className = "opts kellad";
      it.nupud.forEach(n => {
        const b = nupp(n, "opt kellopt");
        b.innerHTML = HSihverplaat.svg(n.h, n.m, { size: 130 });
        b.setAttribute("aria-label", "kell " + n.silt);
      });
    },
    kontrolli: (it, v) => v === it.oigeK,
    oige: it => (it.nupud.find(n => n.k === it.oigeK) || {}).silt || "",
    /* Kella lugemises ütleb vale vastuse lause kellaaja välja nagu päriselt. */
    valeLause: rec => rec.q.tekst ? "Õige vastus on " + moodul.oige(rec.q) + "." : "Kell on " + HAeg.utle(rec.q.h, rec.q.m) + ".",
    vihje: it => KKagu("kind", { head: true }) + '<div class="hinttext">' + (it.tekst ? it.step.vihje : vihje(it)) + "</div>",
    /* Tekstülesannete lood on kõik erinevad; kellaaeg on sama, kui tund,
       minut ja ülesande tüüp klapivad. */
    sama: (a, b) => !a.tekst && !b.tekst && a.h === b.h && a.m === b.m && a.tyyp === b.tyyp,
    naitaVastus(rec) {
      [...$("opts").children].forEach(b => {
        b.disabled = true;
        b.classList.remove("right", "wrong");
        if (b.dataset.k === rec.q.oigeK) b.classList.add("right");
        else if (!rec.aegOtsas && b.dataset.k === rec.vastus) b.classList.add("wrong");
      });
    },
    valikud: () => [...$("opts").children],
    /* Kella ülesanded on genereeritud, seega just siin tuleb imelik lause
       välja. Kontekst (lugu ja küsimus, nii nagu laps neid nägi) tuleb kaasa. */
    veateade(it) {
      if (it.tyyp === "tekst") {
        const s = it.step || {};
        const lause = ((s.lugu || "") + " " + (s.kysimus || "")).trim();
        return { item: "tekst-" + (s.tyyp || "?") + "-" + (s.kysimus || "").slice(0, 60), detail: lause, lause };
      }
      const lause = (it.tyyp === "vali-kell" ? "Milline kell näitab: " : "Mis kell on: ") + HAeg.utle(it.h, it.m);
      return { item: "kell-" + it.tyyp + "-" + it.h + "." + (it.m < 10 ? "0" : "") + it.m, detail: lause, lause };
    }
  };

  const mang = HMang.loo({
    kus: "Kellas",
    sek: COMPETE_SEC,
    ekraanid: ["s-home", "s-game", "s-result", "s-board", "s-settings"],
    moodul,
    salvesta: (it, ok) => { round.record(it, ok); save(); },
    lopp: finish,
    kodu: goHome,
    teata: t => saatmine.teata(t)
  });

  const voistlus = HVoistlus.loo({
    D, save,
    nupp: $("competeBtn"), silt: $("competeLbl"), rida: $("competeNote"), lisarida: $("competeMeta"),
    kirjeldus: COMPETE_N + " kellaaega, iga kellaaja jaoks " + COMPETE_SEC + " sekundit. Võistluses on kellaajad alati viie minuti täpsusega, et tulemusi saaks omavahel võrrelda.",
    alusta: () => start("test")
  });

  /* „Selge" on minutimuster, mille laps on kaks korda järjest õigesti öelnud. */
  const selged = () => TASEMED[3].mins.filter(m => HEngine.mastered(D.stats[String(m)])).length;

  const saatmine = HSaatmine.loo({
    D, save, moodul: MODULE, op: OP, liik: "ulesanne",
    miks: { lause: "Ülesande jutt on imelik", vastus: "Mäng näitab valet vastust", raske: "Ei saa aru, mida küsitakse", muu: "Midagi muud" },
    lisa: () => ({ greens: selged(), state: { stats: D.stats, tests: D.tests, level: D.level } }),
    tehtud: () => voistlus.margi(),
    auth: () => { D.board = null; save(); renderKlass(); }
  });

  /* ---------- ring ----------
     focus = eelmise ringi valed kellaajad. Tekstülesannetega seda ei tehta:
     lood on genereeritud ja sama loo kordamine ei õpeta midagi. */
  function start(mode, focus) {
    const test = mode === "test";
    /* „Harjuta neid kellaaegu" harjutab alati kella lugemist, ka siis, kui
       avalehel on valitud „Arvutan aega" (vead tulevad võistlusest). */
    const tekst = !test && D.opp === "tekst" && !(focus && focus.length);
    const lvlSamm = tase().mins.length > 1 ? tase().mins[1] : 60;
    /* Tekstülesannetes ei minda veerandtunnist peenemaks, ka siis mitte, kui
       laps on valinud viie minuti täpsuse. Põhjus on keeles: kestust „20 minuti
       pärast" ei saa lauses öelda, sest täpselt sama sõnadega algab kellaaeg
       „kahekümne minuti pärast seitse" (6.40) — laps jääb ootama tunninime.
       Vt kell/tekst.js päist, reegel 2. Tase „minuti täpsus" annab
       tekstirežiimis numbritega ülesanded (8.28), kus seda lõksu ei ole. */
    const numbrid = tekst && D.level === 4;
    const samm = tekst ? Math.max(15, lvlSamm) : lvlSamm;
    const tekstMins = [];
    for (let m = 0; m < 60; m += samm) tekstMins.push(m);
    /* Sihitud ring võib tulla võistlusest (5 min täpsus), seega peavad
       eksitajad tulema vähemalt sama peenest reast (Fable, B15). */
    const fookusMins = focus && focus.some(it => tase().mins.indexOf(it.m) < 0) ? COMPETE_MINS : tase().mins;
    const mins = test ? COMPETE_MINS : (tekst ? tekstMins : fookusMins);
    const p = test ? võistluspakk() : (tekst ? null : pakk(tase().mins));
    /* Sihitud ring: valed kellaajad ees, aga mitte üksi — üht kellaaega kaksteist
       korda järjest ei ole kellelegi vaja. Täidame ringi sama taseme aegadega. */
    let kordus = null;
    if (!test && !tekst && focus && focus.length) {
      const v = it => it.h + ":" + it.m;
      const seen = {}; kordus = [];
      focus.forEach(it => {
        if (seen[v(it)]) return;
        seen[v(it)] = 1;
        kordus.push({ id: it.id, lemma: it.lemma, h: it.h, m: it.m });
      });
      const rest = p.slice().sort(() => Math.random() - 0.5);
      for (const it of rest) {
        if (kordus.length >= 8) break;
        if (!seen[v(it)]) { seen[v(it)] = 1; kordus.push(it); }
      }
    }
    if (tekst) round = new TekstRound(samm, 10, numbrid);
    else if (test) round = new TestRound(p);
    else round = new HEngine.Round(kordus || p, D.stats, ROUND_LEN);
    if (!tekst && !p.length) return;
    /* st0 = mis oli juba selge enne ringi. Ilma selleta ei saa tulemuse
       ekraanil öelda, mitu kellaaega selles ringis selgeks sai. */
    const st0 = {};
    const pool = kordus || p;
    if (pool) pool.forEach(it => { st0[it.lemma] = HEngine.mastered(D.stats[it.lemma]); });
    R = { tekst, mins, pool: tekst ? null : pool, st0 };
    mang.alusta(round, test ? "test" : "train");
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


  /* ---------- tulemus ---------- */
  /* Mitu kellaaega selles ringis selgeks sai. Sama lemma (minutimuster) võib
     pakis mitu korda olla, seega loeme iga mustrit üks kord. */
  function uuedSelged() {
    if (!R.pool) return 0;
    const seen = {}; let n = 0;
    R.pool.forEach(it => {
      if (seen[it.lemma]) return;
      seen[it.lemma] = 1;
      if (!R.st0[it.lemma] && HEngine.mastered(D.stats[it.lemma])) n++;
    });
    return n;
  }

  const tulemus = HTulemus.loo({
    D, save, saatmine, voistlus, mang, n: COMPETE_N,
    maskott: KKagu,
    alamTekst: "Kell on keeruline asi. Iga ring teeb selle selgemaks.",
    selgeks: ["kellaaeg", "kellaaega"],
    harjutaNeid: "Harjuta neid kellaaegu",
    ringiLisa: () => ({ level: D.level }),
    /* Tekstülesannete lood on genereeritud ja neid ei korrata. */
    kordus: G => R.tekst ? [] : G.wrong.slice(),
    veaRida: it => {
      const s = document.createElement("span");
      if (it.tekst) {
        s.className = "vaeg lugu";
        s.innerHTML = "<b>" + it.step.kysimus + "</b><small>" + it.step.lugu + "</small>";
      } else {
        s.className = "vaeg";
        s.innerHTML = HSihverplaat.svg(it.h, it.m, { size: 54, numbers: false }) +
          "<small>" + HAeg.utle(it.h, it.m) + "</small>";
      }
      return s;
    }
  });

  function finish(G) {
    lastWrong = tulemus.naita(G, { uued: uuedSelged() });
  }

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
    $("startLbl").textContent = tekst ? "Arvuta" : "Harjuta";
    $("trainMeta").textContent = tekst ? "10 lugu" : ROUND_LEN + " kellaaega";
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
    voistlus.joonista();
  }

  /* ---------- edetabel ja seaded ---------- */
  const edetabel = HEdetabel.loo({
    D, save, moodul: MODULE, kus: "Kellas", mang, saatmine, voistlus,
    n: COMPETE_N, asjad: "kellaaega",
    selged: { sakk: "Selged kellaajad", yks: "selge kellaaeg", mitu: "selget kellaaega",
              selgitus: "Selge on kellaaeg, mille oled kaks korda järjest õigesti öelnud. Kokku on neid kaksteist." },
    kodu: () => mang.koju(), klass: renderKlass
  });
  const openBoard = () => edetabel.ava();
  const liitu = () => HKlass.openJoin({ app: "Kellas", onDone: () => { renderKlass(); openBoard(); } });
  HSeaded.loo({
    mang, kodu: () => mang.koju(), muusika: true, liitu,
    lahkus: () => { D.board = null; save(); renderKlass(); }
  });

  function goHome() {
    $("againBtn").textContent = "Harjuta veel";
    renderTasemed(); renderModes(); renderKaart(); renderKlass();
    mang.naita("s-home");
    renderNow();
  }

  /* ---------- sündmused ---------- */
  HSfx.nupp($("sfxBtn")); HSfx.nupp($("sfxBtnG"));
  HMuusika.init({ src: "muusika.mp3" });
  HMuusika.nupp($("musicBtn")); HMuusika.nupp($("musicBtnG"));
  $("competeMeta").textContent = COMPETE_N + " kellaaega";
  $("startBtn").onclick = () => start("train");
  $("againBtn").onclick = () => start("train", lastWrong);
  $("homeBtn").onclick = () => mang.koju();
  $("joinBtn").onclick = liitu;
  $("boardBtn").onclick = openBoard;

  $("mascot").innerHTML = KKagu("wave");
  $("mascot").onclick = () => {
    HSfx.unlock(); HSfx.blip();
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
  saatmine.saada();
  saatmine.saadaTeated();   /* võrguta jäänud märked lähevad teele, kui võrk on tagasi */

  function maybeInvite() {
    const m = /[#&]k=([A-Za-z0-9]{4,8})/.exec(location.hash || "");
    if (!m || !window.HKlass) return;
    history.replaceState(null, "", location.pathname);
    HKlass.openJoin({ code: m[1].toUpperCase(), app: "Kellas", onDone: () => { renderKlass(); openBoard(); } });
  }
  window.addEventListener("hashchange", maybeInvite);
  maybeInvite();

  if ("serviceWorker" in navigator) { navigator.serviceWorker.register("../sw.js").catch(() => {}); }
})();
