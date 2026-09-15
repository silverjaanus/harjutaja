/* node keel/lause.test.js */
'use strict';
global.window = {};
require('./tunnid.js');
const L = require('./lause.js');
const READ = window.KEEL_TUNNID[0].read;
let vigu = 0, n = 0;
function ok(c, m) { n++; if (!c) { vigu++; console.log('VIGA:', m); } }

// 1. võrdlus
ok(L.kontrolli('The museum is next to the park.', 'the museum is next to the park'), 'väiketähed ja punkt ei loe');
ok(L.kontrolli('Is that the museum?', '  Is  that the museum ? '), 'tühikud ei loe');
ok(!L.kontrolli('Is that the museum?', 'Is this the museum?'), 'this ei ole that');
ok(!L.kontrolli('to point to a big building', 'to point to a big bulding'), 'õigekiri loeb (Mia vihiku viga)');
ok(!L.kontrolli('to see food in the window', 'sees food in the window'), 'algvorm loeb');
ok(!L.kontrolli('x', ''), 'tühi ei ole õige');
ok(L.kontrolli("There's a map.", 'There’s a map'), 'ülakoma kuju ei loe');
ok(!L.kontrolli('The museum is next to the park.', 'The museum is next to the park.!!x'), 'lõpus lisa ei ole õige');

// 2. erinevus
let d = L.vordle('to point to a big building', 'to point to a big bulding');
ok(d.filter(x => !x.ok).map(x => x.sona).join() === 'building', 'vale sõna märgitakse: ' + JSON.stringify(d));
d = L.vordle('The museum is next to the park.', 'the museum is to the park');
ok(d.filter(x => !x.ok).map(x => x.sona).join() === 'next', 'puuduv sõna märgitakse');
d = L.vordle('The museum is next to the park.', 'The museum is next to the park');
ok(d.every(x => x.ok), 'õige rida: kõik õiged (ka punktiga viimane sõna)');
d = L.vordle('An old woman opens the door.', '');
ok(d.every(x => !x.ok), 'tühi vastus: kõik valed');

// 3. lünk
for (const r of READ) {
  const l = L.lunk(r, READ);
  ok(l.valikud.length === 3, r.id + ' kolm valikut');
  ok(l.valikud.includes(l.oige), r.id + ' õige on valikutes');
  ok(new Set(l.valikud.map(x => x.toLowerCase())).size === 3, r.id + ' valikud erinevad');
  ok(l.sonad[l.koht].replace(/[.?!]$/, '') === l.oige, r.id + ' lünk on reas: ' + l.oige);
  const suur = /^[A-Z]/.test(l.oige);
  ok(l.valikud.every(v => /^[A-Z]/.test(v) === suur), r.id + ' suurtäht ei anna vastust ette');
}

// 4. kaardid
for (const r of READ) {
  const k = L.kaardid(r.en);
  ok(k.map(x => x.s).slice().sort().join(' ') === L.sonad(r.en).slice().sort().join(' '), r.id + ' kaardid = sõnad');
  ok(k.some((x, i) => x.i !== i), r.id + ' kaardid pole õiges järjekorras');
}

// 5. sammud
let S = {};
const r1 = READ[0];
ok(L.samm(S, r1.id) === 0, 'uus rida algab tutvumisest');
const q = s => ({ rida: r1, samm: s });
L.salvesta(S, q('tutvu'), true, 'A');
ok(L.samm(S, r1.id) === 1, 'tutvu läbi → lünk');
L.salvesta(S, q('lunk'), false, 'A');
ok(L.samm(S, r1.id) === 1, 'vale lünk jääb');
L.salvesta(S, q('lunk'), true, 'A'); L.salvesta(S, q('kokku'), true, 'A'); L.salvesta(S, q('kuula'), true, 'A');
ok(L.samm(S, r1.id) === 4, 'jõudis tõlkimiseni');
L.salvesta(S, q('tolgi'), true, 'A'); L.salvesta(S, q('tolgi'), true, 'A');
ok(!L.selge(S, r1.id), 'kaks õiget SAMAS ringis ei tee selgeks');
L.salvesta(S, q('tolgi'), true, 'B', true);
ok(!L.selge(S, r1.id), 'kuulamisabiga õige ei loe');
L.salvesta(S, q('tolgi'), true, 'B');
ok(L.selge(S, r1.id), 'kaks eri ringi → selge');
L.salvesta(S, q('tolgi'), false, 'C');
ok(!L.selge(S, r1.id) && L.samm(S, r1.id) === 4, 'unustatud rida tuleb tagasi tõlkimisse, varasemad sammud jäävad läbituks');

// 6. ring
S = {};
let R = new L.Ring(READ, S, { ringId: 'r1' });
ok(R.valitud.length === 5, 'ringis 5 rida');
ok(R.length === 15, 'uuel ringil 5 × 3 sammu: ' + R.length);
let esimesed = [];
for (let i = 0; i < 5; i++) esimesed.push(R.next().item);
ok(esimesed.every(x => x.samm === 'tutvu'), 'esmalt iga rea esimene samm');
ok(new Set(esimesed.map(x => x.lemma)).size === 5, 'viis eri rida');
// vale vastus tuleb tagasi ja loendur kasvab
let x = R.next().item; R.record(x, false);
let pikk = R.length, nahtud = false, kokku = 6;
for (let it; (it = R.next()); ) { kokku++; if (it.item.id === x.id && it.repeat) nahtud = true; R.record(it.item, true); }
ok(nahtud, 'vale samm tuli samas ringis tagasi');
ok(kokku === R.length, 'küsitud = pikkus lõpus (' + kokku + ' / ' + R.length + ')');
ok(R.length === pikk + 1, 'kordus lisas loendurile ühe');
// kõik selgeks → ring on kordamine
S = {};
for (const r of READ) for (const s of L.SAMMUD) {
  if (s === 'tolgi') { L.salvesta(S, { rida: r, samm: s }, true, 'x'); L.salvesta(S, { rida: r, samm: s }, true, 'y'); }
  else L.salvesta(S, { rida: r, samm: s }, true, 'x');
}
ok(READ.every(r => L.selge(S, r.id)), 'kõik read selged');
R = new L.Ring(READ, S, { ringId: 'z' });
ok(R.length === 5 && R.q.every(i => i.samm === 'tolgi'), 'selgete ridade ring = 5 tõlget');
// fookus
S = {};
R = new L.Ring(READ, S, { ringId: 'f', fookus: ['u4l4-09', 'u4l4-10'] });
ok(R.valitud[0].id === 'u4l4-09' && R.valitud[1].id === 'u4l4-10', 'fookusread tulevad ette');

// 7. eesti vasted: algvormis read on ma-tegevusnimega
for (const r of READ) {
  if (/^to /.test(r.en)) ok(/^\S+ma\b/.test(r.et), r.id + ' algvormi vaste algab ma-tegevusnimega: ' + r.et);
  else ok(/[.?!]$/.test(r.en) && /[.?!]$/.test(r.et), r.id + ' lause lõpeb märgiga mõlemas keeles');
}

console.log(vigu ? vigu + ' viga ' + n + '-st' : 'KÕIK ' + n + ' KONTROLLI LÄBI');
process.exit(vigu ? 1 : 0);
