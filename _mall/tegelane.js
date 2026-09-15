/* MALL: mooduli maskott. Täpike on lihtne ümar tegelane, et mall töötaks;
   päris moodul joonistab oma tegelase (vt kell/tegelane.js, teisendaja/tegelane.js).
   KTapike(meeleolu, { head }) → SVG-tekst.
   Meeleolud, mida tuum kasutab: wave (avaleht), happy, cheer (hea tulemus),
   kind (vihje ja madal tulemus). Vea peale ei ole tegelane kunagi kurb. */
(function () {
  function KTapike(mood, o) {
    o = o || {};
    var keha = '#b9a6f2', serv = '#6a52b8', tume = '#241645';
    var suu = mood === 'cheer'
      ? '<path d="M44 70 Q60 88 76 70 Z" fill="' + tume + '"/>'
      : mood === 'kind'
        ? '<path d="M48 72 Q60 79 72 72" stroke="' + tume + '" stroke-width="3" fill="none" stroke-linecap="round"/>'
        : '<path d="M46 70 Q60 82 74 70" stroke="' + tume + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
    var silmad = mood === 'cheer'
      ? '<path d="M38 56 Q44 49 50 56 M70 56 Q76 49 82 56" stroke="' + tume + '" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : '<g class="tp-silmad"><circle cx="44" cy="55" r="5" fill="' + tume + '"/><circle cx="76" cy="55" r="5" fill="' + tume + '"/></g>';
    var kaed = '';
    if (!o.head) {
      if (mood === 'wave') kaed = '<path d="M98 70 Q110 55 106 40" stroke="' + serv + '" stroke-width="7" fill="none" stroke-linecap="round"/>';
      else if (mood === 'cheer') kaed = '<path d="M22 70 Q10 55 14 40 M98 70 Q110 55 106 40" stroke="' + serv + '" stroke-width="7" fill="none" stroke-linecap="round"/>';
    }
    var vb = o.head ? '8 8 104 104' : '0 0 120 120';
    return '<svg class="tapike" viewBox="' + vb + '" role="img" aria-label="Täpike">' +
      kaed +
      '<circle cx="60" cy="62" r="42" fill="' + keha + '" stroke="' + serv + '" stroke-width="3"/>' +
      '<circle cx="36" cy="68" r="5" fill="#f4a3a0" opacity=".7"/><circle cx="84" cy="68" r="5" fill="#f4a3a0" opacity=".7"/>' +
      silmad + suu +
      '</svg>';
  }
  window.KTapike = KTapike;
})();
