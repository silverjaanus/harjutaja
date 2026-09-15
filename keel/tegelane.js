/* Keele maskott: lilla papagoi (papagoi kordab sõnu järele — nagu laps,
   kes loeb rea kuuldu järgi ette). KPapagoi(mood, {head:true}) tagastab
   portree, muidu täiskuju. Värv on teistest maskottidest eristuv: panda
   must-valge, robot sinihall, kägu oranž, mõõdulint roheline, papagoi lilla. */
(function () {
  'use strict';
  var TUME = '#3b2566', KEHA = '#8e6ad8', HELE = '#b89cf0', KOHT = '#efe6ff', NOKK = '#f3c445', NOKK2 = '#c98f12';
  var nimed = { happy: 'rõõmus', wave: 'tervitav', cheer: 'hõiskav', kind: 'julgustav', teach: 'selgitav' };

  function silm(mood) {
    if (mood === 'cheer') return '<path d="M63 40q5-6 10 0" fill="none" stroke="' + TUME + '" stroke-width="3" stroke-linecap="round"/>';
    if (mood === 'kind') return '<path d="M63 42q5 4 10 0" fill="none" stroke="' + TUME + '" stroke-width="3" stroke-linecap="round"/>';
    return '<g class="kp-eye"><circle cx="68" cy="41" r="7" fill="#fff" stroke="' + TUME + '" stroke-width="2"/>' +
      '<circle cx="70" cy="41" r="3.6" fill="' + TUME + '"/><circle cx="71.2" cy="39.6" r="1.1" fill="#fff"/></g>';
  }

  function pea(mood) {
    var suu = mood === 'cheer' || mood === 'wave' || mood === 'teach'
      ? '<path d="M79 52q7 1 9 6q-6 1-10-2z" fill="' + NOKK2 + '"/>' : '';
    return '<g class="kp-head">' +
      /* tukk */
      '<path d="M52 22q-2-12 6-16q-1 8 4 12q1-10 10-11q-5 7-2 14z" fill="' + HELE + '" stroke="' + TUME + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="62" cy="44" r="22" fill="' + KEHA + '" stroke="' + TUME + '" stroke-width="2.5"/>' +
      '<ellipse cx="60" cy="54" rx="6" ry="4" fill="#f6a5c0" opacity=".7"/>' +
      silm(mood) +
      /* nokk */
      '<path d="M78 38q14 0 14 12q0 8-6 10q1-7-8-9z" fill="' + NOKK + '" stroke="' + TUME + '" stroke-width="2" stroke-linejoin="round"/>' +
      suu +
      '</g>';
  }

  /* Tiivad: sulgedega otsad (kolm sakki), mitte lame leht. Kokku pandud tiib
     on keha küljel, tõstetud tiib algab õlast. */
  var JOON = '" fill="' + HELE + '" stroke="' + TUME + '" stroke-width="2.5" stroke-linejoin="round"/>';
  var TIIVAD = {
    kokku: 'M52 70C38 78 34 96 40 113L45 106L48 115L53 106L57 111C64 96 64 80 52 70Z',
    ules: 'M56 82C44 82 28 74 18 60L27 59L18 49L29 50L24 40L35 45C43 55 54 66 62 74Z',
    ules2: 'M72 88C84 88 100 82 110 70L101 68L110 59L99 59L104 50L93 54C85 63 74 72 66 80Z',
    ette: 'M52 76C62 73 76 72 92 68L86 74L95 77L85 80L91 84C76 88 62 88 52 86Z'
  };
  function tiibJoon(d) {
    return '<path class="kp-wing" d="' + d + JOON;
  }
  function tiib(mood) {
    if (mood === 'wave') return tiibJoon(TIIVAD.ules);
    if (mood === 'cheer') return tiibJoon(TIIVAD.ules) + tiibJoon(TIIVAD.ules2);
    if (mood === 'teach') return tiibJoon(TIIVAD.ette);
    return tiibJoon(TIIVAD.kokku) +
      '<path d="M47 84C46 94 47 102 49 108M53 82C54 92 54 100 53 106" fill="none" stroke="' + TUME + '" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>';
  }

  function KPapagoi(mood, o) {
    mood = nimed[mood] ? mood : 'happy';
    o = o || {};
    var silt = 'Papagoi (' + nimed[mood] + ')';
    if (o.head) {
      return '<svg class="kpapagoi" viewBox="34 2 64 68" role="img" aria-label="' + silt + '">' + pea(mood) + '</svg>';
    }
    return '<svg class="kpapagoi" viewBox="0 0 120 150" role="img" aria-label="' + silt + '">' +
      /* saba */
      '<path d="M52 108q-8 20-2 38q8-10 10-14q4 8 12 12q0-20-6-36z" fill="' + KEHA + '" stroke="' + TUME + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M58 112q-2 14 2 26" fill="none" stroke="' + HELE + '" stroke-width="3" stroke-linecap="round"/>' +
      /* oks */
      '<path d="M18 124h86" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/>' +
      /* keha: ümar, ülaosa jääb pea alla */
      '<path d="M46 60C34 78 36 104 52 115C62 121 74 118 80 108C88 92 85 70 76 58Z" fill="' + KEHA + '" stroke="' + TUME + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M56 76C51 90 54 106 63 111C72 110 77 97 73 82C70 73 60 70 56 76Z" fill="' + KOHT + '"/>' +
      /* jalad */
      '<path d="M54 116v8m-4 0h8M68 116v8m-4 0h8" stroke="' + NOKK2 + '" stroke-width="3" stroke-linecap="round"/>' +
      tiib(mood) +
      pea(mood) +
      '</svg>';
  }

  window.KPapagoi = KPapagoi;
})();
