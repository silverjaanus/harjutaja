/* Käo variandid Mia valikuks (2. ring).
   Sama soe oranž pere — panda on must-valge, robot sinihall, kägu oranž. */
(function () {
  'use strict';
  var O = '#e58c3a', OT = '#c26b26', OD = '#a0531b',
      C = '#fce9d0', N = '#f8bb42', ND = '#dd9420',
      I = '#3a2413', W = '#fff', PUU = '#96602e', PUU_T = '#70461f', PIME = '#4a2f16';

  function silm(cx, cy, r) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + I + '"/>' +
      '<circle cx="' + (cx - r * 0.32) + '" cy="' + (cy - r * 0.36) + '" r="' + (r * 0.38) + '" fill="' + W + '"/>' +
      '<circle cx="' + (cx + r * 0.34) + '" cy="' + (cy + r * 0.34) + '" r="' + (r * 0.17) + '" fill="' + W + '" opacity=".75"/>';
  }
  function nokk(cx, y, w, h) {
    return '<path d="M' + (cx - w) + ' ' + y + 'h' + (2 * w) + 'l-' + w + ' ' + h + 'z" fill="' + N + '"/>' +
      '<path d="M' + (cx - w) + ' ' + y + 'h' + (2 * w) + 'l-' + (w * 0.5) + ' ' + (h * 0.3) + 'h-' + w + 'z" fill="' + ND + '"/>';
  }
  function tutt(cx, y, k) {
    k = k || 1;
    return '<g fill="' + OT + '">' +
      '<path d="M' + (cx - 1) + ' ' + y + 'q-3-' + (8 * k) + ' -9-' + (9 * k) + ' 2 ' + (7 * k) + ' 6 ' + (9 * k) + 'z"/>' +
      '<path d="M' + cx + ' ' + (y - 1) + 'q-1.5-' + (11 * k) + ' 0-' + (14 * k) + ' 3 ' + (9 * k) + ' 1 ' + (14 * k) + 'z"/>' +
      '<path d="M' + (cx + 1) + ' ' + y + 'q3-' + (8 * k) + ' 9-' + (9 * k) + ' -2 ' + (7 * k) + ' -6 ' + (9 * k) + 'z"/></g>';
  }
  function jalg(x, y, h) {
    return '<path d="M' + x + ' ' + y + 'v' + h + 'M' + (x - 3.2) + ' ' + (y + h) + 'h6.4" stroke="' + N +
      '" stroke-width="3" stroke-linecap="round" fill="none"/>';
  }
  window.KV = { O: O, OT: OT, OD: OD, C: C, N: N, ND: ND, I: I, W: W,
                PUU: PUU, PUU_T: PUU_T, PIME: PIME,
                silm: silm, nokk: nokk, tutt: tutt, jalg: jalg, V: {} };
})();

/* A. Käokellalind — istub oksal, pikk saba taha-alla vasakule. */
(function () {
  var K = window.KV;
  K.V.A = function (head) {
    var pea = '<g>' + K.tutt(64, 34) +
      '<circle cx="64" cy="50" r="18" fill="' + K.O + '"/>' +
      '<ellipse cx="64" cy="53" rx="13" ry="11.5" fill="' + K.C + '"/>' +
      '<g class="kk-eyes">' + K.silm(58, 50, 4.4) + K.silm(70, 50, 4.4) + '</g>' +
      K.nokk(64, 58, 5.5, 8) + '</g>';
    if (head) return pea;
    return '<g>' +
      /* saba: kolm sulge, algavad keha alt */
      '<path d="M52 86Q34 84 16 74q10 16 28 22 6 2 12 2z" fill="' + K.OD + '"/>' +
      '<path d="M52 76Q30 72 8 60q6 16 22 26 10 6 22 6z" fill="' + K.OT + '"/>' +
      '<path d="M18 70q10 12 24 18" stroke="' + K.OD + '" stroke-width="1.5" fill="none" opacity=".4"/>' +
      '<ellipse cx="64" cy="82" rx="18" ry="20" fill="' + K.O + '"/>' +
      '<ellipse cx="66" cy="86" rx="11.5" ry="13" fill="' + K.C + '"/>' +
      '<path d="M57 72q-10 9-7 22 11 2 15-9z" fill="' + K.OT + '"/>' +
      '<path d="M55 80q-4 7-2 13" stroke="' + K.OD + '" stroke-width="1.5" fill="none" opacity=".5"/>' +
      K.jalg(59, 100, 6) + K.jalg(71, 100, 6) +
      '<rect x="26" y="106" width="72" height="7" rx="3.5" fill="' + K.PUU + '"/>' +
      '<rect x="26" y="106" width="72" height="2.6" rx="1.3" fill="#fff" opacity=".18"/>' +
      pea + '</g>';
  };
})();

