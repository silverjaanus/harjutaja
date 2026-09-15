/* Keele mäng: inglise keele read (esimene tund: Unit 4 „Where's the museum?").

   Sisu on failis tunnid.js, loogika (võrdlus, sammud, ring) lause.js-is,
   heli heli.js-is, maskott tegelane.js-is. Mängu liikumine, tulemus ja
   seaded tulevad tuumast (core/mang.js, core/tulemus.js, core/seaded.js).

   Iga rida läbib viis sammu (vt lause.js): tutvu → lünk → kokku → kuula →
   tõlgi. Kava ja põhjendused: Claude'i projektis claude/keel-plaan.md.
   Võistlust esimeses versioonis ei ole — võistlusreeglid on Silveri otsus. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const L = KLause;

  const KEY = "keel_v1";
  const D = HStore.load(KEY, { stats: {}, tund: null, rounds: [], tests: [], outbox: [], reports: [], board: null });
  D.stats = D.stats || {};
  D.rounds = D.rounds || []; D.tests = D.tests || [];
  D.outbox = D.outbox || []; D.reports = D.reports || [];
  const save = () => HStore.save(KEY, D);

  const TUNNID = window.KEEL_TUNNID || [];
  const tund = () => TUNNID.find(t => t.id === D.tund) || TUNNID[0];
  const MODULE = "keel", OP = "laused";

  const SAMMU_NIMI = {
    tutvu: "Tutvu",
    lunk: "Leia puuduv sõna",
    kokku: "Pane kokku",
    kuula: "Kirjuta kuulmise järgi",
    tolgi: "Tõlgi"
  };

  let round = null, lastWrong = [], selgedEnne = 0;
  /* Kokkupaneku ja kirjutamise olek käiva ülesande kohta. */
  let pandud = [], kaardid = [], sisend = null;

  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const selged = () => TUNNID.reduce((n, t) => n + t.read.filter(r => L.selge(D.stats, r.id)).length, 0);

  const KOLAR = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>';

  /* ---------- laval olevad tükid ---------- */
  function sonadHtml(en, halvad) {
    return L.sonad(en).map((w, i) =>
      '<button class="w' + (halvad && halvad[i] ? " halb" : "") + '" data-w="' + esc(w) + '">' + esc(w) + "</button>").join("");
  }
  function kuulaNupud(abi) {
    if (abi) return '<div class="kuula"><button class="ghost" data-heli="abi">' + KOLAR + " Kuula abiks</button></div>";
    return '<div class="kuula"><button class="ghost" data-heli="rida">' + KOLAR + ' Kuula</button>' +
      '<button class="ghost" data-heli="aeglane">' + KOLAR + " Aeglaselt</button></div>";
  }
  function kirjutaHtml() {
    return '<div class="kirjuta">' +
      '<input id="kirjuta" type="text" lang="en" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-label="Kirjuta lause inglise keeles">' +
      '<button class="primary" id="vastan">Vastan</button></div>';
  }

  /* ---------- mooduli osa mängust ---------- */
  const moodul = {
    valmista(it) {
      const q = Object.assign({}, it, { abi: false });
      const koik = tund().read;
      if (q.samm === "lunk") q.l = L.lunk(q.rida, koik);
      if (q.samm === "kokku") q.k = L.kaardid(q.rida.en);
      return q;
    },

    joonista(q, vasta, vaade) {
      const r = q.rida, lava = $("lava"), opts = $("opts");
      $("sammNimi").textContent = SAMMU_NIMI[q.samm];
      opts.hidden = true; opts.innerHTML = "";
      sisend = null; kaardid = []; pandud = [];
      let h = "";
      if (q.samm === "tutvu") {
        h = '<div class="en">' + sonadHtml(r.en) + "</div>" +
          '<p class="et">' + esc(r.et) + "</p>" +
          (r.lugu && r.lugu !== r.en ? '<p class="lugu"><b>Õpikus:</b>' + esc(r.lugu) + "</p>" : "") +
          kuulaNupud() +
          '<p class="hint-small">Loe lause valjult ette. Puuduta sõna, et seda eraldi kuulda.</p>' +
          '<button class="primary" id="luges">Lugesin ette</button>';
      } else if (q.samm === "lunk") {
        h = '<div class="en">' + q.l.sonad.map((w, i) => i === q.l.koht
          ? '<span class="gap" id="gap">&nbsp;</span>' + esc(q.l.lopp)
          : '<button class="w" data-w="' + esc(w) + '">' + esc(w) + "</button>").join("") + "</div>" +
          '<p class="et">' + esc(r.et) + "</p>" + kuulaNupud();
        opts.hidden = false;
        q.l.valikud.forEach(v => {
          const b = document.createElement("button");
          b.className = "opt"; b.textContent = v; b.dataset.k = v;
          b.onclick = () => vasta(v);
          opts.append(b);
        });
      } else if (q.samm === "kokku") {
        h = '<p class="et">' + esc(r.et) + "</p>" + kuulaNupud() +
          '<div class="rida-koht" id="koht" aria-label="Sinu lause"></div>' +
          '<div class="kaardid" id="kaardid"></div>' +
          '<button class="primary" id="kontrolli" disabled>Kontrolli</button>';
      } else if (q.samm === "kuula") {
        h = kuulaNupud() + '<p class="et">' + esc(r.et) + "</p>" + kirjutaHtml();
      } else {
        h = '<p class="et suur">' + esc(r.et) + "</p>" +
          '<p class="hint-small">Kirjuta see inglise keeles.</p>' + kirjutaHtml() + kuulaNupud(true) +
          '<p class="hint-small" id="abiNote" hidden>Kuulasid abiks. See lause tuleb selles ringis veel korra.</p>';
      }
      lava.innerHTML = h;

      if (q.samm === "tutvu") $("luges").onclick = () => vasta("loetud");
      if (q.samm === "kokku") {
        kaardid = q.k; pandud = [];
        joonistaKaardid(q, vasta);
      }
      if (q.samm === "kuula" || q.samm === "tolgi") {
        sisend = $("kirjuta");
        $("vastan").onclick = () => vasta(sisend.value);
        sisend.addEventListener("keydown", e => {
          if (e.key === "Enter" && !q.done) { e.preventDefault(); vasta(sisend.value); }
        });
        if (q.abi) $("abiNote").hidden = false;
      }
      lava.dataset.q = q.id;
      lava._q = q;
      if (!vaade && sisend) setTimeout(() => { if (sisend && !q.done) sisend.focus(); }, 50);
    },

    tyhi(q, v) {
      if (q.samm === "tutvu" || q.samm === "lunk") return null;
      if (q.samm === "kokku") return pandud.length < kaardid.length ? "Kasuta kõiki sõnu." : null;
      return L.norm(v) ? null : "Kirjuta lause lahtrisse.";
    },

    kontrolli(q, v) {
      if (q.samm === "tutvu") return true;
      if (q.samm === "lunk") return v === q.l.oige;
      return L.kontrolli(q.rida.en, v);
    },

    oige: q => q.samm === "lunk" ? "„" + q.l.oige + "“" : "„" + L.kuju(q.rida.en) + "“",

    valeLause(rec) {
      const q = rec.q;
      if (q.samm === "lunk") return "Õige sõna on „" + q.l.oige + "“.";
      if (q.samm === "kokku") return "Õige järjekord on all.";
      const d = L.vordle(q.rida.en, rec.vastus || "");
      const valesid = d.filter(x => !x.ok).length;
      if (valesid && valesid <= 2) return "Peaaegu! Vaata punaseid sõnu.";
      return "Vaata õiget lauset all.";
    },

    vihje(q, v) {
      const r = q.rida;
      let h = KPapagoi("teach", { head: true }) + '<div class="hinttext">';
      if (q.samm === "lunk") {
        h += '<p class="oigerida">' + esc(L.kuju(r.en)) + "</p><p>" + esc(r.et) + "</p>";
      } else {
        const d = L.vordle(r.en, v || "");
        h += '<p class="oigerida">' + d.map(x => x.ok ? esc(x.sona) : '<span class="halb">' + esc(x.sona) + "</span>").join(" ") + "</p>" +
          "<p>" + esc(r.et) + "</p>";
        if (q.samm !== "kokku") {
          /* Codex ja Fable 15. sept: õige kuju näha, siis peida ja kirjuta uuesti. */
          h += '<div class="uuesti" data-en="' + esc(r.en) + '">' +
            '<button class="ghost" data-uuesti="1">Peida ja kirjuta uuesti</button>' +
            '<input type="text" lang="en" hidden autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-label="Kirjuta lause uuesti">' +
            '<p class="teade" hidden></p></div>';
        }
      }
      return h + "</div>";
    },

    sama: (a, b) => a.id === b.id,

    naitaVastus(rec) {
      const q = rec.q;
      if (q.samm === "tutvu") { const b = $("luges"); if (b) b.disabled = true; return; }
      if (q.samm === "lunk") {
        [...$("opts").children].forEach(b => {
          b.disabled = true;
          b.classList.remove("right", "wrong");
          if (b.dataset.k === q.l.oige) b.classList.add("right");
          else if (b.dataset.k === rec.vastus) b.classList.add("wrong");
        });
        const g = $("gap");
        if (g) { g.textContent = q.l.oige; g.classList.add("taidetud"); }
        return;
      }
      if (q.samm === "kokku") {
        const k = $("koht");
        /* Reas on lapse järjekord; õige järjekord on vihjekaardil. */
        if (k) k.innerHTML = L.sonad(rec.vastus || "").map(w => '<span class="kaart pandud">' + esc(w) + "</span>").join("");
        const kk = $("kaardid"); if (kk) kk.innerHTML = "";
        const b = $("kontrolli"); if (b) b.hidden = true;
        return;
      }
      if (sisend) {
        sisend.value = rec.vastus == null ? "" : rec.vastus;
        sisend.disabled = true;
        sisend.classList.toggle("ok", rec.ok);
        sisend.classList.toggle("bad", !rec.ok);
        $("vastan").hidden = true;
      }
    },

    lukusta() {
      if (sisend) sisend.disabled = true;
      const v = $("vastan"); if (v) v.disabled = true;
      const k = $("kontrolli"); if (k) k.disabled = true;
      const l = $("luges"); if (l) l.disabled = true;
      document.querySelectorAll("#kaardid .kaart, #koht .kaart").forEach(b => { b.disabled = true; });
    },

    fookus() { if (sisend) sisend.focus(); },

    mustand() {
      if (sisend) return { tekst: sisend.value };
      if (kaardid.length) return { pandud: pandud.slice() };
      return null;
    },
    taasta(m) {
      if (!m) return;
      if (sisend && m.tekst != null) sisend.value = m.tekst;
      if (m.pandud && $("koht")) { pandud = m.pandud.slice(); joonistaKaardid($("lava")._q, mang.vasta); }
    },

    valikud() { return $("opts").hidden ? [] : [...$("opts").children]; },

    klahv(e, q) {
      if (e.key !== "Enter" || q.done) return false;
      if (q.samm === "tutvu" && $("luges")) { e.preventDefault(); $("luges").click(); return true; }
      if (q.samm === "kokku" && $("kontrolli") && !$("kontrolli").disabled) { e.preventDefault(); $("kontrolli").click(); return true; }
      return false;
    },

    algus(q) {
      if (q.samm === "tolgi") return;
      setTimeout(() => { if (mang.cur === q && !q.done && !mang.review) KHeli.rida(q.rida); }, 250);
    },

    vastatud(rec) {
      if (!rec.ok && rec.q.samm !== "tutvu") KHeli.rida(rec.q.rida);
    },

    aken() { KHeli.peata(); },

    veateade(q) {
      const r = q.rida;
      return {
        item: r.id + ":" + q.samm,
        lause: r.en + " — " + r.et,
        detail: r.en + " — " + r.et + " — samm " + q.samm + " — tund " + tund().id
      };
    }
  };

  /* Kokkupanek: puuduta kaarti, et see ritta panna; puuduta rea kaarti,
     et see tagasi võtta. Kontrolli nupp läheb lahti, kui kõik on reas. */
  function joonistaKaardid(q, vasta) {
    const koht = $("koht"), pool = $("kaardid");
    if (!koht || !pool) return;
    koht.innerHTML = ""; pool.innerHTML = "";
    pandud.forEach((idx, pos) => {
      const b = document.createElement("button");
      b.className = "kaart pandud"; b.textContent = kaardid[idx].s;
      b.onclick = () => { if (q.done) return; pandud.splice(pos, 1); joonistaKaardid(q, vasta); };
      koht.append(b);
    });
    kaardid.forEach((k, idx) => {
      const b = document.createElement("button");
      b.className = "kaart"; b.textContent = k.s;
      b.disabled = pandud.includes(idx);
      b.onclick = () => {
        if (q.done || pandud.includes(idx)) return;
        pandud.push(idx); KHeli.sona(k.s); joonistaKaardid(q, vasta);
      };
      pool.append(b);
    });
    const kb = $("kontrolli");
    kb.disabled = pandud.length < kaardid.length;
    kb.onclick = () => vasta(pandud.map(i => kaardid[i].s).join(" "));
  }

  /* Sõna ja kuulamise nupud laval (üks kuulaja kogu lava jaoks). */
  $("lava").addEventListener("click", e => {
    const q = $("lava")._q; if (!q) return;
    const w = e.target.closest("button.w");
    if (w) { KHeli.sona(w.dataset.w, { nupp: w }); return; }
    const h = e.target.closest("button[data-heli]");
    if (!h) return;
    if (h.dataset.heli === "abi") {
      if (!q.done && !mang.review) { q.abi = true; $("abiNote").hidden = false; }
      KHeli.rida(q.rida, { nupp: h });
      if (sisend && !q.done) sisend.focus();
      return;
    }
    KHeli.rida(q.rida, { aeglane: h.dataset.heli === "aeglane", nupp: h });
  });

  /* Vihjekaardi „Peida ja kirjuta uuesti": ei loe tulemusse, on ainult harjutus. */
  $("hint").addEventListener("click", e => {
    const b = e.target.closest("button[data-uuesti]"); if (!b) return;
    const box = b.closest(".uuesti"), inp = box.querySelector("input");
    $("hint").querySelector(".oigerida").hidden = true;
    b.hidden = true; inp.hidden = false; inp.value = ""; inp.focus();
  });
  $("hint").addEventListener("keydown", e => {
    const inp = e.target.closest(".uuesti input"); if (!inp || e.key !== "Enter") return;
    e.preventDefault(); e.stopPropagation();
    const box = inp.closest(".uuesti"), t = box.querySelector(".teade");
    t.hidden = false;
    if (L.kontrolli(box.dataset.en, inp.value)) {
      t.textContent = "Nüüd on õige!"; t.className = "teade ok";
      inp.disabled = true;
      $("hint").querySelector(".oigerida").hidden = false;
      $("nextBtn").focus();
    } else {
      t.textContent = "Veel mitte. Vaata õiget lauset ja proovi uuesti.";
      t.className = "teade bad";
      $("hint").querySelector(".oigerida").hidden = false;
    }
  });

  const mang = HMang.loo({
    kus: "Keeles",
    sek: 0,
    ekraanid: ["s-home", "s-game", "s-result", "s-board", "s-settings"],
    moodul,
    voimed: { eelmine: true },
    eelmineTekst: "Vaatad eelmist ülesannet",
    salvesta: (q, ok) => { round.record(q, ok, q.abi); save(); },
    lopp: finish,
    kodu: goHome,
    teata: t => saatmine.teata(t)
  });

  /* Võistlust ei ole; tulemus ja saatmine tahavad ometi objekti. */
  const voistlus = { margi() {}, joonista() {} };

  const saatmine = HSaatmine.loo({
    D, save, moodul: MODULE, op: OP, liik: "ulesanne",
    miks: { tolge: "Tõlge on vale", heli: "Hääl ütleb valesti", vastus: "Minu vastus oli õige", muu: "Midagi muud" },
    lisa: () => ({ greens: selged(), state: { stats: D.stats } }),
    tehtud: () => {},
    auth: () => { D.board = null; save(); }
  });

  /* ---------- ring ---------- */
  function start(fookus) {
    const t = tund(); if (!t) return;
    round = new L.Ring(t.read, D.stats, { ringId: String(Date.now()), fookus: fookus || [] });
    if (!round.length) return;
    selgedEnne = selged();
    mang.alusta(round, "train");
    if (!D.audioWarm) KHeli.soojenda(t.read, () => { D.audioWarm = true; save(); });
  }

  /* ---------- tulemus ---------- */
  const tulemus = HTulemus.loo({
    D, save, saatmine, voistlus, mang, n: 0,
    maskott: m => KPapagoi(m),
    alamTekst: "Uued laused on alguses rasked. Iga ring teeb need tuttavamaks.",
    selgeks: ["lause", "lauset"],
    harjutaNeid: "Harjuta neid lauseid",
    ringiLisa: () => ({ tund: tund().id }),
    /* Sama rida võib olla vigade seas mitme sammuga — nimekirjas üks kord. */
    kordus: G => [...new Set(G.wrong.map(q => q.rida.id))],
    veaRida: q => {
      const s = document.createElement("span");
      s.className = "vaeg";
      s.innerHTML = "<b>" + esc(q.rida.en) + "</b><small>" + esc(q.rida.et) + "</small>";
      return s;
    }
  });

  function finish(G) {
    KHeli.peata();
    /* Vigade nimekirjas iga rida üks kord. */
    const nahtud = {};
    G.wrong = G.wrong.filter(q => (nahtud[q.rida.id] ? false : (nahtud[q.rida.id] = true)));
    lastWrong = tulemus.naita(G, { uued: selged() - selgedEnne });
    joonistaPaber(round ? round.valitud : []);
  }

  /* Paberil kontroll: eesti lause → laps kirjutab vihikusse → „Näita". */
  function joonistaPaber(read) {
    const box = $("paber"); box.innerHTML = "";
    read.forEach(r => {
      const d = document.createElement("div"); d.className = "pb";
      const et = document.createElement("p"); et.className = "et"; et.textContent = r.et;
      const en = document.createElement("span"); en.className = "en2"; en.textContent = L.kuju(r.en); en.hidden = true;
      const b = document.createElement("button"); b.className = "ghost"; b.textContent = "Näita";
      b.onclick = () => { en.hidden = false; b.hidden = true; };
      d.append(et, en, b); box.append(d);
    });
    $("paberBlock").hidden = !read.length;
  }

  /* ---------- avaleht ---------- */
  function renderTunnid() {
    const box = $("tunnid"); box.innerHTML = "";
    TUNNID.forEach(t => {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = t.nimi;
      b.title = t.kirjeldus || "";
      b.setAttribute("aria-pressed", t === tund() ? "true" : "false");
      b.onclick = () => { D.tund = t.id; save(); renderAll(); };
      box.append(b);
    });
  }

  function renderRead() {
    const box = $("readmap"); box.innerHTML = "";
    tund().read.forEach(r => {
      const s = L.samm(D.stats, r.id);
      const d = document.createElement("div");
      d.className = "rr" + (s >= L.SAMMUD.length ? " g" : "");
      d.innerHTML = '<div class="t"><b>' + esc(L.kuju(r.en)) + "</b><small>" + esc(r.et) + "</small></div>" +
        '<span class="tapid" role="img" aria-label="' + (s >= L.SAMMUD.length ? "Selge" : "Samm " + (s + 1) + " viiest") + '">' +
        L.SAMMUD.map((_, i) => "<i" + (i < s ? ' class="on"' : "") + "></i>").join("") + "</span>";
      box.append(d);
    });
  }

  function renderStart() {
    const read = tund().read;
    const n = Math.min(5, read.length);
    $("trainMeta").textContent = n + " lauset";
    const koikSelged = read.every(r => L.selge(D.stats, r.id));
    $("startNote").textContent = koikSelged
      ? "Kõik laused on selged! Harjuta neid vahel ikka, et need meelde jääksid."
      : "Ringis on kuni " + n + " lauset. Üks ring võtab umbes 10 minutit.";
  }

  function renderAll() { renderTunnid(); renderRead(); renderStart(); }

  function goHome() {
    KHeli.peata();
    $("againBtn").textContent = "Harjuta veel";
    renderAll();
    mang.naita("s-home");
  }

  const liitu = () => HKlass.openJoin({ app: "Keeles", onDone: () => {} });
  HSeaded.loo({
    mang, kodu: () => mang.koju(), muusika: false, liitu,
    lahkus: () => { D.board = null; save(); }
  });

  /* ---------- sündmused ---------- */
  HSfx.nupp($("sfxBtn")); HSfx.nupp($("sfxBtnG"));
  $("startBtn").onclick = () => start();
  $("againBtn").onclick = () => start(lastWrong);
  $("homeBtn").onclick = () => mang.koju();

  $("mascot").innerHTML = KPapagoi("wave");
  $("mascot").onclick = () => {
    HSfx.unlock(); HSfx.blip();
    const svg = $("mascot").querySelector("svg");
    svg.classList.remove("hop"); void svg.getBBox(); svg.classList.add("hop");
  };

  renderAll();
  saatmine.saada();
  saatmine.saadaTeated();

  if ("serviceWorker" in navigator) { navigator.serviceWorker.register("../sw.js").catch(() => {}); }
})();
