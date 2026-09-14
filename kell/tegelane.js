/* Kella maskott: kägu (nagu käokellas). Istub oksal.
 *
 * Soe oranž — panda on must-valge ja robot sinihall, seega on kolmik
 * värvi järgi eristatav ka väikeselt moodulikaardilt. Nime tal ei ole,
 * nagu ka teistel maskottidel (Silveri otsus 12. sept).
 * Asendi valis Silver 14. sept („võtame logoks oksal").
 *
 * MIKS PEA ON SELLINE, NAGU TA ON (ära joonista ringiga nägu tagasi):
 * esimene kägu luges kapuutsis inimesena, sest tal oli kreemikas ellips pea
 * sees — oranž rõngas ümber näo ongi parka siluett ja nokk heleda ketta
 * keskel istub seal, kus inimesel on nina. Kolm asja teevad temast linnu:
 *   1. nokk ulatub pea kontuurist VÄLJA (kolmveerandvaade, nokk paremale) —
 *      see on kõige suurema mõjuga üksik muudatus, sest ninal pole vastet,
 *      mis välja ulatuks;
 *   2. hele ala on alt lahtine kurk-ja-rind, mis jookseb lõuast kõhuni,
 *      mitte suletud näoketas;
 *   3. tutt kaldub taha, mitte otse üles.
 *
 * KKagu(mood, {head}) -> SVG-string. Ilmed: happy, wave, cheer, kind, teach.
 * Sama API mis KRobot ja panda.
 */