/* B. Pehme kägu — ümar, suur pea, tiivad keha vastu. */
(function () {
  var K = window.KV;
  K.V.B = function (head) {
    var pea = '<g>' + K.tutt(60, 30, 0.8) +
      '<circle cx="60" cy="50" r="22" fill="' + K.O + '"/>' +
      '<ellipse cx="60" cy="54" rx="16.5" ry="14" fill="' + K.C + '"/>' +
      '<g class="kk-eyes">' + K.silm(53, 50, 5.6) + K.silm(67, 50, 5.6) + '</g>' +
      '<ellipse cx="43.5" cy="59" rx="4" ry="2.6" fill="#ef9c9c" opacity=".5"/>' +
      '<ellipse cx="76.5" cy="59" rx="4" ry="2.6" fill="#ef9c9c" opacity=".5"/>' +
      K.nokk(60, 60, 5, 6.5) + '</g>';
    if (head) return pea;
    return '<g>' +
      '<path d="M70 96q13 6 14 15-11 3-17-6z" fill="' + K.OD + '"/>' +
      '<ellipse cx="60" cy="88" rx="22" ry="19" fill="' + K.O + '"/>' +
      '<ellipse cx="60" cy="92" rx="14" ry="13" fill="' + K.C + '"/>' +
      '<path d="M45 80q-8 7-5 17 8 2 11-7z" fill="' + K.OT + '"/>' +
      '<path d="M75 80q8 7 5 17-8 2-11-7z" fill="' + K.OT + '"/>' +
      K.jalg(53, 104, 5) + K.jalg(67, 104, 5) +
      pea + '</g>';
  };
})();

/* C. Sulesaba — sihvakas, triibud rinnal, pikk saba alla paremale. */
(function () {
  var K = window.KV;
  K.V.C = function (head) {
    var pea = '<g>' + K.tutt(60, 30, 1.2) +
      '<circle cx="60" cy="47" r="17" fill="' + K.O + '"/>' +
      '<ellipse cx="60" cy="50" rx="12.5" ry="11" fill="' + K.C + '"/>' +
      '<g class="kk-eyes">' + K.silm(54, 46, 4.3) + K.silm(66, 46, 4.3) + '</g>' +
      K.nokk(60, 55, 5, 9) + '</g>';
    if (head) return pea;
    return '<g>' +
      '<path d="M68 88q20 10 26 24-10 5-19-4z" fill="' + K.OD + '"/>' +
      '<path d="M66 86q17 10 22 23-9 4-17-5z" fill="' + K.OT + '"/>' +
      '<path d="M72 94q9 8 12 16" stroke="' + K.OD + '" stroke-width="1.6" fill="none" opacity=".45"/>' +
      '<path d="M60 60c12 0 18 12 18 23s-8 19-18 19-18-8-18-19 6-23 18-23z" fill="' + K.O + '"/>' +
      '<ellipse cx="59" cy="84" rx="11" ry="15" fill="' + K.C + '"/>' +
      '<path d="M45 72q-9 10-5 23 10 1 13-10z" fill="' + K.OT + '"/>' +
      '<path d="M44 80q-3 8-1 14" stroke="' + K.OD + '" stroke-width="1.5" fill="none" opacity=".45"/>' +
      K.jalg(54, 101, 6) + K.jalg(66, 101, 6) +
      pea + '</g>';
  };
})();

