/* MALL: mooduli kirjeldus. See on kogu mooduli „liim": tekstid, valikud,
   ülesannete pakk ja see, kuidas ülesanne ekraanile joonistatakse. Kõik muu
   (päis, ✕, ‹ eelmine, „Edasi", taimer, veateade, võistlus, tulemus,
   edetabel, seaded, heli, muusika, klass) tuleb failist core/moodul.js.
   Uue mooduli tegemine: vt _mall/LOEMIND.md ja _mall/KONTROLL-LEHT.md. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  const NBSP = " ";
  const tehe = q => q.a + NBSP + "+" + NBSP + q.b;   // tehe ei murdu rea lõpus pooleks

  HMoodul.registreeri({
    id: "naidis",
    nimi: "Näidis",
    kus: "Näidises",
    kirjeldus: "Liida kaks arvu kokku.",
    asjad: { yks: "tehe", mitu: "tehet", mitmus: "tehted" },
    maskott: KTapike,
    maskotiNimi: "Täpike",
    muusika: null,
    ringiPikkus: 10,
    voistlus: {
      n: 15, sek: 10,
      kirjeldus: "15 liitmistehet, iga tehte jaoks 10 sekundit. Võistlus on kõigil ühesugune, et tulemusi saaks võrrelda."
    },
    kiibid: [{
      id: "tase", silt: "Kui suured arvud?", vaikimisi: 1,
      markus: "Igal tasemel on ka eelmiste tasemete ülesandeid.",
      valikud: NSisu.TASEMED.filter(Boolean).map(t => ({ id: t.nr, nimi: t.nimi }))
    }],
    /* Võistlus on alati samal tasemel, et tulemusi saaks võrrelda. */
    pakk: (valik, mode) => NSisu.pakk(mode === "test" ? 2 : valik.tase),
    selgus: "Selge on tehe, mille oled kaks korda järjest õigesti lahendanud.",
    alamTekst: "Liitmine läheb iga ringiga kergemaks.",
    harjutaNeid: "Harjuta neid tehteid",
    veaRida: q => {
      const s = document.createElement("span");
      s.className = "vaeg";
      s.innerHTML = "<b>" + esc(tehe(q)) + "</b><small>" + q.vastus + "</small>";
      return s;
    },
    kaart: {
      silt: "Sinu tehted",
      markus: "Ruut läheb roheliseks, kui oled tehte kaks korda järjest õigesti lahendanud.",
      joonista(host, D) {
        const ids = Object.keys(D.stats).slice(-20);
        host.className = "mkaart";
        host.innerHTML = ids.length ? "" : '<p class="hint-small">Siia ilmuvad tehted, mida oled harjutanud.</p>';
        if (!ids.length) { host.className = ""; return; }
        ids.forEach(id => {
          const s = D.stats[id], d = document.createElement("div");
          d.className = HEngine.mastered(s) ? "g" : "y";
          d.textContent = id.replace("+", " + ");
          host.appendChild(d);
        });
      }
    },
    abi:
      "<p>Mäng näitab tehet ja neli vastust. Vali õige. Vastuse saab valida ka numbriklahvidega 1–4.</p>" +
      "<p>Kui vastad valesti, näitab mäng õiget vastust ja annab väikese nipi. Vajuta „Edasi“, kui oled lugenud.</p>" +
      "<p>Mängu ajal on ülesande all nupp <b>„Anna veast teada“</b>. Kui mõni ülesanne tundub imelik, vajuta seda.</p>",

    /* ---------- mooduli osa mängust (core/mang.js konksud) ---------- */
    joonista(q, vasta) {
      $("askText").textContent = tehe(q) + " = ?";
      const opts = $("opts");
      opts.innerHTML = "";
      q.valikud.forEach(v => {
        const b = document.createElement("button");
        b.className = "opt";
        b.textContent = v;
        b.dataset.k = String(v);
        b.onclick = () => vasta(v);
        opts.appendChild(b);
      });
    },
    kontrolli: (q, v) => NSisu.kontrolli(q, v),
    oige: q => String(q.vastus),
    vihje: (q, v, aegOtsas) =>
      KTapike("kind", { head: true }) + '<div class="hinttext"><p>' + esc(NSisu.vihje(q)) + "</p></div>",
    /* Sama tehe on sama ülesanne, ka kui valikud on teises järjekorras. */
    sama: (a, b) => a.id === b.id,
    naitaVastus(rec) {
      [...$("opts").children].forEach(b => {
        b.disabled = true;
        b.classList.remove("right", "wrong");
        if (Number(b.dataset.k) === rec.q.vastus) b.classList.add("right");
        else if (!rec.aegOtsas && b.dataset.k === String(rec.vastus)) b.classList.add("wrong");
      });
    },
    lukusta() { [...$("opts").children].forEach(b => { b.disabled = true; }); },
    valikud: () => [...$("opts").children],
    veateade: q => ({
      item: q.id,
      lause: tehe(q) + " = ?",
      detail: tehe(q) + " — õige: " + q.vastus + " — valikud " + q.valikud.join(", ")
    })
  });
})();
