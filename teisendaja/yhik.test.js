/* Teisendaja loogika test. Jookseb ilma brauserita: node teisendaja/yhik.test.js
   Valvab kolme asja: teisendus on matemaatiliselt oige, iga tase jaab oma
   oppekava piiridesse ja diagnoos tunneb ara levinud vead. */
var Y = require('./yhik.js');

var kontrolle = 0, vead = [];
function ok(tingimus, silt) {
  kontrolle++;
  if (!tingimus) vead.push(silt);
}
function vordne(saadud, oodatud, silt) {
  kontrolle++;
  if (saadud !== oodatud) vead.push(silt + ' -> sain ' + JSON.stringify(saadud) +
    ', ootasin ' + JSON.stringify(oodatud));
}

/* Kindla seemnega juhus, et vigane jooks oleks korratav. */
function seeme(n) {
  var s = n >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
var R = seeme(20260914);

/* 1. Teisendused ------------------------------------------------------------ */
var TABEL = [
  [1, 'km', 'm', 1000], [1, 'm', 'cm', 100], [1, 'm', 'mm', 1000], [1, 'cm', 'mm', 10],
  [1, 'dm', 'cm', 10], [2500, 'm', 'km', 2.5], [1, 'kg', 'g', 1000], [1, 't', 'kg', 1000],
  [1, 't', 'g', 1000000], [1, 'l', 'ml', 1000], [1, 'l', 'dl', 10], [1, 'dl', 'ml', 100],
  [1, 'h', 'min', 60], [1, 'h', 's', 3600], [1, 'ööpäev', 'min', 1440], [1, 'nädal', 'h', 168],
  [1, 'aasta', 'kuu', 12], [1, 'sajand', 'aasta', 100], [1, '€', 'senti', 100],
  [1, 'm²', 'cm²', 10000], [1, 'ha', 'm²', 10000], [1, 'km²', 'ha', 100], [1, 'a', 'm²', 100],
  [1, 'dm³', 'cm³', 1000], [1, 'm³', 'dm³', 1000], [1, 'cm³', 'mm³', 1000]
];
for (var i = 0; i < TABEL.length; i++) {
  var t = TABEL[i];
  vordne(Y.teisenda(t[0], t[1], t[2]), t[3], t[0] + ' ' + t[1] + ' -> ' + t[2]);
}

/* Eri ahelate vahel ei teisendata: nadal ja kuu ei ole seotud, mass ja pikkus ammugi. */
vordne(Y.tegur('nädal', 'kuu'), null, 'nädal ja kuu ei ole samas ahelas');
vordne(Y.tegur('m', 'kg'), null, 'meeter ja kilogramm ei ole samas ahelas');
vordne(Y.tegur('m', 'm'), null, 'sama ühik ei ole teisendus');

/* 2. Kirjapilt ja sisestus -------------------------------------------------- */
vordne(Y.vorm(1000), '1000', 'neljakohaline jääb kokku');
vordne(Y.vorm(10000), '10 000', 'viiekohaline saab sitkuva tühiku');
vordne(Y.vorm(1000000), '1 000 000', 'miljon rühmitatakse');
vordne(Y.vorm(2.5), '2,5', 'kümnendkoht on koma');
vordne(Y.vorm(0.75), '0,75', 'null enne koma jääb alles');
ok(Y.vormU(3, 'km').indexOf(' ') > 0, 'arvu ja tähise vahel on sitkuv tühik');

vordne(Y.loeArv('2,5'), 2.5, 'koma loetakse');
vordne(Y.loeArv('2.5'), 2.5, 'punkt loetakse samuti');
vordne(Y.loeArv('10 000'), 10000, 'tühik tuhandelistes on lubatud');
vordne(Y.loeArv('10 000'), 10000, 'sitkuv tühik on lubatud');
vordne(Y.loeArv('007'), 7, 'juhtivad nullid on lubatud');
vordne(Y.loeArv(''), null, 'tühi väli ei ole vastus');
vordne(Y.loeArv('kolm'), null, 'sõna ei ole vastus');
vordne(Y.loeArv('3km'), null, 'ühikut laps ei kirjuta');

/* 3. Tasemed jäävad õppekava piiridesse ------------------------------------- */
function lubatudPaar(tase, a, b) {
  var list = Y.TASEMED[tase].paarid;
  for (var i = 0; i < list.length; i++) {
    if ((list[i][0] === a && list[i][1] === b) || (list[i][0] === b && list[i][1] === a)) return true;
  }
  return false;
}

var loendur = { teisenda: 0, koma: 0, nimega: 0, ylekanne: 0, vordle: 0, yhik: 0 };
for (var tase = 1; tase <= 4; tase++) {
  for (var n = 0; n < 800; n++) {
    var q = Y.genereeri(tase, 'koik', R);
    ok(!!q && !!q.kysimus, 'tase ' + tase + ': ülesanne tekib');
    if (!q) continue;
    loendur[q.tyyp] = (loendur[q.tyyp] || 0) + 1;

    if (tase <= 3) {
      ok(q.suurus !== 'pindala' && q.suurus !== 'ruumala',
        'tase ' + tase + ': pindala ja ruumala tulevad alles 4. tasemel (' + q.kysimus + ')');
    }
    if (tase <= 2) {
      ok(q.tyyp !== 'koma', 'tase ' + tase + ': komaga ülesannet ei ole');
      ok(!/\d,\d/.test(q.kysimus),
        'tase ' + tase + ': küsimuses ei ole kümnendkoma (' + q.kysimus + ')');
      var arvud = [].concat(q.vastus), terved = true;
      for (var w = 0; w < arvud.length; w++) {
        if (typeof arvud[w] === 'number' && Math.abs(arvud[w] - Math.round(arvud[w])) > 1e-9) terved = false;
      }
      ok(terved, 'tase ' + tase + ': vastus on täisarv (' + q.kysimus + ')');
    }
    if (tase === 1) {
      ok(q.tyyp !== 'nimega' && q.tyyp !== 'ylekanne',
        'tase 1: nimega arve ja ülekannet veel ei ole');
    }
    if (q.tyyp === 'teisenda' || q.tyyp === 'koma') {
      ok(lubatudPaar(tase, q.mille, q.mida),
        'tase ' + tase + ': paar ' + q.mille + '/' + q.mida + ' on nimekirjas');
    }
    if (q.tyyp === 'koma') {
      ok(q.suurus !== 'aeg', 'kümnendmurd ei käi ajaühikutega (' + q.kysimus + ')');
    }
  }
}
ok(true, 'tasemete jooks (3200 ülesannet) läbitud');

/* 4. Genereeritud vastus on matemaatiliselt õige ---------------------------- */
var halvad = 0, tyhjadVihjed = 0, idVead = 0, punktVead = 0;
for (var tase2 = 1; tase2 <= 4; tase2++) {
  for (var m = 0; m < 500; m++) {
    var g = Y.genereeri(tase2, 'koik', R);
    if (!g) { halvad++; continue; }
    var oige = g.valjad === 0 ? g.vastus : g.vastus;
    var K = Y.kontrolli(g, g.valjad === 2 ? g.vastus : [g.vastus]);
    if (!K.oige) halvad++;
    if (g.tyyp === 'teisenda' || g.tyyp === 'koma') {
      if (Y.teisenda(g.arv, g.mille, g.mida) !== g.vastus) halvad++;
    }
    if (g.tyyp === 'nimega' && g.valjad === 2) {
      var tg = Y.tegur(g.sildid[0], g.sildid[1]).tegur;
      if (g.vastus[0] * tg + g.vastus[1] !== g.arv) halvad++;
    }
    if (g.tyyp === 'ylekanne') {
      if (g.vastus[0] * 60 + g.vastus[1] !== g.arv) halvad++;
    }
    var v = Y.vihje(g);
    if (!v || v.indexOf('undefined') >= 0 || v.indexOf('NaN') >= 0) tyhjadVihjed++;
    if (g.id !== g.lemma || /\d/.test(g.id)) idVead++;
    if (/\d\.\d/.test(g.kysimus) || g.kysimus.indexOf('sek') >= 0) punktVead++;
  }
}
vordne(halvad, 0, 'kõik genereeritud vastused on õiged');
vordne(tyhjadVihjed, 0, 'iga ülesanne saab terve vihje');
vordne(idVead, 0, 'id ja lemma on sama oskus ilma arvuta (HEngine kirjutab statistika id järgi)');
vordne(punktVead, 0, 'küsimuses ei ole punktiga kümnendkohta ega vormi "sek"');

/* 5. Kategooria valik ------------------------------------------------------- */
var valed = 0;
for (var c = 0; c < 200; c++) {
  var qm = Y.genereeri(2, 'mass', R);
  if (qm.suurus !== 'mass') valed++;
}
vordne(valed, 0, 'kategooria „mass" annab ainult massiülesandeid');

/* 6. Diagnoos tunneb ära levinud vead --------------------------------------- */
var kmM = {
  tyyp: 'teisenda', tase: 2, suurus: 'pikkus', id: 'km>m', lemma: 'km>m',
  kysimus: '3 km = ___ m', arv: 3, mille: 'km', mida: 'm',
  valjad: 1, sildid: ['m'], vastus: 3000
};
vordne(Y.diagnoosi(kmM, ['3000']).liik, 'oige', '3000 on õige');
vordne(Y.diagnoosi(kmM, ['3']).liik, 'sama', 'arv jäi samaks');
vordne(Y.diagnoosi(kmM, ['0,003']).liik, 'suund', 'vale suund: jagas, mitte ei korrutanud');
vordne(Y.diagnoosi(kmM, ['300']).liik, 'nullid', 'nullide arv läks paigast');
vordne(Y.diagnoosi(kmM, ['']).liik, 'tyhi', 'tühi väli');
ok(Y.diagnoosi(kmM, ['300']).lause.length > 0, 'vale vastus saab lause');

var nimegaQ = {
  tyyp: 'nimega', tase: 2, suurus: 'pikkus', id: 'km+m', lemma: 'km+m',
  kysimus: '2 km 50 m = ___ m', arv: 2050, mille: 'km', mida: 'm', osa: 50,
  valjad: 1, sildid: ['m'], vastus: 2050, tykid: [2, 50]
};
vordne(Y.diagnoosi(nimegaQ, ['250']).liik, 'koht', 'numbrid kleebiti kõrvuti, null kadus');
vordne(Y.diagnoosi(nimegaQ, ['2050']).liik, 'oige', 'nimega arv kokku');

var ylekanneQ = {
  tyyp: 'ylekanne', tase: 3, suurus: 'aeg', id: 'h+min!', lemma: 'h+min!',
  kysimus: '3 h 65 min = ___ h ___ min', mille: 'h', mida: 'min', arv: 245,
  valjad: 2, sildid: ['h', 'min'], vastus: [4, 5]
};
vordne(Y.diagnoosi(ylekanneQ, ['3', '65']).liik, 'ulekanne', '60 minutit jäi üle kandmata');
vordne(Y.diagnoosi(ylekanneQ, ['4', '5']).liik, 'oige', 'ülekanne tehtud');

/* 7. Redel joonistamiseks --------------------------------------------------- */
var r = Y.redel('pikkus');
vordne(r.length, 1, 'pikkusel on üks ahel');
vordne(r[0].length, 5, 'pikkuse redelil on viis pulka');
vordne(r[0][0].nimi, 'millimeeter', 'redel teab ka ühiku nime');
vordne(Y.redel('aeg').length, 2, 'ajal on kaks ahelat: s..nädal ja kuu..sajand');

/* 8. Sõnaga ühikud käänduvad arvu järel ------------------------------------- */
function ilmaSitketa(s) { return s.replace(/ /g, ' '); }
vordne(ilmaSitketa(Y.vormU(1, 'sajand')), '1 sajand', 'üks sajand on ainsuses');
vordne(ilmaSitketa(Y.vormU(5, 'sajand')), '5 sajandit', 'viis sajandit on osastavas');
vordne(ilmaSitketa(Y.vormU(43, 'kuu')), '43 kuud', 'nelikümmend kolm kuud');
vordne(ilmaSitketa(Y.vormU(2, 'ööpäev')), '2 ööpäeva', 'kaks ööpäeva');
vordne(ilmaSitketa(Y.vormU(1, 'senti')), '1 sent', 'üks sent');
vordne(ilmaSitketa(Y.vormU(400, 'senti')), '400 senti', 'nelisada senti');
vordne(ilmaSitketa(Y.vormU(5, 'km')), '5 km', 'tähis ei käändu kunagi');
vordne(Y.silt('aasta'), 'aastat', 'tühja välja silt on osastavas');
vordne(Y.silt('m'), 'm', 'tähis jääb tähiseks ka sildil');

/* Sama kontroll koigi genereeritud lausete peal: sonaga uhik nominatiivis
   arvu jarel (nt "5 sajand") on viga. */
function kaandeViga(tekst) {
  var re = /(\d+)[\s ](ööpäev|nädal|kuu|aasta|sajand|sent)\b/g, m;
  while ((m = re.exec(tekst))) { if (m[1] !== '1') return m[0]; }
  return null;
}
var kaandeVead = 0, naide = '';
var R3 = seeme(4242);
for (var kk = 1; kk <= 4; kk++) {
  for (var mm2 = 0; mm2 < 500; mm2++) {
    var qk = Y.genereeri(kk, 'koik', R3);
    var viga = kaandeViga(qk.kysimus) || kaandeViga(Y.vihje(qk));
    if (viga) { kaandeVead++; if (!naide) naide = viga + '  <- ' + qk.kysimus; }
  }
}
vordne(kaandeVead, 0, 'sõnaga ühik käändub igas lauses (' + naide + ')');

/* 9. Koolis mitteesinevad paarid on välja jäetud (Fable'i ülevaatus 14. sept) --- */
var KEELATUD = [['km', 'cm'], ['km', 'dm'], ['km', 'mm'], ['nädal', 'h'],
                ['nädal', 'min'], ['ööpäev', 'min'], ['ööpäev', 's'],
                ['km²', 'a'], ['km²', 'm²'], ['m³', 'cm³'], ['dm³', 'mm³']];
for (var kt = 3; kt <= 4; kt++) {
  for (var kx = 0; kx < KEELATUD.length; kx++) {
    ok(!lubatudPaar(kt, KEELATUD[kx][0], KEELATUD[kx][1]),
      'tase ' + kt + ': paar ' + KEELATUD[kx].join('/') + ' on välja jäetud');
  }
}
ok(lubatudPaar(3, 'h', 's'), 'tase 3: h ja s on ainus lubatud ajahüpe');
ok(lubatudPaar(4, 'm²', 'cm²'), 'tase 4: m² ja cm² on olemas (1 m² = 10 000 cm²)');
ok(lubatudPaar(4, 'ha', 'm²'), 'tase 4: ha ja m² on olemas');

/* Kokkuvõte ---------------------------------------------------------------- */
if (vead.length) {
  console.log('KATKI - ' + vead.length + ' viga ' + kontrolle + ' kontrollist:');
  for (var e = 0; e < Math.min(vead.length, 25); e++) console.log('  - ' + vead[e]);
  process.exit(1);
}
console.log('KOIK LABI - ' + kontrolle + ' kontrolli, tyybid: ' + JSON.stringify(loendur));
