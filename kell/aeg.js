/* Kell: eestikeelne kellaütlemine ja valikvastuste koostamine.
 *
 * Reeglid tulevad ÕS 2018-st, EKSS-ist ja Sõnaveebist (Fable'i ülevaatus,
 * 13. sept) — vt claude/kell-keelereeglid.md. Kõige tähtsam:
 *
 *   - eesti keel loeb JÄRGMISE täistunni poole: „pool neli" on 15.30,
 *     „veerand neli" 15.15 ja „kolmveerand neli" 15.45. Just see on lastele
 *     raske, sest osuti on veel kolme peal ja digikell näitab kolme.
 *   - 1–29 minutit: „viis minutit kolm läbi"
 *   - 31–59 minutit: „kahekümne minuti pärast neli"
 *   - „viis minutit pool neli läbi" on kõnekeelne ja mitmetähenduslik —
 *     seda ei kasutata ei vastuse ega eksitajana.
 *   - kellaaeg kirjutatakse punktiga: 3.45, mitte 3:45.
 */
(function () {
  'use strict';

  var TUND = ['', 'üks', 'kaks', 'kolm', 'neli', 'viis', 'kuus',
              'seitse', 'kaheksa', 'üheksa', 'kümme', 'üksteist', 'kaksteist'];
  var YKS = ['', 'üks', 'kaks', 'kolm', 'neli', 'viis', 'kuus', 'seitse', 'kaheksa', 'üheksa'];
  var YKS_OM = ['', 'ühe', 'kahe', 'kolme', 'nelja', 'viie', 'kuue', 'seitsme', 'kaheksa', 'üheksa'];

  function minNim(m) {                       // nimetav: läbi-vorm
    if (m < 10) return YKS[m];
    if (m === 10) return 'kümme';
    if (m < 20) return YKS[m - 10] + 'teist';
    if (m === 20) return 'kakskümmend';
    return 'kakskümmend ' + YKS[m - 20];
  }

  function minOm(m) {                        // omastav: pärast-vorm
    if (m < 10) return YKS_OM[m];
    if (m === 10) return 'kümne';
    if (m < 20) return YKS_OM[m - 10] + 'teistkümne';
    if (m === 20) return 'kahekümne';
    return 'kahekümne ' + YKS_OM[m - 20];
  }

  function h12(h) { return ((h + 11) % 12) + 1; }        // käesolev tund sihverplaadil
  function jargmine(h) { return ((h + 12) % 12) + 1; }   // järgmine tund

  /* Kanooniline vorm ilma „Kell on" eesliiteta. */
  function utle(h, m) {
    var a = TUND[h12(h)], b = TUND[jargmine(h)];
    if (m === 0) return a;
    if (m === 15) return 'veerand ' + b;
    if (m === 30) return 'pool ' + b;
    if (m === 45) return 'kolmveerand ' + b;
    if (m < 30) return minNim(m) + (m === 1 ? ' minut ' : ' minutit ') + a + ' läbi';
    return minOm(60 - m) + ' minuti pärast ' + b;
  }

  function kaks(n) { return (n < 10 ? '0' : '') + n; }
  function digi(h, m) { return h12(h) + '.' + kaks(m); }

  window.HAeg = { utle: utle, digi: digi, h12: h12, jargmine: jargmine };
})();
