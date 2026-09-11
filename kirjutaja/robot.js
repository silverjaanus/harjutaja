/* Kirjutaja maskott: joonestusrobot. Antenn on sulepea, kõhul vihikuleht.
   KRobot(mood, {head}) tagastab SVG-teksti. Ilmed: happy, wave, cheer, kind, teach.
   head:true annab ainult pea väikestesse kohtadesse (vihjekast). */
(function () {
  const INK = "#1d2f4f", BODY = "#1f5c99", SCREEN = "#fdfdfa", YEL = "#ffd166", LINE = "#9fbde6";
  const ARMS = {
    happy: [[46, 170], [154, 170]],
    wave:  [[46, 170], [164, 98]],
    cheer: [[34, 100], [166, 100]],
    kind:  [[48, 168], [152, 168]],
    teach: [[46, 170], [160, 104]]
  };
  function arm(side, sx, sy, hx, hy, cls) {
    return '<g class="kr-arm ' + cls + '" style="transform-origin:' + sx + 'px ' + sy + 'px">' +
      '<line x1="' + sx + '" y1="' + sy + '" x2="' + hx + '" y2="' + hy + '" stroke="' + INK + '" stroke-width="17" stroke-linecap="round"/>' +
      '<line x1="' + sx + '" y1="' + sy + '" x2="' + hx + '" y2="' + hy + '" stroke="' + BODY + '" stroke-width="11" stroke-linecap="round"/>' +
      '<circle cx="' + hx + '" cy="' + hy + '" r="9" fill="' + YEL + '" stroke="' + INK + '" stroke-width="3"/></g>';
  }
  function pencil(x, y) {
    // pliiats käes, ots üles
    return '<g transform="translate(' + x + ' ' + y + ') rotate(12)">' +
      '<rect x="-5" y="-40" width="10" height="34" rx="2" fill="' + YEL + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M-5 -40 L0 -52 L5 -40 Z" fill="#f3d9b1" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M-1.8 -47 L0 -52 L1.8 -47 Z" fill="' + INK + '"/>' +
      '<rect x="-5" y="-8" width="10" height="5" fill="#e8a0a0" stroke="' + INK + '" stroke-width="2"/></g>';
  }
  function face(mood) {
    let eyes, mouth, extra = "";
    if (mood === "cheer") {
      eyes = '<path d="M75 80 Q82 70 89 80 M111 80 Q118 70 125 80" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>';
      mouth = '<path d="M88 88 Q100 102 112 88 Z" fill="' + INK + '"/><path d="M93 93 Q100 99 107 93" fill="#e8a0a0"/>';
    } else if (mood === "kind") {
      eyes = '<g class="kr-eyes"><ellipse cx="82" cy="80" rx="5.5" ry="6.5" fill="' + INK + '"/><ellipse cx="118" cy="80" rx="5.5" ry="6.5" fill="' + INK + '"/>' +
        '<circle cx="84" cy="78" r="1.8" fill="#fff"/><circle cx="120" cy="78" r="1.8" fill="#fff"/></g>';
      extra = '<path d="M74 70 L87 66 M113 66 L126 70" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
      mouth = '<path d="M92 93 Q100 98 108 93" fill="none" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>';
    } else {
      eyes = '<g class="kr-eyes"><ellipse cx="82" cy="79" rx="6.5" ry="8.5" fill="' + INK + '"/><ellipse cx="118" cy="79" rx="6.5" ry="8.5" fill="' + INK + '"/>' +
        '<circle cx="84.5" cy="76" r="2.4" fill="#fff"/><circle cx="120.5" cy="76" r="2.4" fill="#fff"/></g>';
      mouth = mood === "teach"
        ? '<ellipse cx="100" cy="94" rx="6" ry="5" fill="' + INK + '"/>'
        : '<path d="M89 91 Q100 101 111 91" fill="none" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>';
    }
    return extra + eyes + mouth +
      '<circle cx="69" cy="91" r="5.5" fill="' + YEL + '" opacity=".85"/><circle cx="131" cy="91" r="5.5" fill="' + YEL + '" opacity=".85"/>';
  }
  function head(mood) {
    return '<g class="kr-head">' +
      // antenn: sulepea (kuldne suletera, ots üleval)
      '<line x1="100" y1="44" x2="100" y2="30" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>' +
      '<rect x="93" y="25" width="14" height="7" rx="2.5" fill="' + INK + '"/>' +
      '<path d="M100 0 C104 6 110 12 110 19 C110 23 107 25 105 25 L95 25 C93 25 90 23 90 19 C90 12 96 6 100 0 Z" fill="' + YEL + '" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<path d="M100 3 L100 15" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>' +
      '<circle cx="100" cy="17.5" r="2" fill="' + INK + '"/>' +
      '<path d="M93.5 21.5 Q100 19 106.5 21.5" fill="none" stroke="' + INK + '" stroke-width="1.4" opacity=".6"/>' +
      '<circle cx="44" cy="80" r="7" fill="' + YEL + '" stroke="' + INK + '" stroke-width="3"/><circle cx="156" cy="80" r="7" fill="' + YEL + '" stroke="' + INK + '" stroke-width="3"/>' +
      '<rect x="46" y="44" width="108" height="72" rx="24" fill="' + BODY + '" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<rect x="57" y="55" width="86" height="50" rx="15" fill="' + SCREEN + '"/>' +
      face(mood) + '</g>';
  }
  function sparkles() {
    const star = (x, y, s) => '<path d="M' + x + ' ' + (y - s) + ' Q' + x + ' ' + y + ' ' + (x + s) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y + s) + ' Q' + x + ' ' + y + ' ' + (x - s) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y - s) + 'Z" fill="' + YEL + '" stroke="' + INK + '" stroke-width="1.5"/>';
    return '<g class="kr-spark">' + star(24, 58, 9) + star(178, 50, 11) + star(170, 150, 7) + star(28, 140, 6) + '</g>';
  }
  function KRobot(mood, opts) {
    mood = ARMS[mood] ? mood : "happy";
    opts = opts || {};
    if (opts.head) {
      return '<svg class="krobot kr-' + mood + '" viewBox="34 0 132 122" role="img" aria-label="Robot" xmlns="http://www.w3.org/2000/svg">' + head(mood) + '</svg>';
    }
    const [L, R] = ARMS[mood];
    const tilt = mood === "kind" ? ' transform="rotate(-7 100 116)"' : "";
    return '<svg class="krobot kr-' + mood + '" viewBox="0 0 200 222" role="img" aria-label="Robot" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="100" cy="212" rx="48" ry="6" fill="' + INK + '" opacity=".12"/>' +
      '<g class="kr-body">' +
      '<rect x="70" y="186" width="24" height="16" rx="7" fill="' + INK + '"/><rect x="106" y="186" width="24" height="16" rx="7" fill="' + INK + '"/>' +
      arm("l", 62, 136, L[0], L[1], "kr-l") +
      (mood === "teach" ? pencil(R[0], R[1]) : "") +
      arm("r", 138, 136, R[0], R[1], "kr-r") +
      '<rect x="58" y="118" width="84" height="74" rx="20" fill="' + BODY + '" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<rect x="73" y="132" width="54" height="40" rx="8" fill="' + SCREEN + '"/>' +
      '<line x1="79" y1="143" x2="121" y2="143" stroke="' + LINE + '" stroke-width="2"/><line x1="79" y1="152" x2="121" y2="152" stroke="' + LINE + '" stroke-width="2"/><line x1="79" y1="161" x2="121" y2="161" stroke="' + LINE + '" stroke-width="2"/>' +
      '<path d="M82 159 Q88 146 94 156 T106 150" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<rect x="90" y="108" width="20" height="12" rx="3" fill="' + INK + '"/>' +
      '<g' + tilt + '>' + head(mood) + '</g>' +
      '</g>' + (mood === "cheer" ? sparkles() : "") + '</svg>';
  }
  window.KRobot = KRobot;
})();
