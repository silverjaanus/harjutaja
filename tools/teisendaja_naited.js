/* Genereerib Teisendaja naidisulesanded faili, et eesti keelt saaks ule vaadata
   vvaljundi, mitte koodi pealt (sama tovote mis Kella tekstulesannetega).
   Kasutus: node tools/teisendaja_naited.js [mitu igal tasemel] [valjundfail] */
var Y = require('../teisendaja/yhik.js');
var fs = require('fs');

var mitu = parseInt(process.argv[2], 10) || 60;
var fail = process.argv[3] || 'teisendaja-naited.txt';

function seeme(n) {
  var s = n >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
var R = seeme(7);
var read = [];

for (var t = 1; t <= 4; t++) {
  var T = Y.TASEMED[t];
  read.push('');
  read.push('=== TASE ' + t + ' - ' + T.nimi + ' (' + T.klass + ') ===');
  read.push('');
  for (var i = 0; i < mitu; i++) {
    var q = Y.genereeri(t, 'koik', R);
    var vastus = q.valjad === 0
      ? (q.tyyp === 'vordle' ? q.valikud[q.vastus] : q.vastus)
      : [].concat(q.vastus).map(Y.vorm).join(' / ');
    read.push('[' + q.tyyp + '] ' + q.kysimus);
    if (q.valikud) read.push('    valikud: ' + q.valikud.join(' | '));
    read.push('    vastus: ' + vastus);
    read.push('    vihje:  ' + Y.vihje(q));
  }
}

read.push('');
read.push('=== DIAGNOOSILAUSED (vale vastuse peale) ===');
read.push('');
var R2 = seeme(11);
var naited = 0;
while (naited < 40) {
  var g = Y.genereeri(2 + (naited % 3), 'koik', R2);
  if (g.valjad === 0) continue;
  var vale = g.valjad === 2
    ? [Y.vorm(g.vastus[0] - 1), Y.vorm(g.vastus[1] + 60)]
    : [Y.vorm(naited % 2 ? g.arv : g.vastus / 10)];
  var d = Y.diagnoosi(g, vale);
  if (!d.lause) continue;
  read.push(g.kysimus + '   (laps kirjutas: ' + vale.join(' / ') + ')');
  read.push('    ' + d.liik + ': ' + d.lause);
  naited++;
}

fs.writeFileSync(fail, read.join('\n'), 'utf8');
console.log('Kirjutatud: ' + fail + ' (' + read.length + ' rida)');
