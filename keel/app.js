/* Keele mäng: inglise keele laused (esimene tund: Unit 4 „Where's the museum?").

   Sisu on failis tunnid.js, loogika (võrdlus, sammud, ring) lause.js-is,
   heli heli.js-is, klaviatuur klaviatuur.js-is, maskott tegelane.js-is.
   Kogu leht (avaleht, mäng, tulemus, edetabel, seaded) tuleb failist
   core/moodul.js (raamistiku mall, 16. sept) — siin on ainult Keele oma osa.

   Iga lause läbib viis sammu (vt lause.js): tutvu → lünk → kokku → kuula →
   tõlgi. Kava ja põhjendused: Claude'i projektis claude/keel-plaan.md.
   Võistlust ei ole — võistlusreeglid on Silveri otsus. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const L = KLause;

  const TUNNID = window.KEEL_TUNNID || [];
  /* api tuleb registreeri() lõpus; andmed saame juba laadi() konksust,
     sest avaleht joonistatakse registreerimise ajal. */
  let api = null, andmed = null;
  const mang = () => api.mang;
  const D = () => andmed;
  const tund = () => TUNNID.find(t => t.id === D().valik.tund) || TUNNID[0];

  const SAMMU_NIMI = {
    tutvu: "Kuula ja loe ette",
    lunk: "Kirjuta puuduv sõna",
    kokku: "Pane kokku",
    kuula: "Kirjuta kuulmise järgi",
    tolgi: "Tõlgi"
  };

  /* Kokkupaneku ja kirjutamise olek käiva ülesande kohta. */
  let pandud = [], kaardid = [];

  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const selged = st => TUNNID.reduce((n, t) => n + t.read.filter(r => L.selge(st, r.id)).length, 0);

  const KOLAR = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>';

  const HELP = '<p>Iga lauset harjutad viies sammus. Iga samm on eelmisest natuke raskem.</p>' +
    '<ul>' +
    '<li><b>Kuula ja loe ette.</b> Kuula lauset ja loe see valjult ette. Kui puudutad sõna, kuuled seda eraldi.</li>' +
    '<li><b>Kirjuta puuduv sõna.</b> Lauses on üks sõna puudu. Kirjuta see ise.</li>' +
    '<li><b>Pane kokku.</b> Sõnad on segamini, pane need õigesse järjekorda.</li>' +
    '<li><b>Kirjuta kuulmise järgi.</b> Kuula ja kirjuta lause.</li>' +
    '<li><b>Tõlgi.</b> Näed lauset eesti keeles ja kirjutad selle inglise keeles. Nii küsib ka õpetaja.</li>' +
    '</ul>' +
    '<p>Mängul on oma klaviatuur, et telefon ei pakuks sõnu ette. Suured ja väikesed tähed ning punkt lõpus ei loe, aga iga täht sõnas loeb. Ringi lõpus kirjuta laused ka vihikusse — ekraanil kirjutamine ei asenda käega kirjutamist.</p>' +
    '<p>Mängu ajal on ülesande all nupp <b>„Anna veast teada“</b>. Kui tõlge või hääl tundub vale, vajuta seda ja vali, mis on valesti. Vanemale või õpetajale: pikema tagasiside võib saata <a href="mailto:silver.jaanus@gmail.com?subject=Harjutaja:%20Keel">e-kirjaga</a>.</p>';

  /* ---------- laval olevad tükid ---------- */
  function sonadHtml(en, halvad) {
    return L.sonad(en).map((w, i) =>
      '<button class="w' + (halvad && halvad[i] ? " halb" : "") + '" data-w="' + esc(w) + '">' + esc(w) + "</button>").join("");
  }
  function kuulaNupud() {
    return '<div class="kuula"><button class="ghost" data-heli="rida">' + KOLAR + ' Kuula</button>' +
      '<button class="ghost" data-heli="aeglane">' + KOLAR + " Aeglaselt</button></div>";
  }

  /* ---------- mooduli osa mängust ---------- */
  let kb = null, uuesti = false;

  function abiNupp() {
    return '<div class="kuula"><button class="ghost" data-heli="abi">' + KOLAR + " Kuula abiks</button></div>" +
      '<p class="hint-small" id="abiNote" hidden>Kuulasid abiks. See lause tuleb selles ringis veel korra.</p>';
  }

  /* Mida laps kirjutab: lüngas üks sõna, muidu terve lause. */
  const siht = q => q.samm === "lunk" ? q.l.oige : q.rida.en;

  function naitaLynk(t) {
    const g = $("gap"); if (g) g.textContent = t || " ";
  }

  const moodul = {
    valmista(it) {
      const q = Object.assign({}, it, { abi: false });
      if (q.samm === "lunk") q.l = L.lunk(q.rida, tund().read);
      if (q.samm === "kokku") q.k = L.kaardid(q.rida.en);
      return q;
    },

    joonista(q, vasta, vaade) {
      const r = q.rida, lava = $("lava"), opts = $("opts");
      $("sammNimi").textContent = SAMMU_NIMI[q.samm];
      opts.hidden = true; opts.innerHTML = "";
      kb = null; uuesti = false; kaardid = []; pandud = [];
      let h = "";
      if (q.samm === "tutvu") {
        h = '<div class="en">' + sonadHtml(r.en) + "</div>" +
          '<p class="et">' + esc(r.et) + "</p>" +
          (r.lugu && r.lugu !== r.en ? '<p class="lugu"><b>Õpikus:</b>' + esc(r.lugu) + "</p>" : "") +
          kuulaNupud() +
          '<p class="hint-small">Kuula ja loe lause valjult ette. Puuduta sõna, et seda eraldi kuulda.</p>' +
          '<button class="primary" id="luges">Lugesin ette</button>';
      } else if (q.samm === "lunk") {
        /* Heli ei mängi ise: laps peab sõna meenutama, mitte kuulma (Silver 15. sept). */
        h = '<p class="et">' + esc(r.et) + "</p>" +
          '<div class="en">' + q.l.sonad.map((w, i) => i === q.l.koht
            ? '<span class="gap" id="gap">&nbsp;</span>' + esc(q.l.lopp)
            : "<span>" + esc(w) + "</span>").join("") + "</div>" +
          '<div id="kthost"></div>' + abiNupp();
      } else if (q.samm === "kokku") {
        h = '<p class="et">' + esc(r.et) + "</p>" +
          '<div class="rida-koht" id="koht" aria-label="Sinu lause"></div>' +
          '<div class="kaardid" id="kaardid"></div>' +
          '<button class="primary" id="kontrolli" disabled>Kontrolli</button>' + abiNupp();
      } else if (q.samm === "kuula") {
        h = kuulaNupud() + '<p class="et">' + esc(r.et) + "</p>" + '<div id="kthost"></div>';
      } else {
        h = '<p class="et suur">' + esc(r.et) + "</p>" +
          '<p class="hint-small">Kirjuta see inglise keeles.</p>' + '<div id="kthost"></div>' + abiNupp();
      }
      lava.innerHTML = h;
      lava._q = q;

      if (q.samm === "tutvu") $("luges").onclick = () => vasta("loetud");
      if (q.samm === "kokku") { kaardid = q.k; joonistaKaardid(q, vasta); }
      if ($("kthost")) {
        const lynk = q.samm === "lunk";
        kb = KKlaviatuur.loo({
          host: $("kthost"),
          peidaVali: lynk,
          silt: lynk ? "Puuduv sõna" : "Kirjuta lause inglise keeles",
          onMuutus: lynk ? naitaLynk : null,
          onVastus: v => (uuesti ? kontrolliUuesti(q, v) : vasta(v))
        });
        if (!vaade) setTimeout(() => { if (kb && !q.done) kb.fookus(); }, 50);
      }
      if (q.abi && $("abiNote")) $("abiNote").hidden = false;
    },

    tyhi(q, v) {
      if (q.samm === "tutvu") return null;
      if (q.samm === "kokku") return pandud.length < kaardid.length ? "Kasuta kõiki sõnu." : null;
      if (L.norm(v)) return null;
      return q.samm === "lunk" ? "Kirjuta puuduv sõna." : "Kirjuta lause.";
    },

    kontrolli(q, v) {
      if (q.samm === "tutvu") return true;
      if (q.samm === "lunk") return L.sonaNorm(v) === L.sonaNorm(q.l.oige);
      return L.kontrolli(q.rida.en, v);
    },

    oige: q => "„" + (q.samm === "lunk" ? q.l.oige : L.kuju(q.rida.en)) + "“",

    valeLause(rec) {
      const q = rec.q;
      if (q.samm === "lunk") return "Õige sõna on „" + q.l.oige + "“.";
      if (q.samm === "kokku") return "Õige järjekord on all.";
      const valesid = L.vordle(q.rida.en, rec.vastus || "").filter(x => !x.ok).length;
      if (valesid && valesid <= 2) return "Peaaegu! Vaata punaseid sõnu.";
      return "Vaata õiget lauset all.";
    },

    vihje(q, v) {
      const r = q.rida;
      let h = KPapagoi("teach", { head: true }) + '<div class="hinttext">';
      if (q.samm === "lunk") {
        h += '<p class="oigerida">' + q.l.sonad.map((w, i) => i === q.l.koht
          ? '<span class="halb">' + esc(w) + "</span>" : esc(w)).join(" ") + "</p>";
      } else {
        h += '<p class="oigerida">' + L.vordle(r.en, v || "").map(x => x.ok ? esc(x.sona) : '<span class="halb">' + esc(x.sona) + "</span>").join(" ") + "</p>";
      }
      h += "<p>" + esc(r.et) + "</p>";
      /* Codex ja Fable 15. sept: õige kuju näha, siis peida ja kirjuta uuesti. */
      if (q.samm !== "kokku") h += '<button class="ghost" data-uuesti="1">Peida ja kirjuta uuesti</button>';
      return h + "</div>";
    },

    sama: (a, b) => a.id === b.id,

    naitaVastus(rec) {
      const q = rec.q;
      if (q.samm === "tutvu") { const b = $("luges"); if (b) b.disabled = true; return; }
      if (q.samm === "kokku") {
        const k = $("koht");
        /* Reas on lapse järjekord; õige järjekord on vihjekaardil. */
        if (k) k.innerHTML = L.sonad(rec.vastus || "").map(w => '<span class="kaart pandud">' + esc(w) + "</span>").join("");
        const kk = $("kaardid"); if (kk) kk.innerHTML = "";
        const b = $("kontrolli"); if (b) b.hidden = true;
        return;
      }
      if (kb) {
        kb.pane(rec.vastus == null ? "" : rec.vastus);
        kb.lukusta();
        kb.input.classList.toggle("ok", rec.ok);
        kb.input.classList.toggle("bad", !rec.ok);
      }
      const g = $("gap");
      if (g) g.classList.add(rec.ok ? "oige" : "vale");
    },

    lukusta() {
      if (kb) kb.lukusta();
      const k = $("kontrolli"); if (k) k.disabled = true;
      const l = $("luges"); if (l) l.disabled = true;
      document.querySelectorAll("#kaardid .kaart, #koht .kaart").forEach(b => { b.disabled = true; });
    },

    fookus() { if (kb) kb.fookus(); },

    mustand() {
      if (kb) return { tekst: kb.vaartus() };
      if (kaardid.length) return { pandud: pandud.slice() };
      return null;
    },
    taasta(m) {
      if (!m) return;
      if (kb && m.tekst != null) kb.pane(m.tekst);
      if (m.pandud && $("koht")) { pandud = m.pandud.slice(); joonistaKaardid($("lava")._q, mang().vasta); }
    },

    valikud() { return []; },

    /* Arvutis: tähed lähevad väljale ka siis, kui fookus on mujal. */
    klahv(e, q) {
      if (kb && (!q.done || uuesti) && e.target !== kb.input && kb.klahv(e)) return true;
      if (e.key !== "Enter" || q.done) return false;
      if (q.samm === "tutvu" && $("luges")) { e.preventDefault(); $("luges").click(); return true; }
      if (q.samm === "kokku" && $("kontrolli") && !$("kontrolli").disabled) { e.preventDefault(); $("kontrolli").click(); return true; }
      return false;
    },

    algus(q) {
      if (q.samm !== "tutvu" && q.samm !== "kuula") return;
      setTimeout(() => { if (mang().cur === q && !q.done && !mang().review) KHeli.rida(q.rida); }, 250);
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

  /* „Peida ja kirjuta uuesti": õige kuju kaob, laps kirjutab uuesti sama
     klaviatuuriga. Tulemusse see ei lähe — see on ainult harjutus. */
  function alustaUuesti() {
    const q = $("lava")._q;
    if (!kb || !q || !q.done) return;
    uuesti = true;
    const o = $("hint").querySelector(".oigerida"); if (o) o.hidden = true;
    const b = $("hint").querySelector("[data-uuesti]"); if (b) b.hidden = true;
    const g = $("gap"); if (g) g.classList.remove("oige", "vale");
    kb.input.classList.remove("ok", "bad");
    kb.tyhjenda();
    kb.ava();
    $("fb").textContent = q.samm === "lunk" ? "Kirjuta puuduv sõna uuesti." : "Kirjuta lause uuesti.";
    $("fb").className = "feedback";
  }
  function kontrolliUuesti(q, v) {
    if (!L.norm(v)) return;
    const oige = q.samm === "lunk" ? L.sonaNorm(v) === L.sonaNorm(q.l.oige) : L.kontrolli(q.rida.en, v);
    const fb = $("fb");
    if (oige) {
      uuesti = false;
      kb.lukusta();
      kb.input.classList.add("ok");
      const g = $("gap"); if (g) g.classList.add("oige");
      fb.textContent = "Nüüd on õige!"; fb.className = "feedback ok";
      const o = $("hint").querySelector(".oigerida"); if (o) o.hidden = false;
      $("nextBtn").focus();
    } else {
      fb.textContent = "Veel mitte. Vaata õiget lauset ja proovi uuesti.";
      fb.className = "feedback bad";
      const o = $("hint").querySelector(".oigerida"); if (o) o.hidden = false;
      kb.tyhjenda();
    }
  }

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


  /* Paberil kontroll: eesti lause → laps kirjutab vihikusse → „Näita". */
  function joonistaPaber(host, read) {
    host.innerHTML = '<div class="paber" id="paber"></div>';
    const box = $("paber");
    read.forEach(r => {
      const d = document.createElement("div"); d.className = "pb";
      const et = document.createElement("p"); et.className = "et"; et.textContent = r.et;
      const en = document.createElement("span"); en.className = "en2"; en.textContent = L.kuju(r.en); en.hidden = true;
      const b = document.createElement("button"); b.className = "ghost"; b.textContent = "Näita";
      b.onclick = () => { en.hidden = false; b.hidden = true; };
      d.append(et, en, b); box.append(d);
    });
    return read.length > 0;
  }

  function renderRead(box) {
    box.className = "readmap"; box.innerHTML = "";
    tund().read.forEach(r => {
      const s = L.samm(D().stats, r.id);
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
    const koikSelged = read.every(r => L.selge(D().stats, r.id));
    $("startNote").textContent = koikSelged
      ? "Kõik laused on selged! Harjuta neid vahel ikka, et need meelde jääksid."
      : "Ringis on kuni " + n + " lauset. Üks ring võtab umbes 10 minutit.";
  }


  api = HMoodul.registreeri(Object.assign({}, moodul, {
    id: "keel",
    op: "laused",
    nimi: "Keel",
    kus: "Keeles",
    kirjeldus: "Inglise keele laused: kuula, loe ette ja kirjuta.",
    asjad: { yks: "lause", mitu: "lauset", mitmus: "laused" },
    maskott: (m, o) => KPapagoi(m, o),
    maskotiNimi: "Papagoi",
    /* Kuulamine on ülesanne ise, nagu Kirjutajas: taustamuusikat ei ole. */
    muusika: null,
    ringiPikkus: 5,
    voistlus: null,
    kiibid: [{
      id: "tund", silt: "Mida harjutad?",
      vaikimisi: TUNNID[0] && TUNNID[0].id,
      valikud: TUNNID.map(t => ({ id: t.id, nimi: t.nimi }))
    }],
    /* Enne malli oli valitud tund väljas D.tund. */
    laadi(d) {
      andmed = d;
      if (d.tund && !d.valik.tund) d.valik.tund = d.tund;
    },
    ring: (d, mode, fookus) => {
      const t = tund(); if (!t) return null;
      return new L.Ring(t.read, d.stats, { ringId: String(Date.now()), fookus: fookus || [] });
    },
    ringAlgas: (round, d) => {
      if (!d.audioWarm) KHeli.soojenda(tund().read, () => { d.audioWarm = true; api.save(); });
    },
    selgedArv: d => selged(d.stats),
    selgus: "Lause on selge, kui oled selle kahel eri korral ilma abita õigesti tõlkinud.",
    alamTekst: "Uued laused on alguses rasked. Iga ring teeb need tuttavamaks.",
    harjutaNeid: "Harjuta neid lauseid",
    /* Sama lause võib olla vigade seas mitme sammuga — järgmisele ringile üks kord. */
    kordus: G => [...new Set(G.wrong.map(q => q.rida.id))],
    veaRida: q => {
      const s = document.createElement("span");
      s.className = "vaeg";
      s.innerHTML = "<b>" + esc(q.rida.en) + "</b><small>" + esc(q.rida.et) + "</small>";
      return s;
    },
    enneTulemust(G) {
      KHeli.peata();
      /* Vigade nimekirjas iga lause üks kord. */
      const nahtud = {};
      G.wrong = G.wrong.filter(q => (nahtud[q.rida.id] ? false : (nahtud[q.rida.id] = true)));
    },
    /* Paberil kontroll: eesti lause → laps kirjutab vihikusse → „Näita". */
    tulemusLisa: {
      silt: "Kirjuta vihikusse",
      markus: "Loe eestikeelne lause, kirjuta see vihikusse inglise keeles ja vajuta siis „Näita“.",
      joonista: (host, G, round) => joonistaPaber(host, round ? round.valitud : [])
    },
    koju: () => KHeli.peata(),
    harjutaMeta: () => Math.min(5, tund().read.length) + " lauset",
    avaleht: () => renderStart(),
    kaart: {
      id: "readmap",
      silt: "Sinu laused",
      markus: "Iga lause läbib viis sammu. Lause on selge, kui oled selle kahel eri korral ilma abita õigesti tõlkinud.",
      joonista: host => renderRead(host)
    },
    lava: '<p class="samm" id="sammNimi"></p><div class="lava" id="lava"></div><div class="opts kolm" id="opts" hidden></div>',
    miks: { tolge: "Tõlge on vale", heli: "Hääl ütleb valesti", vastus: "Minu vastus oli õige", muu: "Midagi muud" },
    voimed: { eelmine: true, veateade: true },
    abi: HELP
  }));

  /* Sõna ja kuulamise nupud laval (üks kuulaja kogu lava jaoks). */
  $("lava").addEventListener("click", e => {
    const q = $("lava")._q; if (!q) return;
    const w = e.target.closest("button.w");
    if (w) { KHeli.sona(w.dataset.w, { nupp: w }); return; }
    const h = e.target.closest("button[data-heli]");
    if (!h) return;
    if (h.dataset.heli === "abi") {
      if (!q.done && !mang().review) { q.abi = true; $("abiNote").hidden = false; }
      KHeli.rida(q.rida, { nupp: h });
      if (kb && !q.done) kb.fookus();
      return;
    }
    KHeli.rida(q.rida, { aeglane: h.dataset.heli === "aeglane", nupp: h });
  });

  $("hint").addEventListener("click", e => {
    if (e.target.closest("button[data-uuesti]")) alustaUuesti();
  });
})();
