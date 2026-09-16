/* node keel/sonad.test.js */
'use strict';
global.window = {};
require('./teemad.js');
require('./tunnid.js');
const L = require('./lause.js');
const S = require('./sonad.js');
const TEEMAD = window.KEEL_TEEMAD;
let vigu = 0, n = 0;
function ok(c, m) { n++; if (!c) { vigu++; console.log('VIGA:', m); } }

// 1. sisu
const ids = {};
TEEMAD.forEach(t => {
  ok(t.id && t.nimi && t.kus && t.ekraan, 'teemal on id, nimi, kus, ekraan: ' + t.id);
  ok(t.sonad.length >= 6, t.id + ': vähemalt 6 sõna (loe-sammus 6 nuppu)');
  const en = {}, et = {}, ul = {};
  t.sonad.forEach(s => {
    ok(!ids[s.id], 'id on kordumatu: ' + s.id); ids[s.id] = 1;
    ok(/^[a-z]{2}-[a-z]+$/.test(s.id), 'id kuju: ' + s.id);
    ['en', 'et', 'teeb'].forEach(k => ok(typeof s[k] === 'string' && s[k].trim(), s.id + ': väli ' + k));
    ok(/^[A-Za-z][A-Za-z ']*$/.test(s.en), s.id + ': en on ainult tähed, tühikud ja ülakoma');
    ok(!en[S.heliNimi(s.en)], t.id + ': heli nimi kordub ' + s.en); en[S.heliNimi(s.en)] = 1;
    const p = S.etOsad(s.et).pohi.toLowerCase();
    ok(p && !et[p], t.id + ': eesti vaste kordub ' + p); et[p] = 1;
    ok(s.ul === undefined, s.id + ': ülesandelauset ei kasutata (küsimus on eesti tähendus)');
    ok(/[.!?]$/.test(s.teeb), s.id + ': laused lõpevad punktiga');
    ok(s.teeb.indexOf('„' + s.en.replace(/'/g, '’') + '“') === 0, s.id + ': teeb algab sõnaga jutumärkides');
    ok(!/"/.test(s.teeb + (s.markus || '') + s.et), s.id + ': sirgeid jutumärke pole');
    ok(!s.markus || /[.!?]$/.test(s.markus), s.id + ': markus lõpeb punktiga');
  });
});

// 1b. juhiste teema: juhis, tõlge ja väli
require('./ekraanid.js');
const EK = window.KEkraan;
TEEMAD.forEach(t => {
  ok(t.juhised || EK.EKRAANID[t.ekraan], t.id + ': ekraan on olemas');
  if (!t.juhised) {
    const h = EK.EKRAANID[t.ekraan] ? EK.EKRAANID[t.ekraan](t) : '';
    t.sonad.forEach(s => ok(h.indexOf('data-id="' + s.id + '"') >= 0, t.id + ': ekraanil on nupp ' + s.id));
    return;
  }
  t.sonad.forEach(s => {
    ok(/^[A-Z][A-Za-z0-9 :]*!$/.test(s.juhis || ''), s.id + ': juhis on lühike ingliskeelne käsk');
    ok(new RegExp('\\b' + s.en + '\\b', 'i').test(s.juhis), s.id + ': juhises on õpitav sõna');
    ok(/[!.]$/.test(s.juhisEt || ''), s.id + ': juhisel on eesti tõlge');
    ok(Array.isArray(s.stseen) && s.stseen.every(a => EK.ASI[a] || EK.RADA[a]), s.id + ': väljal on ainult tuntud asjad');
    const mitu = s.stseen.filter(a => a === s.siht).length;
    ok(mitu >= (s.mitu || 1), s.id + ': sihti on väljal piisavalt');
    ok(s.stseen.length > mitu, s.id + ': väljal on ka valesid asju');
    ok(!(s.mitu > 1) || mitu > s.mitu, s.id + ': korjamisel on sihti rohkem kui vaja');
  });
});

// 2. abifunktsioonid
ok(JSON.stringify(S.etOsad('telli (kanal)')) === JSON.stringify({ pohi: 'telli', tapsustus: 'kanal' }), 'etOsad sulgudega');
ok(JSON.stringify(S.etOsad('avaleht')) === JSON.stringify({ pohi: 'avaleht', tapsustus: '' }), 'etOsad ilma');
ok(S.heliNimi('Create New') === 'createnew', 'heliNimi');
const yt = TEEMAD[0], sub = yt.sonad.find(s => s.en === 'Subscribe');
ok(S.kontrolli(sub, 'subscribe'), 'väiketähed ei loe');
ok(S.kontrolli(sub, ' Subscribe. '), 'tühik ja punkt ei loe');
ok(!S.kontrolli(sub, 'subscrbe'), 'õigekiri loeb');
ok(!S.kontrolli(sub, 'subscribe channel'), 'lisasõna ei ole õige');
const cn = TEEMAD[1].sonad.find(s => s.en === 'Create New');
ok(S.kontrolli(cn, 'create new'), 'kahesõnaline');
ok(!S.kontrolli(cn, 'create'), 'pool ei ole õige');
for (let k = 0; k < 50; k++) {
  const v = S.valikud(sub, yt);
  ok(v.length === 6, 'loe: 6 nuppu');
  ok(v.filter(x => x.id === sub.id).length === 1, 'loe: õige täpselt korra');
  ok(new Set(v.map(x => x.id)).size === 6, 'loe: nupud erinevad');
}

// 3. ring ja sammud
const st = {};
let r = S.ring(yt, st, { ringId: 'r1' });
ok(r.valitud.length === 5, 'ringis 5 sõna');
ok(r.length === 15, 'ringis 15 ülesannet (5 × 3 sammu)');
const esimene = r.next().item;
ok(esimene.samm === 'vajuta' && esimene.liik === 'sona', 'esimene samm on vajuta, liik sona');
ok(esimene.id === esimene.rida.id + ':vajuta', 'id = sõna:samm');
const koik = [esimene]; let x;
while ((x = r.next())) koik.push(x.item);
ok(koik.slice(0, 5).every(q => q.samm === 'vajuta'), 'esimesed viis on vajuta');
ok(koik.slice(5, 10).every(q => q.samm === 'loe'), 'siis loe');
ok(koik.slice(10, 15).every(q => q.samm === 'kuula'), 'siis kuula');
koik.forEach(q => r.record(q, true, false));
const w0 = yt.sonad.find(s => s.id === koik[0].rida.id);
ok(S.samm(st, w0.id) === 3, 'pärast ringi on järgmine samm tolgi');
ok(!S.selge(st, w0.id), 'ei ole veel selge');
// teine ring: tolgi õigesti
r = S.ring(yt, st, { ringId: 'r2' });
let q2 = []; while ((x = r.next())) q2.push(x.item);
const tolgi = q2.filter(q => q.samm === 'tolgi');
ok(tolgi.length === 5, 'teises ringis 5 tõlget (ja uued sõnad): ' + q2.map(q => q.samm).join());
tolgi.forEach(q => r.record(q, true, false));
ok(!S.selge(st, w0.id), 'üks tõlkering ei tee selgeks');
r = S.ring(yt, st, { ringId: 'r3' });
q2 = []; while ((x = r.next())) q2.push(x.item);
q2.filter(q => q.rida.id === w0.id).forEach(q => r.record(q, true, true));
ok(!S.selge(st, w0.id), 'kuulamisabiga tõlge ei loe');
r = S.ring(yt, st, { ringId: 'r4' });
q2 = []; while ((x = r.next())) q2.push(x.item);
q2.filter(q => q.rida.id === w0.id).forEach(q => r.record(q, true, false));
ok(S.selge(st, w0.id), 'kaks eri ringi ilma abita teeb selgeks');
ok(S.selgeid(st, TEEMAD) >= 1, 'selgeid loendab');
// vale vastus tuleb samas ringis tagasi
const st2 = {};
r = S.ring(yt, st2, { ringId: 'v1' });
const a = r.next().item;
r.record(a, false, false);
let tagasi = false; for (let k = 0; k < 20 && (x = r.next()); k++) if (x.repeat && x.item.id === a.id) { tagasi = true; ok(x.item.liik === 'sona', 'kordusel liik sona'); }
ok(tagasi, 'vale vastus tuleb tagasi');
// fookus
const st3 = {};
const viimane = yt.sonad[7].id;
r = S.ring(yt, st3, { fookus: [viimane] });
ok(r.valitud[0].id === viimane, 'fookuse sõna on ringis esimene');
// lausete sammud ei segune
ok(L.SAMMUD.length === 5 && L.samm({}, 'u4l4-01') === 0, 'lausete sammud endised');
ok(L.selge(st, w0.id) === false, 'lause-sammude järgi pole sõna selge (eri nimekiri)');

console.log(vigu ? vigu + ' VIGA ' + n + '-st' : 'KÕIK ' + n + ' KONTROLLI LÄBI');
process.exit(vigu ? 1 : 0);
