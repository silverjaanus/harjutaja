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

  function tiib(mood) {
    if (mood === 'wave' || mood === 'cheer')
      return '<path class="kp-wing" d="M40 70q-22-8-26-30q14 6 20 2q6 12 14 16z" fill="' + HELE + '" stroke="' + TUME + '" stroke-width="2.5" stroke-linejoin="round"/>';
    if (mood === 'teach')
      return '<path class="kp-wing" d="M44 72q10-4 28-2q-6 6-4 8q-14 4-24 2z" fill="' + HELE + '" stroke="' + TUME + '" stroke-width="2.5" stroke-linejoin="round"/>';
    return '<path class="kp-wing" d="M40 70q-6 20 4 34q10-6 12-24z" fill="' + HELE + '" stroke="' + TUME + '" stroke-width="2.5" stroke-linejoin="round"/>';
  }

  function KPapagoi(mood, o) {
    mood = nimed[mood] ? mood : 'happy';
    o = o || {};
    var silt = 'Papagoi (' + nimed[mood] + ')';
    if (o.head) {
      return '<svg class="kpapagoi" viewBox="34 2 64 68" role="img" aria-label="' + silt + '">' + pea(mood) + '</svg>';
    }
    var kaed = mood === 'cheer'
      ? '<path class="kp-wing" d="M78 70q22-8 26-30q-14 6-20 2q-6 12-14 16z" fill="' + HELE + '" stroke="' + TUME + '" stroke-width="2.5" stroke-linejoin="round"/>' : '';
    return '<svg class="kpapagoi" viewBox="0 0 120 150" role="img" aria-label="' + silt + '">' +
      /* saba */
      '<path d="M52 108q-8 20-2 38q8-10 10-14q4 8 12 12q0-20-6-36z" fill="' + KEHA + '" stroke="' + TUME + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M58 112q-2 14 2 26" fill="none" stroke="' + HELE + '" stroke-width="3" stroke-linecap="round"/>' +
      /* oks */
      '<path d="M18 124h86" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/>' +
      /* keha */
      '<path d="M40 66q-6 28 8 50q14 8 26 0q12-24 4-50z" fill="' + KEHA + '" stroke="' + TUME + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M50 78q-2 20 8 32q10 2 14-4q6-16 0-28z" fill="' + KOHT + '"/>' +
      /* jalad */
      '<path d="M54 116v8m-4 0h8M68 116v8m-4 0h8" stroke="' + NOKK2 + '" stroke-width="3" stroke-linecap="round"/>' +
      tiib(mood) + kaed +
      pea(mood) +
      '</svg>';
  }

  window.KPapagoi = KPapagoi;
})();
