/* Harjutaja ühine saatmisjärjekord (raamistiku etapp 2, 15. sept 2026).

   Tulemused ja veateated lähevad serverisse siit, mitte igast moodulist
   eraldi. Vanad teostused kaotasid andmeid kolmel moel (Codexi ülevaatus
   B27–B29):
   - kaks saatmist võisid korraga käia ja kumbki võttis järjekorrast kirje;
   - kirje kustus iga vastuse peale, ka siis, kui server ütles „viga";
   - klassi vahetades läks eelmise konto tulemus uue konto nimele.

   Reeglid siin:
   - Korraga käib üks saatmine. Uus kutse saab sama lubaduse.
   - Kirje kustub, kui server selle vastu võttis (ok), ütles, et tänane
     võistlus on juba kirjas (done_today), või et kirje on vigane (input) —
     viimast ei võta server kunagi vastu. Võrguviga jätab kirje alles.
   - Iga kirje kannab selle mängija id-d, kes ringi mängis. Teise konto
     kirjet ei saadeta; see ootab, kuni sama konto on jälle aktiivne.
   - Harjutusring läheb ka kirja (mode "train"): nii jõuab selgeks saanud
     asjade arv edetabelisse ka ilma võistlemata. Nädalapunkte see ei anna,
     neid loeb server ainult võistlustest.
   - Veateade on „saadetud" ainult siis, kui server vastas ok.

   Kasutus:
     const S = HSaatmine.loo({
       D, save, moodul: "teisendaja", op: "yhik", liik: "ulesanne",
       lisa: () => ({ greens: 12, state: {...} }),   // igale kirjele; state ainult viimasele
       tehtud: () => V.margi(),                       // server: täna on võisteldud
       auth: () => renderKlass()                      // konto ei kehti enam
     });
     S.lisa({ mode: "test", n, ok, score, avg, op }); S.saada();   // op: kui ring on teisest rühmast
     S.teata({ item, detail, why }); S.saadaTeated();
*/
(function () {
  'use strict';

  var MAX_KIRJEID = 60;
  var KUSTUTA = { done_today: 1, input: 1 };

  function loo(o) {
    var D = o.D, save = o.save || function () {};
    D.outbox = D.outbox || [];
    D.reports = D.reports || [];
    var kaib = null, teatedKaib = null;

    function konto() { return (window.HKlass && HKlass.current()) || null; }
    function voib() { return !!(window.HKlass && HKlass.online() && konto()); }

    function lisa(k) {
      var c = konto();
      D.outbox.push({
        module: o.moodul, op: k.op || o.op, mode: k.mode, n: k.n, ok: k.ok,
        score: k.score != null ? k.score : k.ok, avg: k.avg || 0,
        pid: c ? c.player_id : null, t: Date.now()
      });
      /* Klassita laps ei saa midagi saata; järjekord ei tohi lõputult kasvada. */
      while (D.outbox.length > MAX_KIRJEID) D.outbox.shift();
      save();
    }

    /* Kirjed, mida praegune konto tohib saata. Ilma id-ta kirjed (vanast
       koodist või enne klassiga liitumist) loetakse praeguse konto omaks. */
    function saadetavad(c) {
      return D.outbox.filter(function (e) { return !e.pid || e.pid === c.player_id; });
    }

    function yks(c) {
      var jarg = saadetavad(c);
      if (!jarg.length) return Promise.resolve();
      var e = jarg[0];
      /* Vanadel Korrutaja kirjetel mooduli nime ei ole. */
      var p = { module: e.module || o.moodul, mode: e.mode, op: e.op || o.op, n: e.n, ok: e.ok, score: e.score, avg: e.avg };
      if (o.lisa) {
        /* Selgete arv käib iga kirjega kaasa (muidu paneks vahepealne kirje
           serveris selged nulli); kogu seis ainult viimasega. */
        var x = o.lisa() || {};
        p.greens = x.greens; p.greens_mul = x.greens_mul; p.greens_div = x.greens_div; p.best_test = x.best_test;
        if (jarg.length === 1) p.state = x.state;
      }
      return HKlass.report(p).then(function (r) {
        r = r || {};
        if (r.error === 'auth') {
          /* Konto ei kehti: selle konto kirjeid ei saa enam keegi saata. */
          D.outbox = D.outbox.filter(function (x) { return x.pid && x.pid !== c.player_id; });
          HKlass.clear(); save();
          if (o.auth) o.auth();
          return 'stopp';
        }
        if (r.ok || KUSTUTA[r.error]) {
          var i = D.outbox.indexOf(e);
          if (i >= 0) D.outbox.splice(i, 1);
          save();
          if (e.mode === 'test' && (r.error === 'done_today' || r.competed_today) && o.tehtud) o.tehtud();
          return yks(c);
        }
        return 'stopp';   /* tundmatu vastus: proovime hiljem uuesti */
      });
    }

    function saada() {
      if (kaib) return kaib;
      if (!voib() || !D.outbox.length) return Promise.resolve();
      var c = konto();
      kaib = yks(c).catch(function () {}).then(function () { kaib = null; });
      return kaib;
    }

    function teata(t) {
      var olemas = null;
      D.reports.forEach(function (r) { if (r.item === t.item) olemas = r; });
      if (olemas) { olemas.why = t.why; olemas.detail = t.detail; olemas.sent = false; }
      else D.reports.push({ item: t.item, detail: t.detail, why: t.why, sona: t.sona || null, sent: false, t: Date.now() });
      save();
      return saadaTeated();
    }

    function saadaTeated() {
      if (teatedKaib) return teatedKaib;
      if (!window.HKlass || !HKlass.online() || !HKlass.issue) return Promise.resolve();
      var jarg = D.reports.filter(function (r) { return !r.sent; });
      if (!jarg.length) return Promise.resolve();
      teatedKaib = Promise.all(jarg.map(function (r) {
        var detail = typeof r.detail === 'string' ? r.detail : JSON.stringify(r.detail);
        /* Märge läheb serverisse loetava lausena („Mäng näitab valet vastust"). */
        var note = (o.miks && o.miks[r.why]) || r.why || null;
        return HKlass.issue({ module: o.moodul, kind: o.liik || 'ulesanne', item: r.item, detail: detail, note: note, version: o.versioon || null })
          .then(function (res) {
            /* input = märget ei võta server kunagi vastu; ära proovi igavesti. */
            if (res && (res.ok || res.error === 'input')) r.sent = true;
          })
          .catch(function () {});
      })).then(function () { save(); teatedKaib = null; });
      return teatedKaib;
    }

    return { lisa: lisa, saada: saada, teata: teata, saadaTeated: saadaTeated };
  }

  window.HSaatmine = { loo: loo };
})();
