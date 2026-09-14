/* Käo variandid Mia valikuks (3. ring).
 *
 * Pea on kõigil sama ja see on nüüd otsustatud kuju — Fable'i geomeetria pärast
 * Silveri tagasisidet „käo pea on imelik, nagu kapuuts oleks peas". Kolm asja
 * teevad temast linnu, mitte kapuutsis inimese:
 *   1. nokk ulatub pea kontuurist VÄLJA (kolmveerandvaade, nokk paremale),
 *   2. hele ala on alt lahtine kurk-ja-rind, mitte suletud näoketas,
 *   3. tutt kaldub taha, mitte otse üles.
 * Variandid erinevad ainult kehaasendist.
 */
(function () {
  'use strict';
  var O = '#e58c3a', OT = '#c26b26', OD = '#a0531b', C = '#fce9d0',
      N = '#f8bb42', NT = '#d9962a', I = '#3a2413', W = '#fff',
      PUU = '#96602e', PUU_T = '#70461f';

  function silm(cx, cy, r) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + I + '"/>' +
      '<circle cx="' + (cx - r * 0.32) + '" cy="' + (cy - r * 0.36) + '" r="' + (r * 0.38) + '" fill="' + W + '"/>' +
      '<circle cx="' + (cx + r * 0.34) + '" cy="' + (cy + r * 0.34) + '" r="' + (r * 0.17) + '" fill="' + W + '" opacity=".75"/>';
  }
  function sulg(x, y, deg, sc) {
    return '<g transform="translate(' + x + ',' + y + ') rotate(' + deg + ') scale(' + sc + ')">' +
      '<path d="M0 0c-3-6-3-14 0-20 3 6 3 14 0 20z" fill="' + OT + '"/></g>';
  }
  function jalg(x, y, h) {
    return '<path d="M' + x + ' ' + y + 'v' + h + 'M' + (x - 3.2) + ' ' + (y + h) + 'h6.4" stroke="' + N +
      '" stroke-width="3" stroke-linecap="round" fill="none"/>';
  }

  var TUTT = sulg(51, 37, -55, 0.65) + sulg(54, 35, -35, 0.75) + sulg(58, 34, -15, 0.6);
  var PEA = '<circle cx="61" cy="52" r="19" fill="' + O + '"/>';
  /* Kurk ja rind on üks kuju, mis jookseb noka alt kõhuni. */
  var RIND = '<path d="M47 60C44 74 42 90 46 100C52 108 68 108 74 100C78 90 76 74 73 60C66 65 54 65 47 60z" fill="' + C + '"/>';
  var NOKK = '<path d="M70 50C78 49 85 52 90 56L72 60z" fill="' + N + '"/>' +
             '<path d="M70 60L81 58C78 62 74 63 69 62z" fill="' + NT + '"/>';
  var SILMAD = '<g class="kk-eyes">' + silm(68, 47, 5.6) + silm(54, 48, 4.2) + '</g>';

  function pea() { return TUTT + PEA + RIND + NOKK + SILMAD; }

  window.KV = { O: O, OT: OT, OD: OD, C: C, N: N, NT: NT, I: I, W: W,
                PUU: PUU, PUU_T: PUU_T, silm: silm, sulg: sulg, jalg: jalg,
                TUTT: TUTT, PEA: PEA, RIND: RIND, NOKK: NOKK, SILMAD: SILMAD,
                pea: pea, V: {} };
})();

