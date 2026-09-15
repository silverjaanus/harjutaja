/* MALL: sisu test node'iga — käivita: node _mall/sisu.test.js
   Iga moodul kontrollib siin kõiki ülesandeid, mida ta suudab luua
   (vt teisendaja/yhik.test.js, kell/aeg.test.js). */
const S = require('./sisu.js');
let vigu = 0, n = 0;
const viga = (m) => { vigu++; console.log('VIGA', m); };
for (let tase = 1; tase <= 3; tase++) {
  for (let k = 0; k < 20; k++) {
    for (const q of S.pakk(tase)) {
      n++;
      if (q.a + q.b > S.TASEMED[tase].max) viga('liiga suur ' + q.id);
      if (!S.kontrolli(q, q.vastus)) viga('õige vastus ei läbi ' + q.id);
      if (S.kontrolli(q, q.vastus + 1)) viga('vale vastus läbib ' + q.id);
      if (q.valikud.length !== 4 || new Set(q.valikud).size !== 4) viga('valikud ' + q.id + ' ' + q.valikud);
      if (!q.valikud.includes(q.vastus)) viga('õige puudub valikutest ' + q.id);
      if (q.valikud.some(x => x < 0)) viga('negatiivne valik ' + q.id);
    }
  }
}
console.log(vigu ? 'KATKI: ' + vigu : 'KOIK LABI - ' + n + ' ülesannet');
process.exit(vigu ? 1 : 0);
