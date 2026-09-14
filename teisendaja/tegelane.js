/* Teisendaja maskott: mõõdulint. KLint(mood, {head:true}) tagastab
   portree, muidu täiskuju. Kõik ilmed on staatilised SVG-joonistused. */
(function () {
  'use strict';
  var K = '#254d41', L = '#f0df87';
  var nimed = { happy: 'rõõmus', wave: 'tervitav', cheer: 'hõiskav', kind: 'julgustav', teach: 'selgitav' };

  function joon(d, laius) {
    return '<path d="' + d + '" fill="none" stroke-width="' + (laius || 3) + '"/>';
  }

  // Lindi keskjoone puutujast saadud normaal hoiab laiuse ja skaala ühtlasena.
  function lint(mood) {
    var p = {
      happy: [70, 79, 86, 79, 93, 91, 108, 89],
      wave: [70, 79, 113, 84, 77, 33, 108, 37],
      cheer: [70, 79, 121, 54, 111, 10, 82, 20],
      kind: [70, 79, 83, 79, 78, 95, 84, 100],
      teach: [70, 79, 84, 79, 99, 79, 112, 79]
    }[mood];
    var haut = [], alt = [], kriipsud = '', lopp;
    for (var i = 0; i <= 48; i++) {
      var t = i / 48, u = 1 - t;
      var x = u*u*u*p[0] + 3*u*u*t*p[2] + 3*u*t*t*p[4] + t*t*t*p[6];
      var y = u*u*u*p[1] + 3*u*u*t*p[3] + 3*u*t*t*p[5] + t*t*t*p[7];
      var dx = 3*u*u*(p[2]-p[0]) + 6*u*t*(p[4]-p[2]) + 3*t*t*(p[6]-p[4]);
      var dy = 3*u*u*(p[3]-p[1]) + 6*u*t*(p[5]-p[3]) + 3*t*t*(p[7]-p[5]);
      var pikkus = Math.sqrt(dx*dx + dy*dy), nx = dy/pikkus, ny = -dx/pikkus;
      function punkt(kaugus) { return (x + nx*kaugus).toFixed(2) + ' ' + (y + ny*kaugus).toFixed(2); }
      haut.push(punkt(7)); alt.push(punkt(-7));
      if (i > 0 && i < 48 && i % 8 === 0) {
        kriipsud += 'M' + punkt(6) + 'L' + punkt(i % 16 === 0 ? 0 : 3);
      }
      if (i === 48) lopp = 'translate(' + x + ' ' + y + ') rotate(' + (Math.atan2(dy, dx)*180/Math.PI) + ')';
    }
    return '<g class="kl-tape"><path d="M' + haut.join('L') + 'L' + alt.reverse().join('L') + 'Z" fill="' + L + '"/>' +
      joon(kriipsud, 2) + '<path transform="' + lopp + '" d="M-2-9H3V11H-2Z" fill="#c5d1ba" stroke-width="2.5"/></g>';
  }

  function nagu(mood) {
    var silmad, suu, kulmud = '';
    function silm(x, y, r) {
      return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + K + '" stroke="none"/>' +
        '<circle cx="' + (x-1) + '" cy="' + (y-1.2) + '" r="1.1" fill="#fffefa" stroke="none"/>';
    }
    silmad = silm(29, 55, 3.5) + silm(45, 55, 3.5);
    suu = joon('M30 66Q37 74 44 66', 2.6);
    if (mood === 'wave') {
      silmad = silm(29, 54, 4) + silm(45, 54, 4);
      suu = '<path d="M30 65Q37 68 44 65Q43 76 37 75Q31 75 30 65Z" fill="' + K + '" stroke-width="2"/>';
    } else if (mood === 'cheer') {
      silmad = joon('M24 56Q29 47 34 56M40 56Q45 47 50 56', 3.2);
      suu = '<path d="M28 64Q37 68 46 64Q45 78 37 77Q29 77 28 64Z" fill="' + K + '" stroke-width="2"/>' +
        '<path d="M32 73Q37 69 42 73Q37 78 32 73Z" fill="#e8a0a0" stroke="none"/>';
    } else if (mood === 'kind') {
      silmad = joon('M25 56Q29 52 33 56M41 56Q45 52 49 56', 2.8);
      suu = joon('M32 66Q37 70 42 66', 2.5);
    } else if (mood === 'teach') {
      silmad = silm(31, 55, 3.5) + silm(47, 55, 3.5);
      kulmud = joon('M25 47L32 46M41 44Q46 41 50 45', 2.3);
      // Umar "o" luges ullatusena, mitte seletamisena: seletav suu on lahti,
      // aga laiem kui korgem - nagu raakiv, mitte ehmunud.
      suu = '<path d="M31 64Q39 61 47 64Q46 73 39 73Q32 73 31 64Z" fill="' + K + '" stroke-width="2"/>';
    }
    return '<g class="kl-face">' + kulmud + silmad + suu + '</g>';
  }

  function korpus(mood) {
    return '<path d="M16 41V28h20v13" fill="' + K + '"/>' +
      '<path d="M6 57c0-18 13-28 30-28 23 0 35 15 35 36v31H17C10 96 6 91 6 84Z" fill="#49a982"/>' +
      '<path d="M8 79v6c0 8 5 11 12 11h51V82" fill="#32755d"/>' +
      '<circle cx="37" cy="60" r="24" fill="#b9dca4"/>' +
      '<circle cx="37" cy="60" r="18" fill="#83bc87" stroke-width="2"/>' + nagu(mood) +
      '<path d="M65 67h8v24h-8Z" fill="' + K + '"/>';
  }

  window.KLint = function (mood, opts) {
    if (typeof mood !== 'string' || !Object.prototype.hasOwnProperty.call(nimed, mood)) mood = 'happy';
    opts = opts || {};
    var pea = !!opts.head;
    var kalle = mood === 'kind' ? 'rotate(-3 38 94)' : mood === 'cheer' ? 'rotate(3 38 94)' : '';
    var jalad = mood === 'cheer' ? 'M28 96L19 112H8M58 96L72 106L82 102' :
      mood === 'wave' ? 'M28 97L23 121H12M58 97L70 116H81' :
      mood === 'kind' ? 'M28 97L28 121H18M58 97L61 121H71' : 'M28 97L23 121H12M58 97L67 121H79';
    // Portree ei sisalda jalgu ega väljaulatuvat linti, ka nähtava ülevoolu korral.
    return '<svg class="klint kl-' + mood + (pea ? ' kl-head-only' : '') + '" viewBox="' +
      (pea ? '1 23 78 78' : '0 0 120 134') + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mõõdulint: ' + nimed[mood] + '" focusable="false">' +
      '<g stroke="' + K + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
      (pea ? '' : joon(jalad, 5)) + '<g class="kl-body" transform="' + (kalle || 'translate(0 0)') + '">' +
      korpus(mood) + '</g>' + (pea ? '' : lint(mood)) +
      (!pea && mood === 'cheer' ? '<g fill="' + L + '" stroke-width="2"><path d="M17 9L20 15L26 18L20 21L17 27L14 21L8 18L14 15Z"/><path d="M59 7L61 12L66 14L61 16L59 21L57 16L52 14L57 12Z"/></g>' : '') +
      '</g></svg>';
  };
})();
