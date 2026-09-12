/* Korrutaja maskott: panda. KPanda(mood, head) tagastab SVG-teksti.
   Ilmed: happy (vaikimisi), wave, cheer, kind, teach. head=true annab ainult pea.
   AJUTINE KOOPIA: originaal elab praegu korrutaja repos (korrutaja.src.html, function panda).
   Kui Korrutaja Harjutajasse kolib, jääb alles ainult see fail. */
(function () {
  function panda(mood, head) {
    var K = '#1E2140', W = '#fff', B = '#2F49D1', P = '#F4A3A0', Y = '#F2A93B';
    var tilt = mood === 'kind' ? ' transform="rotate(-9 60 60)"' : '', eyes, mouth, armL, armR, extra = '', brows = '';
    var up = function (x1, y1, x2, y2, cls, o) { return '<path class="' + (cls || '') + '" ' + (o ? 'style="transform-origin:' + o + '"' : '') + ' d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '" stroke="' + K + '" stroke-width="15" stroke-linecap="round"/>'; };
    var eye = function (x, dx, dy, r) { return '<circle cx="' + x + '" cy="55" r="5.8" fill="' + W + '"/><circle cx="' + (x + dx) + '" cy="' + (55 + dy) + '" r="' + (r || 3.7) + '" fill="' + K + '"/><circle cx="' + (x + dx + 1.6) + '" cy="' + (55 + dy - 1.8) + '" r="1.4" fill="' + W + '"/>'; };
    var shut = function (x) { return '<path d="M' + (x - 6) + ' 57 Q' + x + ' 50 ' + (x + 6) + ' 57" stroke="' + W + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>'; };
    eyes = '<g class="pe">' + eye(43, .6, .6) + eye(77, -.6, .6) + '</g>';
    mouth = '<path d="M53 73 Q56.5 77.5 60 73.6 Q63.5 77.5 67 73" stroke="' + K + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    armL = up(33, 91, 41, 107); armR = up(87, 91, 79, 107);
    if (mood === 'wave' || mood === 'teach') { armR = up(87, 91, 103, 68, mood === 'wave' ? 'pwave' : '', '87px 91px'); }
    if (mood === 'cheer') {
      eyes = shut(43) + shut(77);
      mouth = '<path d="M51.5 72 Q60 86 68.5 72 Z" fill="' + K + '"/><path d="M55.5 78.2 Q60 82.6 64.5 78.2 Q60 76.4 55.5 78.2Z" fill="' + P + '"/>';
      armL = up(33, 91, 15, 67, 'parmL', '33px 91px'); armR = up(87, 91, 105, 67, 'parmR', '87px 91px');
      extra = '<g class="pstars" fill="' + Y + '"><path d="M12 30l2.2 5 5 2.2-5 2.2-2.2 5-2.2-5-5-2.2 5-2.2z"/><path d="M108 22l1.8 4 4 1.8-4 1.8-1.8 4-1.8-4-4-1.8 4-1.8z"/><path d="M104 104l1.5 3.4 3.4 1.5-3.4 1.5-1.5 3.4-1.5-3.4-3.4-1.5 3.4-1.5z"/></g>';
    }
    if (mood === 'kind') {
      eyes = '<g class="pe">' + eye(43, .6, .8, 4.1) + eye(77, -.6, .8, 4.1) + '</g>';
      mouth = '<path d="M54 73.5 Q60 78.5 66 73.5" stroke="' + K + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    }
    var ears = '<circle cx="27" cy="25" r="13.5" fill="' + K + '"/><circle cx="93" cy="25" r="13.5" fill="' + K + '"/>';
    var face = '<ellipse cx="60" cy="56" rx="42" ry="37" fill="' + W + '" stroke="' + K + '" stroke-width="3"/>' +
      '<ellipse cx="42" cy="56" rx="11.5" ry="14.5" transform="rotate(32 42 56)" fill="' + K + '"/><ellipse cx="78" cy="56" rx="11.5" ry="14.5" transform="rotate(-32 78 56)" fill="' + K + '"/>' +
      '<ellipse cx="29" cy="69" rx="6.5" ry="4" fill="' + P + '" opacity=".75"/><ellipse cx="91" cy="69" rx="6.5" ry="4" fill="' + P + '" opacity=".75"/>' +
      eyes + brows + '<ellipse cx="60" cy="67.5" rx="5.4" ry="3.8" fill="' + K + '"/>' + mouth;
    if (head) {
      return '<svg class="panda" viewBox="12 9 96 88" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' + ears + '<g class="phead"' + tilt + '>' + face + '</g></svg>';
    }
    var body = '<ellipse cx="42" cy="124" rx="13" ry="8.5" fill="' + K + '"/><ellipse cx="78" cy="124" rx="13" ry="8.5" fill="' + K + '"/>' +
      '<ellipse cx="60" cy="105" rx="32" ry="24" fill="' + W + '" stroke="' + K + '" stroke-width="3"/>';
    var scarf = '<path d="M33 88 Q60 100 87 88 L87 95 Q60 107 33 95Z" fill="' + B + '"/><path d="M71 97 L83 96 L80 115 L72 112Z" fill="' + B + '"/>' +
      '<path d="M74.5 102.5l4 4m0-4l-4 4" stroke="' + W + '" stroke-width="1.8" stroke-linecap="round"/>';
    return '<svg class="panda" viewBox="0 0 120 134" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' + extra + ears + '<g class="pbody">' + body + '</g>' + scarf + armL + '<g class="phead"' + tilt + '>' + face + '</g>' + armR + '</svg>';
  }
  window.KPanda = panda;
})();