/* Viis kehaasendit ühe ja sama pea all. */
(function () {
  var K = window.KV;
  function lind(taga, keha, ees) {
    return '<g>' + (taga || '') + keha + K.TUTT + K.PEA + K.RIND +
           (ees || '') + K.NOKK + K.SILMAD + '</g>';
  }

  /* A — istub oksal, pikk saba taha-ülesse. */
  K.V.A = function (head) {
    if (head) return K.pea();
    return lind(
      '<path d="M52 92Q34 90 16 80q10 16 28 22 6 2 12 2z" fill="' + K.OD + '"/>' +
      '<path d="M52 82Q30 78 8 66q6 16 22 26 10 6 22 6z" fill="' + K.OT + '"/>',
      '<ellipse cx="60" cy="88" rx="20" ry="19" fill="' + K.O + '"/>',
      '<path d="M44 80q-10 9-7 21 11 2 14-9z" fill="' + K.OT + '"/>' +
      K.jalg(54, 105, 5) + K.jalg(68, 105, 5) +
      '<rect x="26" y="109" width="72" height="7" rx="3.5" fill="' + K.PUU + '"/>' +
      '<rect x="26" y="109" width="72" height="2.6" rx="1.3" fill="#fff" opacity=".18"/>');
  };

  /* B — ümar ja pehme. */
  K.V.B = function (head) {
    if (head) return K.pea();
    return lind(
      '<path d="M76 98q13 6 14 15-11 3-17-6z" fill="' + K.OD + '"/>',
      '<ellipse cx="60" cy="90" rx="23" ry="20" fill="' + K.O + '"/>',
      '<path d="M43 82q-9 7-6 18 9 2 12-8z" fill="' + K.OT + '"/>' +
      '<path d="M79 84q9 7 6 17-9 2-12-8z" fill="' + K.OT + '"/>' +
      K.jalg(53, 107, 4) + K.jalg(67, 107, 4));
  };

  /* C — sihvakas, pikk saba alla paremale. */
  K.V.C = function (head) {
    if (head) return K.pea();
    return lind(
      '<path d="M68 92q20 10 26 24-10 5-19-4z" fill="' + K.OD + '"/>' +
      '<path d="M66 90q17 10 22 23-9 4-17-5z" fill="' + K.OT + '"/>',
      '<path d="M60 64c13 0 19 13 19 24s-8 20-19 20-19-9-19-20 6-24 19-24z" fill="' + K.O + '"/>',
      '<path d="M44 76q-9 10-5 23 10 1 13-10z" fill="' + K.OT + '"/>' +
      K.jalg(54, 106, 5) + K.jalg(66, 106, 5));
  };

  /* D — kellauksest piiluv. */
  K.V.D = function (head) {
    if (head) return K.pea();
    return lind(
      '<path d="M12 106V54a48 48 0 0 1 96 0v52z" fill="' + K.PUU + '"/>' +
      '<path d="M23 106V55a37 37 0 0 1 74 0v51z" fill="#5d3c1d"/>',
      '<ellipse cx="60" cy="92" rx="21" ry="17" fill="' + K.O + '"/>',
      '<path d="M41 84q-10 6-8 16 10 2 13-8z" fill="' + K.OT + '"/>' +
      '<path d="M79 84q10 6 8 16-10 2-13-8z" fill="' + K.OT + '"/>' +
      '<rect x="4" y="103" width="112" height="10" rx="4" fill="' + K.PUU + '"/>' +
      '<rect x="4" y="103" width="112" height="3" rx="1.5" fill="#fff" opacity=".18"/>');
  };

  /* E — lendaja, tiivad laiali. */
  K.V.E = function (head) {
    if (head) return K.pea();
    function tiib(peegel) {
      var g = peegel ? ' transform="translate(120,0) scale(-1,1)"' : '';
      return '<g' + g + '>' +
        '<path d="M47 82C36 70 20 66 9 72q-3 2-1 5c4 7 11 12 19 15q-4 3-4 6 0 2 3 2l8-2q-1 4 1 6 2 2 4 0l10-11z" fill="' + K.OT + '"/>' +
        '<path d="M43 80C33 72 21 69 12 72" stroke="' + K.C + '" stroke-width="2" fill="none" opacity=".45"/>' +
        '</g>';
    }
    return lind(
      '<path d="M60 98q-10 12-9 22 4 3 9-2 5 5 9 2 1-10-9-22z" fill="' + K.OD + '"/>' +
      tiib(false) + tiib(true),
      '<ellipse cx="60" cy="88" rx="18" ry="18" fill="' + K.O + '"/>', '');
  };
})();
