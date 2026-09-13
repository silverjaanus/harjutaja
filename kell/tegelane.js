/* Kella maskott: kägu (nagu käokellas).
 *
 * Soe oranž — panda on must-valge ja robot sinihall, seega on kolmik
 * värvi järgi eristatav ka väikeselt moodulikaardilt. Nime tal ei ole,
 * nagu ka teistel maskottidel (Silveri otsus 12. sept).
 *
 * KKagu(mood, {head}) -> SVG-string. Ilmed: happy, wave, cheer, kind, teach.
 * Sama API mis KRobot ja panda.
 */
(function () {
  'use strict';

  var SULG = '#d9803c', SULG_T = '#b8632a', KOHT = '#f6e0c4', NOKK = '#f0a93c';
  var INK = '#3a2413', VALGE = '#ffffff';

  function silmad(mood) {
    if (mood === 'cheer') {   // rõõmust kinni pigistatud silmad
      return '<path d="M50 54q4-4 8 0M62 54q4-4 8 0" fill="none" stroke="' + INK +
             '" stroke-width="2.6" stroke-linecap="round"/>';
    }
    var y = mood === 'kind' ? 55 : 54;
    return '<g class="kk-eyes">' +
      '<circle cx="54" cy="' + y + '" r="3.6" fill="' + INK + '"/>' +
      '<circle cx="66" cy="' + y + '" r="3.6" fill="' + INK + '"/>' +
      '<circle cx="55.2" cy="' + (y - 1.2) + '" r="1.2" fill="' + VALGE + '"/>' +
      '<circle cx="67.2" cy="' + (y - 1.2) + '" r="1.2" fill="' + VALGE + '"/></g>';
  }

  function pea(mood) {
    var kalle = mood === 'kind' ? ' transform="rotate(-8 60 56)"' : '';
    return '<g class="kk-head"' + kalle + '>' +
      '<path d="M60 30c2 0 3 2 3.4 4.5l1 5.5-8.8 0 1-5.5C57 32 58 30 60 30z" fill="' + SULG_T + '"/>' +
      '<circle cx="60" cy="56" r="22" fill="' + SULG + '"/>' +
      '<ellipse cx="60" cy="58" rx="16" ry="14" fill="' + KOHT + '"/>' +
      silmad(mood) +
      '<path d="M60 62l7 5-7 5-7-5z" fill="' + NOKK + '"/>' +
      '<path d="M60 67h7l-7 5z" fill="' + SULG_T + '" opacity=".35"/>' +
      '</g>';
  }

  function KKagu(mood, opts) {
    mood = mood || 'happy';
    opts = opts || {};
    if (opts.head) {
      return '<svg class="kk kk-head-only" viewBox="26 26 68 68" role="img" aria-label="kägu" focusable="false">' +
             pea(mood) + '</svg>';
    }

    var tiibVasak, tiibParem, sadel = '';
    if (mood === 'wave') {
      tiibVasak = '<path class="kk-wing kk-l" d="M42 84q-12-4-14-14 8-2 14 4z" fill="' + SULG_T + '"/>';
      tiibParem = '<path class="kk-wing kk-wave" d="M78 84q12-8 12-20-9 1-12 10z" fill="' + SULG_T + '"/>';
    } else if (mood === 'cheer') {
      tiibVasak = '<path class="kk-wing" d="M42 82q-12-10-10-22 9 2 12 12z" fill="' + SULG_T + '"/>';
      tiibParem = '<path class="kk-wing" d="M78 82q12-10 10-22-9 2-12 12z" fill="' + SULG_T + '"/>';
      sadel = '<g class="kk-spark" fill="' + NOKK + '">' +
        '<path d="M26 44l1.8 4.2 4.2 1.8-4.2 1.8L26 56l-1.8-4.2L20 50l4.2-1.8z"/>' +
        '<path d="M94 40l1.5 3.5 3.5 1.5-3.5 1.5L94 50l-1.5-3.5L89 45l3.5-1.5z"/></g>';
    } else if (mood === 'teach') {
      tiibVasak = '<path class="kk-wing" d="M42 84q-12-4-14-14 8-2 14 4z" fill="' + SULG_T + '"/>';
      tiibParem = '<path class="kk-wing" d="M78 80q14-2 16-12-10-3-16 4z" fill="' + SULG_T + '"/>';
    } else {
      tiibVasak = '<path class="kk-wing" d="M42 84q-12-4-14-14 8-2 14 4z" fill="' + SULG_T + '"/>';
      tiibParem = '<path class="kk-wing" d="M78 84q12-4 14-14-8-2-14 4z" fill="' + SULG_T + '"/>';
    }

    return '<svg class="kk" viewBox="0 0 120 120" role="img" aria-label="kägu" focusable="false">' +
      '<g class="kk-body">' +
      '<path d="M84 104q10-6 14-16-8-6-16-4z" fill="' + SULG_T + '"/>' +
      '<ellipse cx="60" cy="84" rx="24" ry="22" fill="' + SULG + '"/>' +
      '<ellipse cx="60" cy="88" rx="15" ry="15" fill="' + KOHT + '"/>' +
      tiibVasak + tiibParem +
      '<path d="M52 104v6M68 104v6" stroke="' + NOKK + '" stroke-width="3.4" stroke-linecap="round"/>' +
      pea(mood) +
      '</g>' + sadel + '</svg>';
  }

  window.KKagu = KKagu;
})();
