/* Teisendaja ühikuredel. See on mooduli nägu samamoodi, nagu sihverplaat on
   Kella oma: vale vastuse järel näeb laps, mitu astet kahe ühiku vahel on ja
   mis tegur igal astmel kehtib.

   HRedel.svg("pikkus", { from:"km", to:"m" }) -> SVG string.

   Reeglid, mis siit välja ei tohi kaduda:
   - Redel joonistatakse ALATI tervikuna (kogu ahel), mitte ainult kaks ühikut.
     Mõte ongi selles, et laps näeb, kus need kaks ühikut teineteise suhtes on.
   - Aeg on kahes eraldi ahelas (s..nädal ja kuu..sajand) — joonistatakse see
     ahel, kus küsitud ühikud on.
   - Kontuurjoon on osa stiilist (vt claude/teisendaja-maskott.md).
*/
(function () {
  'use strict';

  var TINT = '#254d41', TAIDE = '#49a982', HELE = '#d9ecdf',
      ROHT = '#b9dca4', KOLL = '#f3c445', PAB = '#fffefa';

  var BOKS_L = 54, BOKS_K = 34, VAHE = 38, SERV = 10;

  function ahel(suurus, from, to) {
    var read = (window.TYhik && window.TYhik.redel(suurus)) || [];
    for (var i = 0; i < read.length; i++) {
      var on = {}, r = read[i];
      r.forEach(function (u) { on[u.t] = 1; });
      if ((!from || on[from]) && (!to || on[to])) return r;
    }
    return read[0] || [];
  }

  function vorm(n) {
    return (window.TYhik && window.TYhik.vorm) ? window.TYhik.vorm(n) : String(n);
  }

  function svg(suurus, o) {
    o = o || {};
    var rida = ahel(suurus, o.from, o.to);
    if (!rida.length) return '';
    var iF = -1, iT = -1;
    rida.forEach(function (u, i) { if (u.t === o.from) iF = i; if (u.t === o.to) iT = i; });
    var lo = Math.min(iF < 0 ? 0 : iF, iT < 0 ? 0 : iT);
    var hi = Math.max(iF, iT);

    var laius = rida.length * BOKS_L + (rida.length - 1) * VAHE + SERV * 2;
    var korgus = 86;
    var s = '<svg class="redel" viewBox="0 0 ' + laius + ' ' + korgus + '" role="img" aria-label="' +
      suurus + ' redel" focusable="false">';

    /* nooled ja tegurid astmete vahel */
    for (var i = 0; i < rida.length - 1; i++) {
      var x1 = SERV + (i + 1) * BOKS_L + i * VAHE;
      var x2 = x1 + VAHE;
      var y = 52;
      var aktiivne = (iF >= 0 && iT >= 0 && i >= lo && i < hi);
      var varv = aktiivne ? TINT : '#9fb8ac';
      var jamedus = aktiivne ? 3 : 2;
      s += '<path d="M' + (x1 + 4) + ' ' + y + 'H' + (x2 - 8) + '" stroke="' + varv +
        '" stroke-width="' + jamedus + '" fill="none" stroke-linecap="round"/>';
      s += '<path d="M' + (x2 - 11) + ' ' + (y - 4) + 'L' + (x2 - 5) + ' ' + y + 'L' +
        (x2 - 11) + ' ' + (y + 4) + 'Z" fill="' + varv + '"/>';
      s += '<text x="' + ((x1 + x2) / 2 - 1) + '" y="' + (y - 10) +
        '" text-anchor="middle" font-size="13" font-weight="' + (aktiivne ? '700' : '500') +
        '" fill="' + varv + '">×' + vorm(rida[i].samm) + '</text>';
    }

    /* ühikukastid */
    rida.forEach(function (u, i) {
      var x = SERV + i * (BOKS_L + VAHE);
      var y = 35;
      var seotud = (i === iF || i === iT);
      var vahel = (iF >= 0 && iT >= 0 && i > lo && i < hi);
      var taide = seotud ? KOLL : (vahel ? ROHT : HELE);
      s += '<rect x="' + x + '" y="' + y + '" width="' + BOKS_L + '" height="' + BOKS_K +
        '" rx="9" fill="' + taide + '" stroke="' + TINT + '" stroke-width="' +
        (seotud ? 3 : 2) + '"/>';
      s += '<text x="' + (x + BOKS_L / 2) + '" y="' + (y + 23) +
        '" text-anchor="middle" font-size="17" font-weight="' + (seotud ? '700' : '600') +
        '" fill="' + TINT + '">' + u.t + '</text>';
    });

    /* tegur otsast otsani, kui mõlemad ühikud on teada ja vahel on rohkem kui üks aste */
    if (iF >= 0 && iT >= 0 && hi - lo > 1 && window.TYhik) {
      var T = window.TYhik.tegur(o.from, o.to);
      if (T) {
        var xa = SERV + lo * (BOKS_L + VAHE) + BOKS_L / 2;
        var xb = SERV + hi * (BOKS_L + VAHE) + BOKS_L / 2;
        s += '<path d="M' + xa + ' 78 H' + xb + '" stroke="' + TINT +
          '" stroke-width="2" fill="none" stroke-linecap="round"/>';
        s += '<path d="M' + xa + ' 74 V82 M' + xb + ' 74 V82" stroke="' + TINT +
          '" stroke-width="2" stroke-linecap="round"/>';
        s += '<rect x="' + ((xa + xb) / 2 - 30) + '" y="70" width="60" height="16" rx="8" fill="' +
          PAB + '" stroke="' + TINT + '" stroke-width="2"/>';
        s += '<text x="' + ((xa + xb) / 2) + '" y="82" text-anchor="middle" font-size="12" ' +
          'font-weight="700" fill="' + TINT + '">×' + vorm(T.tegur) + '</text>';
      }
    }

    return s + '</svg>';
  }

  window.HRedel = { svg: svg, ahel: ahel };
})();