(function () {
  'use strict';

  var O = '#e58c3a', OT = '#c26b26', OD = '#a0531b', C = '#fce9d0',
      N = '#f8bb42', NT = '#d9962a', I = '#3a2413', W = '#fff',
      PUU = '#96602e';

  function silm(cx, cy, r) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + I + '"/>' +
      '<circle cx="' + (cx - r * 0.32) + '" cy="' + (cy - r * 0.36) + '" r="' + (r * 0.38) + '" fill="' + W + '"/>' +
      '<circle cx="' + (cx + r * 0.34) + '" cy="' + (cy + r * 0.34) + '" r="' + (r * 0.17) + '" fill="' + W + '" opacity=".75"/>';
  }
  function sulg(x, y, deg, sc) {
    return '<g transform="translate(' + x + ',' + y + ') rotate(' + deg + ') scale(' + sc + ')">' +
      '<path d="M0 0c-3-6-3-14 0-20 3 6 3 14 0 20z" fill="' + OT + '"/></g>';
  }

  var TUTT = sulg(51, 37, -55, 0.65) + sulg(54, 35, -35, 0.75) + sulg(58, 34, -15, 0.6);
  var PEA = '<circle cx="61" cy="52" r="19" fill="' + O + '"/>';
  /* Kurk ja rind on üks kuju, mis jookseb noka alt kõhuni. */
  var RIND = '<path d="M47 60C44 74 42 90 46 100C52 108 68 108 74 100C78 90 76 74 73 60C66 65 54 65 47 60z" fill="' + C + '"/>';
  /* Portreel jääb helest alast alles ainult kurgulapp, mis järgib pea alumist
     kaart servast servani. Kaks põhjust: avalehe kaardil on SVG-l
     `overflow:visible`, seega pikk rind ripuks kaardist välja (nägi välja nagu
     tilkuv põll), ja kaardi taust on ise kreemikas (#fbead9), kuhu üle ääre
     ulatuv rind lihtsalt kaoks. Kaarega kulgev lapp ei ole hõljuv ketas ega
     tekita külgedele kreemikaid nurki, mis loeksid teise nokana. */
  var KURK = '<path d="M44.9 62A19 19 0 0 0 77.1 62C70 68 52 68 44.9 62z" fill="' + C + '"/>';
  /* Alumine mokk on lühem ja jääb ülemise alla — muidu loeb kaheks nokaks. */
  var NOKK = '<path d="M70 50C78 49 85 52 90 56L72 60z" fill="' + N + '"/>' +
             '<path d="M70 60L81 58C78 62 74 63 69 62z" fill="' + NT + '"/>';

  function silmad(mood) {
    if (mood === 'cheer') {          // rõõmust kinni pigistatud silmad
      return '<path d="M63 48q5-5 10 0M50 49q4-4 8 0" fill="none" stroke="' + I +
             '" stroke-width="2.6" stroke-linecap="round"/>';
    }
    var d = mood === 'kind' ? 1 : 0;  // sõbralik ilme: silmad õrnalt allapoole
    return '<g class="kk-eyes">' + silm(68, 47 + d, 5.6) + silm(54, 48 + d, 4.2) + '</g>';
  }

  function pea(mood, bust) {
    var kalle = mood === 'kind' ? ' transform="rotate(-8 61 56)"' : '';
    return '<g class="kk-head"' + kalle + '>' + TUTT + PEA + (bust ? KURK : RIND) +
           NOKK + silmad(mood) + '</g>';
  }

  /* Lähem tiib istub keha peal; kaugem tiib tuleb välja ainult siis, kui ta
     midagi teeb (lehvitab, hõiskab, näitab). */
  var TIIB_L = '<path d="M44 80q-10 9-7 21 11 2 14-9z" fill="' + OT + '"/>';

  function tiibP(mood) {
    if (mood === 'wave') {
      return '<path class="kk-wing kk-wave" d="M77 84q15-5 20-17-11-4-20 7z" fill="' + OT + '"/>';
    }
    if (mood === 'cheer') {
      return '<path class="kk-wing" d="M77 82q13-10 12-23-11 1-16 13z" fill="' + OT + '"/>';
    }
    if (mood === 'teach') {
      return '<path class="kk-wing" d="M77 84q16-2 19-12-11-4-19 3z" fill="' + OT + '"/>';
    }
    return '';
  }

  function sadel(mood) {
    if (mood !== 'cheer') return '';
    return '<g class="kk-spark" fill="' + N + '">' +
      '<path d="M24 46l1.8 4.2 4.2 1.8-4.2 1.8L24 58l-1.8-4.2L18 52l4.2-1.8z"/>' +
      '<path d="M100 38l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z"/></g>';
  }

  function KKagu(mood, opts) {
    mood = mood || 'happy';
    opts = opts || {};

    /* Moodulikaardil on ainult portree: pea, nokk ja kurgulapp. Lõige on
       tahtlikult noka poole nihkes, et nokk jääks tervenisti sisse. */
    if (opts.head) {
      return '<svg class="kk kk-head-only" viewBox="38 19 58 58" role="img" ' +
             'aria-label="kägu" focusable="false">' + pea(mood, true) + '</svg>';
    }

    return '<svg class="kk" viewBox="0 0 120 120" role="img" aria-label="kägu" focusable="false">' +
      '<g class="kk-body">' +
      /* saba taha-ülesse, kahes sulekihis */
      '<path d="M52 92Q34 90 16 80q10 16 28 22 6 2 12 2z" fill="' + OD + '"/>' +
      '<path d="M52 82Q30 78 8 66q6 16 22 26 10 6 22 6z" fill="' + OT + '"/>' +
      '<ellipse cx="60" cy="88" rx="20" ry="19" fill="' + O + '"/>' +
      pea(mood) +
      TIIB_L + tiibP(mood) +
      '<path d="M54 105v5M50.8 110h6.4M68 105v5M64.8 110h6.4" stroke="' + N +
      '" stroke-width="3" stroke-linecap="round" fill="none"/>' +
      '</g>' +
      '<rect x="26" y="109" width="72" height="7" rx="3.5" fill="' + PUU + '"/>' +
      '<rect x="26" y="109" width="72" height="2.6" rx="1.3" fill="#fff" opacity=".18"/>' +
      sadel(mood) + '</svg>';
  }

  window.KKagu = KKagu;
})();
