/* Harjutaja ühine mängu raam (raamistiku etapp 2, 15. sept 2026).

   Moodul otsustab, MIDA küsitakse ja kuidas vastust hinnatakse. See fail
   otsustab, KUIDAS laps mängus liigub — ja seega on see kõigis moodulites
   ühesugune:
   - päis: ✕ · ‹ · riba · „4 / 12" · heli (index.html-is, ID-d allpool);
   - ✕ küsib võistluses kinnitust (core/arm.js), harjutuses mitte;
   - õige vastuse järel läheb mäng ise edasi umbes 1 sekundi pärast,
     vale järel ootab nuppu „Edasi" (võistluses läheb ise edasi);
   - klaviatuur: numbrid 1–4 valivad vastuse, Enter jätkab, Escape ei
     lõpeta kunagi ringi (sulgeb ainult akna või eelmise vaatamise);
   - ‹ näitab eelmisi ülesandeid koos lapse vastusega (ainult harjutuses);
   - „Anna veast teada" aken peatab edasimineku ja käib selle ülesande
     kohta, mis aknas on (võistluses nuppu ei ole);
   - võistluse taimer; kui laps peidab vahelehe, loeb käiv ülesanne tagasi
     tulles vahelejäetuks — peitmisega ei saa lisaaega;
   - peidetud vahelehel ootel edasiminek peatub ja jätkub tagasi tulles.

   Kasutus (vt teisendaja/app.js):
     const M = HMang.loo({
       kus: "Teisendajas", sek: 15,
       ekraanid: ["s-home", "s-game", "s-result", "s-board"],
       moodul: {
         joonista(q, vasta, vaade),  // küsimus ekraanile; vasta(v) annab vastuse; vaade=true eelmise vaatamisel
         tyhi(q, v),                 // tekst, kui vastus on tühi (ülesanne jääb lahti), muidu null
         kontrolli(q, v),            // → true / false
         oige(q),                    // „Õige vastus on …" lause lõpp: "3000 m"
         vihje(q, v, aegOtsas),      // HTML või ""
         naitaVastus(rec),           // vastatud olek mooduli laval (nupud, väljad)
         lukusta(),                  // vastamine kinni
         mustand(), taasta(m),       // pooleli vastus (valikuline)
         fookus(),                   // valikuline
         veateade(q),                // → { item, detail, lause, sona? }
         // valikulised konksud (raamistiku etapp 3):
         valmista(q),                // uus ülesanne enne joonistamist → ülesanne (nt koopia segatud valikutega)
         algus(q),                   // uus ülesanne on ekraanil (Kirjutaja: mängi sõna, käivita taimer)
         vastatud(rec),              // vastus on antud ja joonistatud (Kirjutaja: loe variandid ette)
         valeLause(rec),             // vale vastuse lause; vaikimisi „Õige vastus on …."
         aken(q),                    // veateate aken avaneb (Kirjutaja: peata heli)
         klahv(e, q)                 // mooduli oma klahv; true = võetud
       },
       taimerIse: false,             // true: moodul kutsub M.kaivitaTaimer() ise (Kirjutaja pärast sõna)
       eelmineTekst, sammuTekst(n),  // eelmise vaatamise riba tekst
       salvesta(q, ok),              // statistika (tavaliselt round.record)
       lopp(G),                      // ring läbi → mooduli tulemus
       teata(t)                      // veateade → HSaatmine.teata
     });
     M.alusta(round, "train" | "test", { pikkus }); M.G; M.naita(id); M.koju();
*/
(function () {
  'use strict';

  var KIITUSED = ['Õige!', 'Täpselt!', 'Tubli!', 'Just nii!', 'Väga hea!'];
  /* Ühtne edasiminek (Silveri otsus 15. sept): ~1 s õige järel. */
  var AEG = { ok: 1000, okVoistlus: 800, viga: 1400 };

  function loo(o) {
    var $ = function (id) { return document.getElementById(id); };
    var md = o.moodul;
    var G = null, round = null, cur = null;
    var edasiT = null, taimerT = null, tahtaeg = 0, flagT = null;
    var review = null, ootab = false, mustand = null, flagQ = null;

    /* ---------- ekraanid ---------- */
    function naita(id) {
      (o.ekraanid || []).forEach(function (s) { var e = $(s); if (e) e.hidden = s !== id; });
      $('s-game').classList.toggle('voistlus', !!(G && G.mode === 'test'));
      if (window.HMuusika) HMuusika.mang(id === 's-game' && !!G && G.mode === 'train');
      window.scrollTo(0, 0);
    }

    /* ---------- edasiminek ---------- */
    function peataEdasi() { clearTimeout(edasiT); edasiT = null; }
    function edasi(ms) {
      peataEdasi();
      edasiT = setTimeout(function () { edasiT = null; jargmine(); }, ms);
    }

    /* ---------- taimer (ainult võistluses) ---------- */
    function peataTaimer() { clearInterval(taimerT); taimerT = null; $('timer').hidden = true; }
    function kaivitaTaimer() {
      peataTaimer();
      if (!G || G.mode !== 'test' || !o.sek) return;
      $('timer').hidden = false;
      tahtaeg = performance.now() + o.sek * 1000;
      var fill = $('timerFill');
      var tiks = function () {
        var jaak = tahtaeg - performance.now();
        var osa = Math.max(0, jaak / (o.sek * 1000));
        fill.style.width = (osa * 100).toFixed(1) + '%';
        fill.classList.toggle('low', osa < 0.25);
        if (jaak <= 0) { peataTaimer(); vasta(null); }
      };
      tiks();
      taimerT = setInterval(tiks, 100);
    }

    /* ---------- päis ---------- */
    function kokku() { return round ? round.length + (round.due ? round.due.length : 0) : 0; }
    function joonistaPais() {
      var k = kokku();
      var nr = Math.min(G.n + (cur && !cur.done ? 1 : 0), k);
      $('bar').style.width = (k ? Math.min(100, (G.n / k) * 100) : 0) + '%';
      var l = $('loendur');
      if (l) {
        l.textContent = Math.max(nr, 1) + ' / ' + k;
        /* Ekraanilugeja loeb kaldkriipsu kohmakalt (Fable 15. sept). */
        l.setAttribute('aria-label', 'Ülesanne ' + Math.max(nr, 1) + ', kokku ' + k);
      }
      $('prevBtn').disabled = eelmineIndeks() < 0;
    }

    /* ---------- ring ---------- */
    function alusta(r, mode) {
      if (window.HSfx) HSfx.unlock();
      round = r;
      G = { mode: mode, n: 0, ok: 0, wrong: [], history: [], t0: Date.now() };
      cur = null;
      review = null; ootab = false; mustand = null;
      $('reviewBar').hidden = true;
      $('prevBtn').hidden = mode === 'test' || !!(o.voimed && o.voimed.eelmine === false);
      $('flagBtn').hidden = mode === 'test' || !md.veateade;
      $('flagNote').hidden = true;
      $('quitNote').hidden = true;
      naita('s-game');
      jargmine();
      return G;
    }

    function puhastaLava() {
      $('fb').textContent = ''; $('fb').className = 'feedback';
      $('hint').hidden = true; $('after').hidden = true;
    }

    function jargmine() {
      peataEdasi();
      review = null; ootab = false; mustand = null;
      $('reviewBar').hidden = true;
      suleAken(true);
      puhastaLava();
      var q = round.next();
      if (!q) return lopeta();
      cur = md.valmista ? (md.valmista(q.item, q) || q.item) : q.item;
      cur.done = false;
      md.joonista(cur, vasta, false);
      joonistaPais();
      if (G.mode === 'test' && !o.taimerIse) kaivitaTaimer();
      if (md.algus) md.algus(cur);
    }

    function vasta(v) {
      /* Eelmise vaatamise ajal ei tohi käiv ülesanne vastust saada. */
      if (review !== null) return;
      var q = cur; if (!q || q.done || !G) return;
      var aegOtsas = (v === null || v === undefined);
      if (!aegOtsas && md.tyhi) {
        var t = md.tyhi(q, v);
        if (t) {
          $('fb').textContent = t; $('fb').className = 'feedback';
          if (md.fookus) md.fookus();
          return;
        }
      }
      q.done = true;
      quitArm.disarm();   /* vastamine on teadlik jätkamine */
      peataTaimer();
      if (md.lukusta) md.lukusta();
      var test = G.mode === 'test';
      var ok = aegOtsas ? false : !!md.kontrolli(q, v);
      o.salvesta(q, ok);
      G.n++;
      if (ok) G.ok++;
      else if (!G.wrong.some(function (w) { return md.sama ? md.sama(w, q) : w === q; })) G.wrong.push(q);

      var rec = {
        q: q, ok: ok, aegOtsas: aegOtsas, vastus: aegOtsas ? null : v,
        kiitus: ok ? KIITUSED[Math.floor(Math.random() * KIITUSED.length)] : '',
        vihje: (!ok && !test && md.vihje) ? md.vihje(q, v, aegOtsas) : ''
      };
      G.history.push(rec);
      maali(rec);
      joonistaPais();
      if (md.vastatud) md.vastatud(rec);

      if (ok) { if (window.HSfx) HSfx.ok(); edasi(test ? AEG.okVoistlus : AEG.ok); return; }
      if (window.HSfx) HSfx.bad();
      if (test) { edasi(AEG.viga); return; }
      $('after').hidden = false;
    }

    /* Vastatud ülesande pilt. Sama kehtib vastamise hetkel ja siis, kui laps
       tuleb noolega seda vaatama. */
    function maali(rec) {
      md.naitaVastus(rec);
      if (rec.ok) {
        $('fb').textContent = rec.kiitus;
        $('fb').className = 'feedback ok';
        $('hint').hidden = true;
        return;
      }
      $('fb').textContent = (rec.aegOtsas ? 'Aeg sai otsa. ' : '') +
        (md.valeLause ? md.valeLause(rec) : 'Õige vastus on ' + md.oige(rec.q) + '.');
      $('fb').className = 'feedback bad';
      $('hint').innerHTML = rec.vihje;
      $('hint').hidden = !rec.vihje;
    }

    function lopeta() {
      peataTaimer(); peataEdasi();
      quitArm.disarm();
      suleAken(true);
      review = null; ootab = false; mustand = null;
      $('reviewBar').hidden = true;
      var g = G;
      o.lopp(g);
      return g;
    }

    function koju() {
      peataTaimer(); peataEdasi();
      quitArm.disarm();
      suleAken(true);
      cur = null; G = null;
      review = null; ootab = false; mustand = null;
      $('reviewBar').hidden = true;
      if (o.kodu) o.kodu();
    }

    /* ---------- eelmise vaatamine ---------- */
    function eelmineIndeks() {
      if (!G) return -1;
      if (review !== null) return review - 1;
      return G.history.length - (cur && cur.done ? 2 : 1);
    }
    function vaadatav() { return review === null ? null : G.history[review].q; }

    function avaEelmine() {
      var i = eelmineIndeks();
      if (i < 0 || !G || G.mode === 'test') return;
      if (edasiT) { peataEdasi(); ootab = true; }
      if (review === null && cur && !cur.done && md.mustand) mustand = md.mustand();
      review = i;
      var rec = G.history[i];
      var sammu = G.history.length - i;
      $('reviewWhich').textContent = sammu === 1 ? (o.eelmineTekst || 'Vaatad eelmist ülesannet')
        : (o.sammuTekst ? o.sammuTekst(sammu) : 'Vaatad ülesannet ' + sammu + ' sammu tagasi');
      $('reviewBar').hidden = false;
      $('flagNote').hidden = true;
      puhastaLava();
      md.joonista(rec.q, vasta, true);
      maali(rec);
      $('prevBtn').disabled = eelmineIndeks() < 0;
    }

    function tagasiMangu() {
      if (review === null) return;
      review = null;
      $('reviewBar').hidden = true;
      if (ootab) { ootab = false; mustand = null; jargmine(); return; }
      if (!cur) return;
      puhastaLava();
      md.joonista(cur, vasta, false);
      var rec = G.history[G.history.length - 1];
      if (cur.done && rec && rec.q === cur) {
        maali(rec);
        $('after').hidden = rec.ok || G.mode === 'test';
      } else if (mustand && md.taasta) {
        md.taasta(mustand);
      }
      mustand = null;
      joonistaPais();
    }

    /* ---------- veateade ---------- */
    var viimaneFookus = null;
    function avaAken() {
      if (!G || G.mode === 'test') return;
      var q = vaadatav() || cur;
      var k = q && md.veateade(q); if (!k) return;
      if (edasiT) { peataEdasi(); ootab = true; }
      flagQ = q;
      if (md.aken) md.aken(q);
      var sona = $('flagWord');
      if (sona) { sona.textContent = k.sona || ''; sona.hidden = !k.sona; }
      $('flagSentence').textContent = k.lause || '';
      $('flagSentence').hidden = !k.lause;
      $('flagBox').hidden = false;
      viimaneFookus = document.activeElement;
      var esimene = $('flagOpts').querySelector('button');
      if (esimene) esimene.focus();
    }
    function suleAken(vaikne) {
      if ($('flagBox').hidden) { flagQ = null; return; }
      $('flagBox').hidden = true;
      flagQ = null;
      if (vaikne) return;
      if (viimaneFookus && viimaneFookus.focus) try { viimaneFookus.focus(); } catch (e) {}
      if (ootab && review === null) { ootab = false; jargmine(); }
    }
    function saadaAken(why) {
      var q = flagQ || vaadatav() || cur;
      var k = q && md.veateade(q); if (!k) return;
      suleAken(false);
      if (o.teata) o.teata({ item: k.item, detail: k.detail, why: why, sona: k.sona || null });
      var f = $('flagNote');
      f.textContent = 'Aitäh, et andsid veast teada!';
      f.hidden = false;
      clearTimeout(flagT);
      flagT = setTimeout(function () { f.hidden = true; }, 2600);
    }

    /* ---------- nupud ja klaviatuur ---------- */
    var quitArm = HArm($('quitBtn'), {
      note: $('quitNote'),
      message: HArm.quitMsg(o.kus),
      needsConfirm: function () { return !!(G && G.mode === 'test' && G.n); },
      action: function () { if (G && G.n) lopeta(); else koju(); }
    });

    $('nextBtn').addEventListener('click', function () { jargmine(); });
    $('prevBtn').addEventListener('click', avaEelmine);
    $('reviewBack').addEventListener('click', tagasiMangu);
    $('flagBtn').addEventListener('click', avaAken);
    $('flagCancel').addEventListener('click', function () { suleAken(false); });
    $('flagBox').addEventListener('click', function (e) { if (e.target === $('flagBox')) suleAken(false); });
    $('flagOpts').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-why]'); if (!b) return;
      saadaAken(b.dataset.why);
    });

    document.addEventListener('keydown', function (e) {
      if ($('s-game').hidden || !G || !cur || e.defaultPrevented) return;
      if (!$('flagBox').hidden) {
        if (e.key === 'Escape') { e.preventDefault(); suleAken(false); }
        return;
      }
      /* Mooduli oma klahv (Kirjutajas tühik = kuulamisnupp, ka eelmise vaatamisel). */
      if (md.klahv && md.klahv(e, vaadatav() || cur)) return;
      if (review !== null) {
        if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); tagasiMangu(); }
        return;
      }
      /* Escape ei lõpeta kunagi ringi (Silveri otsus 15. sept). */
      if (e.key === 'Escape') { e.preventDefault(); return; }
      if (e.key === 'Enter' && cur.done && !$('after').hidden) { e.preventDefault(); jargmine(); return; }
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9 && !cur.done && md.valikud) {
        var b = md.valikud()[n - 1];
        if (b) { e.preventDefault(); b.click(); }
      }
    });

    /* Peidetud vahelehel: ootel edasiminek peatub; võistluses loeb käiv
       ülesanne tagasi tulles vahelejäetuks (sama reegel mis Korrutajas). */
    var peidus = { edasi: false, vahele: false };
    document.addEventListener('visibilitychange', function () {
      if (!G || $('s-game').hidden) return;
      if (document.hidden) {
        if (edasiT) { peataEdasi(); peidus.edasi = true; }
        if (G.mode === 'test' && cur && !cur.done && review === null) { peataTaimer(); peidus.vahele = true; }
        return;
      }
      if (peidus.vahele) { peidus.vahele = false; peidus.edasi = false; vasta(null); return; }
      if (peidus.edasi) { peidus.edasi = false; if (review === null && $('flagBox').hidden) jargmine(); else ootab = true; }
    });

    var api = {
      alusta: alusta, naita: naita, koju: koju, lopeta: lopeta,
      kaivitaTaimer: kaivitaTaimer, vasta: vasta,
      get G() { return G; },
      get cur() { return cur; },
      vaadatav: vaadatav,
      get review() { return review !== null; },
      get round() { return round; },
      disarm: function () { quitArm.disarm(); }
    };
    /* Testidele (tools/test_raam.py): käiv mäng on nähtav. */
    window.HMang._aktiivne = api;
    return api;
  }

  window.HMang = { loo: loo, KIITUSED: KIITUSED, AEG: AEG };
})();
