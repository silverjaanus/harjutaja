/* MALL: mooduli sisu. Siin on AINULT see, mis on selle mooduli oma:
   ülesannete loomine, vastuse kontroll ja vihje. Ei mingit DOM-i ega
   salvestust — nii saab sisu testida node'iga (vt sisu.test.js).

   Näidis: liitmine. Iga ülesanne on objekt, millel on
     id     — statistika võti (sama ülesanne = sama id)
     lemma  — oskus, mida ülesanne harjutab (sama lemma ei tule kaks korda järjest)
   ja kõik muu, mida mooduli joonistus vajab. */
(function () {
  var TASEMED = [
    null,
    { nr: 1, nimi: 'Kuni 10', max: 10 },
    { nr: 2, nimi: 'Kuni 20', max: 20 },
    { nr: 3, nimi: 'Kuni 100', max: 100 }
  ];

  function segi(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function ylesanne(a, b) {
    var v = a + b;
    var valed = {};
    [v - 1, v + 1, v + 10, v - 10, v + 2].forEach(function (x) { if (x >= 0 && x !== v) valed[x] = 1; });
    var valikud = segi(Object.keys(valed).map(Number)).slice(0, 3).concat([v]);
    return { id: a + '+' + b, lemma: a + '+' + b, a: a, b: b, vastus: v, valikud: segi(valikud) };
  }

  /* Tasemed kuhjuvad: kõrgemal tasemel on ka madalamate ülesandeid. */
  function pakk(tase) {
    var max = (TASEMED[tase] || TASEMED[1]).max;
    var out = [];
    for (var a = 1; a < max; a++) for (var b = 1; a + b <= max; b++) out.push([a, b]);
    return segi(out).slice(0, 40).map(function (p) { return ylesanne(p[0], p[1]); });
  }

  function kontrolli(q, v) { return Number(v) === q.vastus; }

  function vihje(q) {
    var s = Math.max(q.a, q.b), v = Math.min(q.a, q.b);
    return 'Alusta suuremast arvust ' + s + ' ja loe ' + v + ' sammu edasi.';
  }

  var NSisu = { TASEMED: TASEMED, pakk: pakk, kontrolli: kontrolli, vihje: vihje, ylesanne: ylesanne };
  if (typeof module !== 'undefined') module.exports = NSisu;
  if (typeof window !== 'undefined') window.NSisu = NSisu;
})();
