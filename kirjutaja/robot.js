/* Kirjutaja maskott: robot. Sulepea-antenn, tume ekraannägu kollaste silmadega,
   liigestega käed ja jalad. KRobot(mood, {head}) tagastab SVG-teksti.
   Ilmed: happy, wave, cheer, kind, teach. head:true annab ainult pea. */
(function () {
  const INK = "#1d2f4f", BODY = "#1f5c99", DARK = "#13304f", PAPER = "#fdfdfa", YEL = "#ffd166", LINE = "#9fbde6";
  // õlg, küünarnukk, käsi
  const ARMS = {
    happy: { l: [62, 126, 46, 148, 44, 172], r: [138, 126, 154, 148, 156, 172] },
    wave:  { l: [62, 126, 46, 148, 44, 172], r: [138, 126, 160, 118, 168, 94] },
    cheer: { l: [62, 126, 42, 108, 36, 86],  r: [138, 126, 158, 108, 164, 86] },
    kind:  { l: [62, 126, 44, 148, 52, 170], r: [138, 126, 156, 148, 148, 170] },
    teach: { l: [62, 126, 46, 148, 44, 172], r: [138, 126, 156, 112, 160, 88] }
  };
  const seg = (x1, y1, x2, y2, w) =>
    '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + INK + '" stroke-width="' + (w + 5) + '" stroke-linecap="round"/>' +
    '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + BODY + '" stroke-width="' + w + '" stroke-linecap="round"/>';

  function arm(p, cls) {
    const [sx, sy, ex, ey, hx, hy] = p;
    const a = Math.atan2(hy - ey, hx - ex);
    const px = hx + Math.cos(a) * 7, py = hy + Math.sin(a) * 7;   // haaratsi suund
    const n1x = px + Math.cos(a - 1.1) * 7, n1y = py + Math.sin(a - 1.1) * 7;
    const n2x = px + Math.cos(a + 1.1) * 7, n2y = py + Math.sin(a + 1.1) * 7;
    return '<g class="kr-arm ' + cls + '" style="transform-origin:' + sx + 'px ' + sy + 'px">' +
      seg(sx, sy, ex, ey, 8) + seg(ex, ey, hx, hy, 7) +
      '<line x1="' + px + '" y1="' + py + '" x2="' + n1x + '" y2="' + n1y + '" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="' + px + '" y1="' + py + '" x2="' + n2x + '" y2="' + n2y + '" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="' + hx + '" cy="' + hy + '" r="7.5" fill="' + YEL + '" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="' + ex + '" cy="' + ey + '" r="4" fill="' + INK + '" opacity=".55"/></g>';
  }
  function pencil(x, y) {
    return '<g transform="translate(' + x + ' ' + y + ') rotate(14)">' +
      '<rect x="-4.5" y="-42" width="9" height="36" rx="2" fill="' + YEL + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M-4.5 -42 L0 -53 L4.5 -42 Z" fill="#f3d9b1" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M-1.6 -48 L0 -53 L1.6 -48 Z" fill="' + INK + '"/></g>';
  }
  function face(mood) {
    const glow = (x) => '<circle cx="' + x + '" cy="76" r="10" fill="' + YEL + '" opacity=".18"/>';
    let eyes, mouth;
    if (mood === "cheer") {
      eyes = '<path d="M76 78 Q83 68 90 78 M110 78 Q117 68 124 78" fill="none" stroke="' + YEL + '" stroke-width="4.5" stroke-linecap="round"/>';
      mouth = '<path d="M89 86 Q100 98 111 86 Z" fill="' + PAPER + '"/>';
    } else if (mood === "kind") {
      eyes = glow(83) + glow(117) + '<g class="kr-eyes"><ellipse cx="83" cy="76" rx="6" ry="5" fill="' + YEL + '"/><ellipse cx="117" cy="76" rx="6" ry="5" fill="' + YEL + '"/></g>';
      mouth = '<path d="M92 88 Q100 93 108 88" fill="none" stroke="' + PAPER + '" stroke-width="3.2" stroke-linecap="round"/>';
    } else {
      eyes = glow(83) + glow(117) + '<g class="kr-eyes"><circle cx="83" cy="76" r="6.5" fill="' + YEL + '"/><circle cx="117" cy="76" r="6.5" fill="' + YEL + '"/></g>';
      mouth = mood === "teach"
        ? '<circle cx="100" cy="89" r="4.5" fill="' + PAPER + '"/>'
        : '<path d="M90 86 Q100 95 110 86" fill="none" stroke="' + PAPER + '" stroke-width="3.2" stroke-linecap="round"/>';
    }
    return eyes + mouth;
  }
  function head(mood) {
    return '<g class="kr-head">' +
      '<line x1="100" y1="46" x2="100" y2="30" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>' +
      '<rect x="93" y="25" width="14" height="7" rx="2.5" fill="' + INK + '"/>' +
      '<path d="M100 0 C104 6 110 12 110 19 C110 23 107 25 105 25 L95 25 C93 25 90 23 90 19 C90 12 96 6 100 0 Z" fill="' + YEL + '" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<path d="M100 3 L100 15" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/><circle cx="100" cy="17.5" r="2" fill="' + INK + '"/>' +
      '<rect x="38" y="62" width="11" height="22" rx="3" fill="' + YEL + '" stroke="' + INK + '" stroke-width="3"/>' +
      '<rect x="151" y="62" width="11" height="22" rx="3" fill="' + YEL + '" stroke="' + INK + '" stroke-width="3"/>' +
      '<rect x="48" y="46" width="104" height="58" rx="14" fill="' + BODY + '" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<rect x="59" y="56" width="82" height="40" rx="9" fill="' + DARK + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M63 92 L73 60" stroke="' + PAPER + '" stroke-width="6" opacity=".07" stroke-linecap="round"/>' +
      face(mood) +
      '<rect x="86" y="100" width="28" height="4" rx="2" fill="' + INK + '" opacity=".5"/></g>';
  }
  function sparkles() {
    const star = (x, y, s) => '<path d="M' + x + ' ' + (y - s) + ' Q' + x + ' ' + y + ' ' + (x + s) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y + s) + ' Q' + x + ' ' + y + ' ' + (x - s) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y - s) + 'Z" fill="' + YEL + '" stroke="' + INK + '" stroke-width="1.5"/>';
    return '<g class="kr-spark">' + star(22, 60, 9) + star(180, 52, 10) + star(172, 148, 7) + star(26, 140, 6) + '</g>';
  }
  function KRobot(mood, opts) {
    mood = ARMS[mood] ? mood : "happy";
    opts = opts || {};
    if (opts.head) return '<svg class="krobot kr-' + mood + '" viewBox="34 0 132 110" role="img" aria-label="Robot" xmlns="http://www.w3.org/2000/svg">' + head(mood) + '</svg>';
    const a = ARMS[mood];
    const tilt = mood === "kind" ? ' transform="rotate(-5 100 104)"' : "";
    return '<svg class="krobot kr-' + mood + '" viewBox="0 0 200 226" role="img" aria-label="Robot" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="100" cy="216" rx="42" ry="6" fill="' + INK + '" opacity=".12"/>' +
      '<g class="kr-body">' +
      // jalad
      seg(86, 178, 84, 198, 9) + seg(114, 178, 116, 198, 9) +
      '<rect x="70" y="196" width="30" height="12" rx="4" fill="' + INK + '"/><rect x="100" y="196" width="30" height="12" rx="4" fill="' + INK + '"/>' +
      arm(a.l, "kr-l") + (mood === "teach" ? pencil(a.r[4], a.r[5]) : "") + arm(a.r, "kr-r") +
      // kere
      '<rect x="66" y="112" width="68" height="68" rx="14" fill="' + BODY + '" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<rect x="78" y="124" width="44" height="30" rx="5" fill="' + PAPER + '"/>' +
      '<line x1="83" y1="133" x2="117" y2="133" stroke="' + LINE + '" stroke-width="2"/><line x1="83" y1="141" x2="117" y2="141" stroke="' + LINE + '" stroke-width="2"/>' +
      '<path d="M85 148 Q91 136 97 145 T109 139" fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="88" cy="167" r="3.5" fill="' + YEL + '" stroke="' + INK + '" stroke-width="2"/><circle cx="100" cy="167" r="3.5" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2"/><circle cx="112" cy="167" r="3.5" fill="' + YEL + '" stroke="' + INK + '" stroke-width="2"/>' +
      // kael
      '<rect x="92" y="100" width="16" height="6" rx="2" fill="' + INK + '"/><rect x="94" y="106" width="12" height="8" rx="2" fill="' + INK + '"/>' +
      '<g' + tilt + '>' + head(mood) + '</g>' +
      '<circle cx="62" cy="126" r="9" fill="' + BODY + '" stroke="' + INK + '" stroke-width="3"/><circle cx="138" cy="126" r="9" fill="' + BODY + '" stroke="' + INK + '" stroke-width="3"/>' +
      '</g>' + (mood === "cheer" ? sparkles() : "") + '</svg>';
  }
  window.KRobot = KRobot;
})();