/* D. Kellauks — kägu piilub käokella uksest välja. */
(function () {
  var K = window.KV;
  K.V.D = function (head) {
    var pea = '<g>' + K.tutt(60, 34, 0.85) +
      '<circle cx="60" cy="52" r="19" fill="' + K.O + '"/>' +
      '<ellipse cx="60" cy="55" rx="14" ry="12" fill="' + K.C + '"/>' +
      '<g class="kk-eyes">' + K.silm(54, 52, 4.8) + K.silm(66, 52, 4.8) + '</g>' +
      K.nokk(60, 60, 5.2, 7.5) + '</g>';
    if (head) return pea;
    return '<g>' +
      '<path d="M12 106V54a48 48 0 0 1 96 0v52z" fill="' + K.PUU + '"/>' +
      '<path d="M23 106V55a37 37 0 0 1 74 0v51z" fill="#5d3c1d"/>' +
      '<ellipse cx="60" cy="94" rx="20" ry="16" fill="' + K.O + '"/>' +
      '<ellipse cx="60" cy="98" rx="12.5" ry="11" fill="' + K.C + '"/>' +
      '<path d="M43 88q-9 5-7 14 9 2 12-7z" fill="' + K.OT + '"/>' +
      '<path d="M77 88q9 5 7 14-9 2-12-7z" fill="' + K.OT + '"/>' +
      pea +
      '<rect x="4" y="103" width="112" height="10" rx="4" fill="' + K.PUU + '"/>' +
      '<rect x="4" y="103" width="112" height="3" rx="1.5" fill="#fff" opacity=".18"/>' +
      '</g>';
  };
})();

/* E. Lendaja — tiivad laiali, sulgede otsad näha. */
(function () {
  var K = window.KV;
  function tiib(peegel) {
    var g = peegel ? ' transform="translate(120,0) scale(-1,1)"' : '';
    return '<g' + g + '>' +
      '<path d="M47 74C36 62 20 58 9 64q-3 2-1 5c4 7 11 12 19 15q-4 3-4 6 0 2 3 2l8-2q-1 4 1 6 2 2 4 0l10-11z" fill="' + K.OT + '"/>' +
      '<path d="M43 72C33 64 21 61 12 64" stroke="' + K.C + '" stroke-width="2" fill="none" opacity=".45"/>' +
      '<path d="M28 84l7-5M34 89l7-6" stroke="' + K.OD + '" stroke-width="1.6" stroke-linecap="round" opacity=".45"/>' +
      '</g>';
  }
  K.V.E = function (head) {
    var pea = '<g>' + K.tutt(60, 32, 0.9) +
      '<circle cx="60" cy="50" r="19" fill="' + K.O + '"/>' +
      '<ellipse cx="60" cy="53" rx="14" ry="12" fill="' + K.C + '"/>' +
      '<g class="kk-eyes">' + K.silm(54, 50, 4.8) + K.silm(66, 50, 4.8) + '</g>' +
      K.nokk(60, 58, 5.2, 7) + '</g>';
    if (head) return pea;
    return '<g>' +
      '<path d="M60 92q-10 12-9 22 4 3 9-2 5 5 9 2 1-10-9-22z" fill="' + K.OD + '"/>' +
      '<path d="M60 94v18" stroke="' + K.OT + '" stroke-width="1.8" opacity=".55"/>' +
      tiib(false) + tiib(true) +
      '<ellipse cx="60" cy="82" rx="17" ry="17" fill="' + K.O + '"/>' +
      '<ellipse cx="60" cy="85" rx="11" ry="11.5" fill="' + K.C + '"/>' +
      pea + '</g>';
  };
})();
