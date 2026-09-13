/* Kellaütlemise test: node kell/aeg.test.js
   Ootused tulevad Fable'i keeleülevaatusest (claude/kell-keelereeglid.md),
   mis toetub ÕS 2018-le, EKSS-ile ja Sõnaveebile. */
global.window = {};
require('./aeg.js');
const A = global.window.HAeg;

const OOTUS = {
  '15:00': 'kolm',
  '15:01': 'üks minut kolm läbi',
  '15:05': 'viis minutit kolm läbi',
  '15:10': 'kümme minutit kolm läbi',
  '15:15': 'veerand neli',
  '15:20': 'kakskümmend minutit kolm läbi',
  '15:25': 'kakskümmend viis minutit kolm läbi',
  '15:30': 'pool neli',
  '15:35': 'kahekümne viie minuti pärast neli',
  '15:40': 'kahekümne minuti pärast neli',
  '15:45': 'kolmveerand neli',
  '15:50': 'kümne minuti pärast neli',
  '15:55': 'viie minuti pärast neli',
  '15:49': 'üheteistkümne minuti pärast neli',
  '12:00': 'kaksteist',
  '0:00': 'kaksteist',
  '0:30': 'pool üks',
  '11:45': 'kolmveerand kaksteist',
  '23:45': 'kolmveerand kaksteist',
  '12:30': 'pool üks',
  '13:15': 'veerand kaks',
};

let vigu = 0;
for (const [aeg, oodatud] of Object.entries(OOTUS)) {
  const [h, m] = aeg.split(':').map(Number);
  const sai = A.utle(h, m);
  const ok = sai === oodatud;
  if (!ok) vigu++;
  console.log((ok ? '  OK   ' : '  VIGA ') + aeg + ' -> „' + sai + '"' + (ok ? '' : '   oodatud: „' + oodatud + '"'));
}

// ükski vorm ei tohi olla tühi ega sisaldada topelttühikut
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m++) {
    const s = A.utle(h, m);
    if (!s || /\s\s/.test(s) || /^\s|\s$/.test(s) || /undefined/.test(s)) {
      console.log('  VIGA ' + h + ':' + m + ' -> „' + s + '"');
      vigu++;
    }
  }
}

console.log(vigu ? '\nVIGU: ' + vigu : '\nKÕIK LÄBI (1440 aega kontrollitud)');
process.exit(vigu ? 1 : 0);
