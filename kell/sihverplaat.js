/* Kell: analoogkella joonistamine SVG-na.
 *
 * Kaks osutit on teadlikult erinevad, sest just nende segiajamine on lapse
 * kõige sagedasem viga: tunniosuti on LÜHIKE ja TUME, minutiosuti PIKK ja
 * ROHELINE. Sama vahet seletab ka abitekst avalehel.
 */
(function () {
  'use strict';

  var INK = '#1d2f4f', MIN = '#1d7f53', EDGE = '#c3d4ea', FACE = '#ffffff';

  function polar(cx, cy, r, deg) {
    var a = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }
  function f(n) { return Math.round(n * 100) / 100; }

  /* svg(h, m, {size, numbers}) -> SVG-string */
  function svg(h, m, opts) {
    opts = opts || {};
    var size = opts.size || 220;
    var numbers = opts.numbers !== false;
    var cx = 50, cy = 50, p = [];

    p.push('<circle cx="50" cy="50" r="47" fill="' + FACE + '" stroke="' + EDGE + '" stroke-width="2.5"/>');

    for (var i = 0; i < 60; i++) {
      var big = i % 5 === 0;
      var a = polar(cx, cy, big ? 40 : 43, i * 6);
      var b = polar(cx, cy, 45, i * 6);
      p.push('<line x1="' + f(a[0]) + '" y1="' + f(a[1]) + '" x2="' + f(b[0]) + '" y2="' + f(b[1]) +
             '" stroke="' + (big ? INK : EDGE) + '" stroke-width="' + (big ? 2.4 : 1) + '" stroke-linecap="round"/>');
    }

    if (numbers) {
      for (var n = 1; n <= 12; n++) {
        var q = polar(cx, cy, 32, n * 30);
        p.push('<text x="' + f(q[0]) + '" y="' + f(q[1]) + '" text-anchor="middle" dominant-baseline="central" ' +
               'font-size="11" font-weight="700" fill="' + INK + '">' + n + '</text>');
      }
    }

    var hAng = ((h % 12) + m / 60) * 30;
    var mAng = m * 6;
    var hh = polar(cx, cy, 23, hAng);
    var mm = polar(cx, cy, 37, mAng);
    var hb = polar(cx, cy, -6, hAng);
    var mb = polar(cx, cy, -7, mAng);

    p.push('<line x1="' + f(mb[0]) + '" y1="' + f(mb[1]) + '" x2="' + f(mm[0]) + '" y2="' + f(mm[1]) +
           '" stroke="' + MIN + '" stroke-width="3.2" stroke-linecap="round"/>');
    p.push('<line x1="' + f(hb[0]) + '" y1="' + f(hb[1]) + '" x2="' + f(hh[0]) + '" y2="' + f(hh[1]) +
           '" stroke="' + INK + '" stroke-width="5.4" stroke-linecap="round"/>');
    p.push('<circle cx="50" cy="50" r="3.2" fill="' + INK + '"/>');
    p.push('<circle cx="50" cy="50" r="1.3" fill="' + FACE + '"/>');

    return '<svg class="kell-svg" viewBox="0 0 100 100" width="' + size + '" height="' + size +
           '" role="img" aria-label="analoogkell" focusable="false">' + p.join('') + '</svg>';
  }

  window.HSihverplaat = { svg: svg, tunniVarv: INK, minutiVarv: MIN };
})();
