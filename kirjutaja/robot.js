/* Kirjutaja maskott: plekkrobot. Sulepea-antenn, neetidega kandiline pea,
   vedrukael, numbrilaud kõhul ja haaratsitega käed. KRobot(mood, {head})
   tagastab SVG-teksti. Ilmed: happy, wave, cheer, kind, teach.
   head:true annab ainult pea (vihjekast). */
(function () {
  const INK = "#1d2f4f", BODY = "#1f5c99", PAPER = "#fdfdfa", YEL = "#ffd166", LINE = "#9fbde6", PINK = "#e8a0a0";
  // õlg, küünarnukk, käsi
  const ARMS = {
    happy: { l: [60, 136, 44, 158, 42, 178], r: [140, 136, 156, 158, 158, 178] },
    wave:  { l: [60, 136, 44, 158, 42, 178], r: [140, 136, 162, 126, 170, 104] },
    cheer: { l: [60, 136, 42, 116, 36, 96],  r: [140, 136, 158, 116, 164, 96] },
    kind:  { l: [60, 136, 44, 158, 52, 176], r: [140, 136, 156, 158, 148, 176] },
    teach: { l: [60, 136, 44, 158, 42, 178], r: [140, 136, 158, 120, 162, 98] }
  };
  const seg = (x1, y1, x2, y2, w) =>
    '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + INK + '" stroke-width="' + (w + 6) + '" stroke-linecap="square"/>' +
    '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + BODY + '" stroke-width="' + w + '" stroke-linecap="square"/>';

  function arm(p, cls) {
    const sx = p[0], sy = p[1], ex = p[2], ey = p[3], hx = p[4], hy = p[5];
    const a = Math.atan2(hy - ey, hx - ex);
    const px = hx + Math.cos(a) * 6, py = hy + Math.sin(a) * 6;   // haaratsi suund
    const n1x = px + Math.cos(a - 1.2) * 8, n1y = py + Math.sin(a - 1.2) * 8;
    const n2x = px + Math.cos(a + 1.2) * 8, n2y = py + Math.sin(a + 1.2) * 8;
    return '<g class="kr-arm ' + cls + '" style="transform-origin:' + sx + 'px ' + sy + 'px">' +
      seg(sx, sy, ex, ey, 9) + seg(ex, ey, hx, hy, 8) +
      '<line x1="' + px + '" y1="' + py + '" x2="' + n1x + '" y2="' + n1y + '" stroke="' + INK + '" stroke-width="4.5" stroke-linecap="round"/>' +
      '<line x1="' + px + '" y1="' + py + '" x2="' + n2x + '" y2="' + n2y + '" stroke="' + INK + '" stroke-width="4.5" stroke-linecap="round"/>' +
      '<rect x="' + (ex - 5) + '" y="' + (ey - 5) + '" width="10" height="10" rx="2" fill="' + INK + '" opacity=".55"/>' +
      '<circle cx="' + hx + '" cy="' + hy + '" r="8" fill="' + YEL + '" stroke="' + INK + '" stroke-width="3"/></g>';
  }
  function pencil(x, y) {
    return '<g transform="translate(' + x + ' ' + y + ') rotate(14)">' +
      '<rect x="-4.5" y="-42" width="9" height="36" rx="2" fill="' + YEL + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M-4.5 -42 L0 -53 L4.5 -42 Z" fill="#f3d9b1" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M-1.6 -48 L0 -53 L1.6 -48 Z" fill="' + INK + '"/></g>';
  }
  function face(mood) {
    const cheeks = '<circle cx="73" cy="85" r="5" fill="' + YEL + '" opacity=".85"/><circle cx="127" cy="85" r="5" fill="' + YEL + '" opacity=".85"/>';
    let eyes, mouth, brows = "";
    if (mood === "cheer") {
      eyes = '<path d="M76 73 Q84 63 92 73 M108 73 Q116 63 124 73" fill="none" stroke="' + INK + '" stroke-width="4.2" stroke-linecap="round"/>';
      mouth = '<path d="M88 81 Q100 94 112 81 Z" fill="' + INK + '"/><path d="M93 86 Q100 92 107 86" fill="' + PINK + '"/>';
    } else if (mood === "kind") {
      eyes = '<g class="kr-eyes"><circle cx="84" cy="73" r="6" fill="' + INK + '"/><circle cx="116" cy="73" r="6" fill="' + INK + '"/>' +
        '<circle cx="86.2" cy="70.8" r="2" fill="#fff"/><circle cx="118.2" cy="70.8" r="2" fill="#fff"/></g>';
      brows = '<path d="M75 63 L90 60 M110 60 L125 63" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>';
      mouth = '<path d="M92 85 Q100 90 108 85" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>';
    } else {
      eyes = '<g class="kr-eyes"><circle cx="84" cy="72" r="7" fill="' + INK + '"/><circle cx="116" cy="72" r="7" fill="' + INK + '"/>' +
        '<circle cx="86.5" cy="69.5" r="2.4" fill="#fff"/><circle cx="118.5" cy="69.5" r="2.4" fill="#fff"/></g>';
      mouth = mood === "teach"
        ? '<ellipse cx="100" cy="85" rx="5.5" ry="4.5" fill="' + INK + '"/>'
        : '<path d="M89 83 Q100 93 111 83" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>';
    }
    return brows + eyes + mouth + cheeks;
  }
  function head(mood) {
    const rivet = (x, y) => '<circle cx="' + x + '" cy="' + y + '" r="2.2" fill="' + INK + '" opacity=".5"/>';
    return '<g class="kr-head">' +
      '<line x1="100" y1="40" x2="100" y2="30" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>' +
      '<rect x="93" y="25" width="14" height="7" rx="2.5" fill="' + INK + '"/>' +
      '<path d="M100 0 C104 6 110 12 110 19 C110 23 107 25 105 25 L95 25 C93 25 90 23 90 19 C90 12 96 6 100 0 Z" fill="' + YEL + '" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<path d="M100 3 L100 15" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/><circle cx="100" cy="17.5" r="2" fill="' + INK + '"/>' +
      '<circle cx="46" cy="74" r="8" fill="' + YEL + '" stroke="' + INK + '" stroke-width="3"/><circle cx="154" cy="74" r="8" fill="' + YEL + '" stroke="' + INK + '" stroke-width="3"/>' +
      '<rect x="54" y="40" width="92" height="68" rx="8" fill="' + BODY + '" stroke="' + INK + '" stroke-width="4"/>' +
      rivet(61, 47) + rivet(139, 47) + rivet(61, 101) + rivet(139, 101) +
      '<rect x="66" y="50" width="68" height="48" rx="6" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      face(mood) + '</g>';
  }
  function sparkles() {
    const star = (x, y, s) => '<path d="M' + x + ' ' + (y - s) + ' Q' + x + ' ' + y + ' ' + (x + s) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y + s) + ' Q' + x + ' ' + y + ' ' + (x - s) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y - s) + 'Z" fill="' + YEL + '" stroke="' + INK + '" stroke-width="1.5"/>';
    return '<g class="kr-spark">' + star(22, 60, 9) + star(180, 52, 10) + star(172, 148, 7) + star(26, 140, 6) + '</g>';
  }
  function KRobot(mood, opts) {
    mood = ARMS[mood] ? mood : "happy";
    opts = opts || {};
    if (opts.head) return '<svg class="krobot kr-' + mood + '" viewBox="34 0 132 114" role="img" aria-label="Robot" xmlns="http://www.w3.org/2000/svg">' + head(mood) + '</svg>';
    const a = ARMS[mood];
    const tilt = mood === "kind" ? ' transform="rotate(-5 100 106)"' : "";
    return '<svg class="krobot kr-' + mood + '" viewBox="0 0 200 226" role="img" aria-label="Robot" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="100" cy="220" rx="44" ry="5.5" fill="' + INK + '" opacity=".12"/>' +
      '<g class="kr-body">' +
      // jalad
      '<rect x="74" y="186" width="17" height="18" fill="' + BODY + '" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<rect x="109" y="186" width="17" height="18" fill="' + BODY + '" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<rect x="64" y="202" width="33" height="13" rx="3" fill="' + INK + '"/><rect x="103" y="202" width="33" height="13" rx="3" fill="' + INK + '"/>' +
      arm(a.l, "kr-l") + (mood === "teach" ? pencil(a.r[4], a.r[5]) : "") + arm(a.r, "kr-r") +
      // kere
      '<rect x="60" y="126" width="80" height="62" rx="8" fill="' + BODY + '" stroke="' + INK + '" stroke-width="4"/>' +
      '<rect x="70" y="136" width="42" height="28" rx="3" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<line x1="75" y1="146" x2="107" y2="146" stroke="' + LINE + '" stroke-width="2"/><line x1="75" y1="155" x2="107" y2="155" stroke="' + LINE + '" stroke-width="2"/>' +
      '<path d="M77 153 Q83 141 89 150 T101 144" fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="124" cy="143" r="8" fill="' + YEL + '" stroke="' + INK + '" stroke-width="2.5"/><line x1="124" y1="143" x2="128" y2="138" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '<circle cx="74" cy="176" r="3.5" fill="' + YEL + '" stroke="' + INK + '" stroke-width="2"/><circle cx="86" cy="176" r="3.5" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2"/><circle cx="98" cy="176" r="3.5" fill="' + YEL + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="110" y="171" width="20" height="9" rx="2" fill="' + INK + '" opacity=".45"/>' +
      // vedrukael
      '<line x1="100" y1="104" x2="100" y2="128" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M89 110 Q100 105 111 110 Q100 115 89 120 Q100 115 111 120 Q100 125 89 130" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<g' + tilt + '>' + head(mood) + '</g>' +
      '<circle cx="60" cy="136" r="8" fill="' + YEL + '" stroke="' + INK + '" stroke-width="3"/><circle cx="140" cy="136" r="8" fill="' + YEL + '" stroke="' + INK + '" stroke-width="3"/>' +
      '</g>' + (mood === "cheer" ? sparkles() : "") + '</svg>';
  }
  window.KRobot = KRobot;
})();
