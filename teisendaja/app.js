/* Teisendaja mäng. Kogu sisu (ühikud, tasemed, ülesanded, diagnoos, vihjed)
   elab failis yhik.js, maskott on tegelane.js (KLint), redel on redel.js.

   Raamistiku etapp 2 (15. sept 2026): mängu liikumine — päis, ✕, eelmise
   vaatamine, edasiminek, taimer, klaviatuur, veateate aken — tuleb failist
   core/mang.js, võistluse nupp ja päevapiir failist core/voistlus.js ning
   tulemuste ja veateadete saatmine failist core/saatmine.js. Siin on ainult
   see, mis on Teisendaja oma: ülesanded, vastamisviis, vihje, avaleht,
   tulemus ja edetabel. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  const KEY = "teisendaja_v1";
  const D = HStore.load(KEY, {
    stats: {}, level: 2, kat: "koik",
    rounds: [], tests: [], outbox: [], reports: [], board: null
  });
  D.stats = D.stats || {};
  D.rounds = D.rounds || []; D.tests = D.tests || [];
  D.outbox = D.outbox || []; D.reports = D.reports || [];
  /* Heli sees/väljas on ühine eelistus (core/eelistused.js), mitte mooduli oma lipp. */
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

  let round = null, kb = null;
  /* Viimase ringi vead: "Harjuta neid teisendusi" peab päriselt neid
     harjutama, mitte lihtsalt uut ringi alustama. */
  let lastWrong = [];
  /* Selged paarid enne ringi — tulemus ütleb, mitu selles ringis lisandus. */
  let selgedEnne = 0;


  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }

  /* ---------- selged teisendused ----------
     Selge on ühikupaar (nt km ja m), mille laps on MÕLEMAT PIDI kaks korda
     järjest õigesti teinud. Sama arvestus käib avalehe kaardil, tulemuses ja
     edetabelis. Enne 15. septembrit loeti edetabelisse iga oskuse võti
     eraldi (ka „Kumb on suurem?" ja „Milline ühik sobib?"), aga selgitus
     lubas „mõlemat pidi" — number ja lause ei klappinud (Codex, B12). */
  const KOIK_PAARID = (() => {
    const out = [], seen = {};
    TYhik.TASEMED.forEach(t => {
      if (!t) return;
      t.paarid.forEach(p => {
        const k = [p[0], p[1]].sort().join("|");
        if (seen[k] || !TYhik.tegur(p[0], p[1])) return;
        seen[k] = 1; out.push(p);
      });
    });
    return out;
  })();
  const paarSelge = p => HEngine.mastered(D.stats[p[0] + ">" + p[1]]) && HEngine.mastered(D.stats[p[1] + ">" + p[0]]);
  const selged = () => KOIK_PAARID.filter(paarSelge).length;

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
  TestRound.prototype.record = function (it, ok) {
    const s = D.stats[it.id] || (D.stats[it.id] = { n: 0, ok: 0, streak: 0, lastOk: false, t: 0 });
    s.n++; s.t = Date.now(); s.lastOk = ok;
    if (ok) { s.ok++; s.streak++; } else { s.streak = 0; }
  };

  /* ---------- mooduli osa mängust ---------- */
  function oigeTekst(q) {
    if (q.valjad === 2) return TYhik.vormU(q.vastus[0], q.sildid[0]) + " " + TYhik.vormU(q.vastus[1], q.sildid[1]);
    if (q.valjad === 1) return TYhik.vormU(q.vastus, q.mida);
    if (q.tyyp === "vordle") return q.valikud[q.vastus];
    return TYhik.silt(q.vastus);
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

  const moodul = {
    joonista(q, vasta) {
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
          onVastus: v => vasta(v)
        });
        kb.fookus();
        return;
      }
      /* „Kumb on suurem?" ja „Milline ühik sobib?" on nupuvajutused — seal ei
         ole midagi kirjutada. */
      pad.hidden = true; opts.hidden = false;
      const sildid = q.valikudSildid || q.valikud;
      q.valikud.forEach((v, i) => {
        const b = document.createElement("button");
        b.className = "opt";
        b.textContent = sildid[i];
        b.dataset.k = q.tyyp === "vordle" ? String(i) : v;
        b.onclick = () => vasta(b.dataset.k);
        opts.append(b);
      });
    },
    /* Tühi „Vastan" ei ole vale vastus: laps vajutas kogemata. */
    tyhi(q, v) {
      if (q.valjad === 0 || !TYhik.kontrolli(q, v).tyhi) return null;
      return q.valjad === 2 ? "Kirjuta arv mõlemasse lahtrisse." : "Kirjuta vastus lahtrisse.";
    },
    kontrolli: (q, v) => !!TYhik.kontrolli(q, v).oige,
    oige: oigeTekst,
    vihje: vihjeKaart,
    sama: (a, b) => TYhik.voti(a) === TYhik.voti(b),
    naitaVastus(rec) {
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
    },
    lukusta() { if (kb) kb.lukusta(); },
    fookus() { if (kb) kb.fookus(); },
    mustand() { return kb ? kb.vaartused() : null; },
    taasta(m) { if (kb) kb.pane(m); },
    valikud() { return $("opts").hidden ? [] : [...$("opts").children]; },
    /* detail on tekst, nagu Kirjutajas ja Kellas: serveri väli on text.
       Võrdluse puhul on valikud sees, muidu ei tea, millisest käis jutt. */
    veateade(q) {
      const valik = q.valikud ? " (" + (q.valikudSildid || q.valikud).join(" / ") + ")" : "";
      return {
        item: TYhik.voti(q), lause: q.kysimus + valik,
        detail: q.kysimus + valik + " — õige: " + oigeTekst(q) + " — tase " + q.tase + ", " + q.tyyp
      };
    }
  };

  const mang = HMang.loo({
    kus: "Teisendajas",
    sek: COMPETE_SEC,
    ekraanid: ["s-home", "s-game", "s-result", "s-board", "s-settings"],
    moodul,
    salvesta: (q, ok) => { round.record(q, ok); save(); },
    lopp: finish,
    kodu: goHome,
    teata: t => saatmine.teata(t)
  });

  const voistlus = HVoistlus.loo({
    D, save,
    nupp: $("competeBtn"), silt: $("competeLbl"), rida: $("competeNote"), lisarida: $("competeMeta"),
    kirjeldus: COMPETE_N + " ülesannet, iga ülesande jaoks " + COMPETE_SEC + " sekundit. Võistluses on alati naaberühikud ja täisarvud, et tulemusi saaks omavahel võrrelda.",
    alusta: () => start("test")
  });

  const saatmine = HSaatmine.loo({
    D, save, moodul: MODULE, op: OP, liik: "ulesanne",
    miks: { ulesanne: "Ülesanne on imelik", vastus: "Mäng näitab valet vastust", raske: "Ei saa aru, mida küsitakse", muu: "Midagi muud" },
    lisa: () => ({ greens: selged(), state: { stats: D.stats, tests: D.tests, level: D.level } }),
    tehtud: () => voistlus.margi(),
    auth: () => { D.board = null; save(); renderKlass(); }
  });

  /* ---------- ring ---------- */
  function start(mode, focus) {
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
    selgedEnne = selged();
    const G = mang.alusta(round, test ? "test" : "train");
    G.tase = tase;
  }

  /* ---------- tulemus ---------- */
  const tulemus = HTulemus.loo({
    D, save, saatmine, voistlus, mang, n: COMPETE_N,
    maskott: KLint,
    alamTekst: "Ühikud lähevad kergesti segi. Iga ring teeb redeli selgemaks.",
    selgeks: ["teisendus", "teisendust"],
    harjutaNeid: "Harjuta neid teisendusi",
    ringiLisa: () => ({ level: D.level }),
    veaRida: q => {
      const s = document.createElement("span");
      s.className = "vaeg";
      s.innerHTML = "<b>" + esc(q.kysimus) + "</b><small>" + esc(oigeTekst(q)) + "</small>";
      return s;
    }
  });

  function finish(G) {
    lastWrong = tulemus.naita(G, { uued: selged() - selgedEnne });
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
    /* Tasemed kuhjuvad: iga tase sisaldab ka eelmiste ülesandeid
       (Silveri otsus 15. sept). */
    $("levelNote").textContent = (t ? "See tase sobib umbes " + t.klass.replace("klass", "klassile") + ". " : "") +
      "Igal tasemel on ka eelmiste tasemete ülesandeid.";
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

  /* Kaardi pealkiri on nimetavas: „euro ja sent", mitte „€ ja senti"
     (Fable 15. sept). Muud ühikud on tähisena. */
  const KAARDINIMI = { "€": "euro", "senti": "sent" };
  const kaardiNimi = t => KAARDINIMI[t] || TYhik.silt(t);

  function renderKaart() {
    const box = $("map"); box.innerHTML = "";
    paarid().forEach(p => {
      const a = D.stats[p[0] + ">" + p[1]], b = D.stats[p[1] + ">" + p[0]];
      const selge = paarSelge(p);
      const alustatud = (a && a.n) || (b && b.n);
      const d = document.createElement("div");
      d.className = "mcell" + (selge ? " g" : (alustatud ? " y" : ""));
      d.innerHTML = "<b>" + esc(kaardiNimi(p[0])) + " ja " + esc(kaardiNimi(p[1])) + "</b>" +
        "<small>" + esc(TYhik.vormU(1, p[0]) + " = " + TYhik.vormU(TYhik.tegur(p[0], p[1]).tegur, p[1])) + "</small>";
      box.append(d);
    });
  }

  function renderRedel() {
    const suurus = D.kat === "koik" ? "pikkus" : D.kat;
    $("homeRedel").innerHTML = window.HRedel ? HRedel.svg(suurus, {}) : "";
    $("homeRedelNote").textContent = suurus === "aeg"
      ? "Aeg ei ole kümnendsüsteemis: tunnis on 60 minutit, ööpäevas 24 tundi."
      : "Väiksemaks ühikuks korrutad, suuremaks ühikuks jagad.";
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
    D, save, moodul: MODULE, kus: "Teisendajas", mang, saatmine, voistlus,
    n: COMPETE_N, asjad: "ülesannet",
    selged: { sakk: "Selged teisendused", yks: "selge teisendus", mitu: "selget teisendust",
              selgitus: "Selge on teisendus, mille oled kummaski suunas kaks korda järjest õigesti teinud." },
    kodu: () => mang.koju(), klass: renderKlass
  });
  const openBoard = () => edetabel.ava();
  const liitu = () => HKlass.openJoin({ app: "Teisendajas", onDone: () => { renderKlass(); openBoard(); } });
  HSeaded.loo({
    mang, kodu: () => mang.koju(), muusika: true, liitu,
    lahkus: () => { D.board = null; save(); renderKlass(); }
  });

  function goHome() {
    $("againBtn").textContent = "Harjuta veel";
    renderTasemed(); renderKatid(); renderKaart(); renderRedel(); renderKlass();
    mang.naita("s-home");
  }

  /* ---------- sündmused ---------- */
  HSfx.nupp($("sfxBtn")); HSfx.nupp($("sfxBtnG"));
  $("trainMeta").textContent = ROUND_LEN + " ülesannet";
  $("competeMeta").textContent = COMPETE_N + " ülesannet";
  $("startBtn").onclick = () => start("train");
  $("againBtn").onclick = () => start("train", lastWrong);
  $("homeBtn").onclick = () => mang.koju();
  $("joinBtn").onclick = liitu;
  $("boardBtn").onclick = openBoard;

  $("mascot").innerHTML = KLint("wave");
  $("mascot").onclick = () => {
    HSfx.unlock(); HSfx.blip();
    const svg = $("mascot").querySelector("svg");
    svg.classList.remove("hop"); void svg.getBBox(); svg.classList.add("hop");
  };

  renderTasemed(); renderKatid(); renderKaart(); renderRedel(); renderKlass();
  saatmine.saada();
  saatmine.saadaTeated();   /* võrguta jäänud märked lähevad teele, kui võrk on tagasi */

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
