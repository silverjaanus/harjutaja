/* Teisendaja - mootuhikute loogika. Ei puuduta DOM-i: jookseb nii brauseris
   (window.TYhik) kui node-is (module.exports). Test: node teisendaja/yhik.test.js

   REEGLID, MIS SIIT VALJA EI TOHI KADUDA (allikad: claude/teisendaja-plaan.md)

   1. Tase jargib oppekava, mitte tunnet. 1 = 2. klass, 2 = 3. klass, 3 = 4. klass,
      4 = 5. klass. Iga taseme lubatud uhikupaarid on siin failis nimekirjana, mitte
      reeglina - "valdavalt ainult naaberuhikud" (I kooliaste) ei ole valemiga kirjeldatav.
   2. Komaga arve enne taset 4 ei ole. Kolmandas klassis oeldakse "2 kg 500 g",
      mitte "2,5 kg" - kumnendmurrud on 5. klassi teema.
   3. Pindala ja ruumala on ainult tasemel 4.
   4. Ajauhikud ei ole kumnendsusteemis ja kuu pikkus ei ole pusiv. Seeparast on
      aeg kahes eraldi ahelas (s..nadal ja kuu..sajand) ning nende vahel ei teisendata.
   5. Uhikute tahised on tahised, mitte luhendid: punktita, kaandeloputa. Sekund on s,
      mitte "sek". Sendil ametlikku tahist ei ole, seega on ta sonaga "senti".
      Nadal, kuu, aasta ja sajand kirjutatakse sonaga - "a" on SI-s aar, mitte aasta.
   6. Kumnendkoht on koma, mitte punkt. Tuhandelised ruhmitatakse sitkuva tuhikuga
      alates viiekohalisest arvust ("10 000 m"), neljakohaline jaab kokku ("1000 m").
   7. Vale vastus diagnoositakse. Laps kirjutab arvu ise, seega mang naeb, MILLISE vea
      ta tegi (vale suund, puuduvad nullid, kadunud null kohavaartuses) ja vihje nimetab
      selle. See on kogu mooduli moote - vt diagnoosi().
   8. id ja lemma on molemad OSKUS (uhikupaar), mitte uksik ulesanne. HEngine kirjutab
      statistika id jargi; Kellas laks see korra valesti ja kaart ei lainud kunagi
      roheliseks. Teisendajas on oskus "km>m", mitte "3 km = 3000 m".
*/
(function (root) {
  'use strict';

  /* Uhikuahelad. Iga kirje on [tahis, kordaja jargmise uhikuni]. Viimasel kordajat ei ole. */
  var AHELAD = {
    pikkus:  [[['mm', 10], ['cm', 10], ['dm', 10], ['m', 1000], ['km', null]]],
    mass:    [[['g', 1000], ['kg', 1000], ['t', null]]],
    maht:    [[['ml', 10], ['cl', 10], ['dl', 10], ['l', null]]],
    aeg:     [[['s', 60], ['min', 60], ['h', 24], ['ööpäev', 7], ['nädal', null]],
              [['kuu', 12], ['aasta', 100], ['sajand', null]]],
    raha:    [[['senti', 100], ['€', null]]],
    pindala: [[['mm²', 100], ['cm²', 100], ['dm²', 100], ['m²', 100],
               ['a', 100], ['ha', 100], ['km²', null]]],
    ruumala: [[['mm³', 1000], ['cm³', 1000], ['dm³', 1000], ['m³', null]]]
  };

  /* Uhiku eestikeelsed vormid. Vihjelause vajab elatiivi ja terminatiivi
     ("kilomeetrist meetrini"), tagasiside osastavat ("3000 grammi"). */
  var NIMI = {
    'mm':  ['millimeeter', 'millimeetrist', 'millimeetrini', 'millimeetrit'],
    'cm':  ['sentimeeter', 'sentimeetrist', 'sentimeetrini', 'sentimeetrit'],
    'dm':  ['detsimeeter', 'detsimeetrist', 'detsimeetrini', 'detsimeetrit'],
    'm':   ['meeter', 'meetrist', 'meetrini', 'meetrit'],
    'km':  ['kilomeeter', 'kilomeetrist', 'kilomeetrini', 'kilomeetrit'],
    'g':   ['gramm', 'grammist', 'grammini', 'grammi'],
    'kg':  ['kilogramm', 'kilogrammist', 'kilogrammini', 'kilogrammi'],
    't':   ['tonn', 'tonnist', 'tonnini', 'tonni'],
    'ml':  ['milliliiter', 'milliliitrist', 'milliliitrini', 'milliliitrit'],
    'cl':  ['sentiliiter', 'sentiliitrist', 'sentiliitrini', 'sentiliitrit'],
    'dl':  ['detsiliiter', 'detsiliitrist', 'detsiliitrini', 'detsiliitrit'],
    'l':   ['liiter', 'liitrist', 'liitrini', 'liitrit'],
    's':   ['sekund', 'sekundist', 'sekundini', 'sekundit'],
    'min': ['minut', 'minutist', 'minutini', 'minutit'],
    'h':   ['tund', 'tunnist', 'tunnini', 'tundi'],
    'ööpäev': ['ööpäev', 'ööpäevast', 'ööpäevani', 'ööpäeva'],
    'nädal':  ['nädal', 'nädalast', 'nädalani', 'nädalat'],
    'kuu':    ['kuu', 'kuust', 'kuuni', 'kuud'],
    'aasta':  ['aasta', 'aastast', 'aastani', 'aastat'],
    'sajand': ['sajand', 'sajandist', 'sajandini', 'sajandit'],
    'senti':  ['sent', 'sendist', 'sendini', 'senti'],
    '€':      ['euro', 'eurost', 'euroni', 'eurot'],
    'mm²': ['ruutmillimeeter', 'ruutmillimeetrist', 'ruutmillimeetrini', 'ruutmillimeetrit'],
    'cm²': ['ruutsentimeeter', 'ruutsentimeetrist', 'ruutsentimeetrini', 'ruutsentimeetrit'],
    'dm²': ['ruutdetsimeeter', 'ruutdetsimeetrist', 'ruutdetsimeetrini', 'ruutdetsimeetrit'],
    'm²':  ['ruutmeeter', 'ruutmeetrist', 'ruutmeetrini', 'ruutmeetrit'],
    'a':   ['aar', 'aarist', 'aarini', 'aari'],
    'ha':  ['hektar', 'hektarist', 'hektarini', 'hektarit'],
    'km²': ['ruutkilomeeter', 'ruutkilomeetrist', 'ruutkilomeetrini', 'ruutkilomeetrit'],
    'mm³': ['kuupmillimeeter', 'kuupmillimeetrist', 'kuupmillimeetrini', 'kuupmillimeetrit'],
    'cm³': ['kuupsentimeeter', 'kuupsentimeetrist', 'kuupsentimeetrini', 'kuupsentimeetrit'],
    'dm³': ['kuupdetsimeeter', 'kuupdetsimeetrist', 'kuupdetsimeetrini', 'kuupdetsimeetrit'],
    'm³':  ['kuupmeeter', 'kuupmeetrist', 'kuupmeetrini', 'kuupmeetrit']
  };

  var SITKE = ' '; /* sitkuv tuhik: arv ja tahis ei tohi eri ridadele minna */

  function nimi(t, kaane) { return (NIMI[t] || [t, t, t, t])[kaane || 0]; }

  /* Osa uhikuid kirjutatakse sonaga (vt paise reegel 5) ja sona KAANDUB arvu jarel:
     "1 sajand", aga "5 sajandit"; "43 kuud", mitte "43 kuu". Tahis ei kaandu kunagi:
     "5 km", mitte "5 km-i". */
  var SONA = { 'ööpäev': 1, 'nädal': 1, 'kuu': 1, 'aasta': 1, 'sajand': 1, 'senti': 1 };

  function tahis(n, t) {
    if (!SONA[t]) return t;
    return Math.abs(n) === 1 ? nimi(t, 0) : nimi(t, 3);
  }

  /* Uhiku silt tuhja valja korval: seal on alati mitmuse osastav ("___ aastat"). */
  function silt(t) { return SONA[t] ? nimi(t, 3) : t; }

  /* Leiab ahela, kus molemad uhikud koos on. Eri ahelate vahel ei teisendata. */
  function leiaAhel(a, b) {
    for (var suurus in AHELAD) {
      if (!AHELAD.hasOwnProperty(suurus)) continue;
      for (var n = 0; n < AHELAD[suurus].length; n++) {
        var ahel = AHELAD[suurus][n], i = -1, j = -1;
        for (var k = 0; k < ahel.length; k++) {
          if (ahel[k][0] === a) i = k;
          if (ahel[k][0] === b) j = k;
        }
        if (i >= 0 && j >= 0) return { suurus: suurus, ahel: ahel, i: i, j: j };
      }
    }
    return null;
  }

  /* Mitu korda on suurem uhik vaiksemast ja mitme astme kaugusel nad on. */
  function tegur(a, b) {
    var L = leiaAhel(a, b);
    if (!L || L.i === L.j) return null;
    var lo = Math.min(L.i, L.j), hi = Math.max(L.i, L.j), t = 1;
    for (var k = lo; k < hi; k++) t *= L.ahel[k][1];
    return { tegur: t, sammud: hi - lo, suurem: L.i > L.j ? a : b, suurus: L.suurus };
  }

  /* arv uhikus a -> uhikus b */
  function teisenda(arv, a, b) {
    if (a === b) return arv;
    var T = tegur(a, b);
    if (!T) return null;
    var v = T.suurem === a ? arv * T.tegur : arv / T.tegur;
    return Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v) : v;
  }

  /* Arv eesti kirjapildis: koma, ja tuhandeliste tuhik alates viiekohalisest. */
  function vorm(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '';
    var s;
    if (Math.abs(n - Math.round(n)) < 1e-9) s = String(Math.round(n));
    else s = String(Number(n.toFixed(4))).replace('.', ',');
    var osad = s.split(','), tervik = osad[0];
    if (tervik.replace('-', '').length >= 5) {
      tervik = tervik.replace(/\B(?=(\d{3})+(?!\d))/g, SITKE);
    }
    return osad.length > 1 ? tervik + ',' + osad[1] : tervik;
  }

  /* Arv koos uhikuga: "3 km". Tuhik on sitke. */
  function vormU(n, t) { return vorm(n) + SITKE + tahis(n, t); }

  /* Lapse sisestus arvuks. Koma ja punkt molemad lubatud, tuhikud ja juhtivad
     nullid lubatud. Tuhi vali ja prugi annavad null. */
  function loeArv(tekst) {
    if (typeof tekst === 'number') return isFinite(tekst) ? tekst : null;
    if (typeof tekst !== 'string') return null;
    var s = tekst.replace(/[\s ]/g, '').replace(',', '.');
    if (s === '' || s === '.' || !/^\d*\.?\d*$/.test(s)) return null;
    var v = parseFloat(s);
    return isFinite(v) ? v : null;
  }

  function sama(a, b) {
    return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-9;
  }



  /* Koik paarid uhes suuruses kuni maxSamme astme kaugusel. Tagastab [suurem, vaiksem]. */
  function paarid(suurus, maxSamme, ahelNr) {
    var out = [], ahelad = AHELAD[suurus];
    for (var n = 0; n < ahelad.length; n++) {
      if (ahelNr != null && n !== ahelNr) continue;
      var a = ahelad[n];
      for (var i = 0; i < a.length; i++) {
        for (var j = i + 1; j < a.length; j++) {
          if (j - i <= maxSamme) out.push([a[j][0], a[i][0]]);
        }
      }
    }
    return out;
  }

  /* Tase 3 paarid on kaesitsi valitud, mitte koik voimalikud (Fable'i ulevaatus
     14. sept). Koolis ei teisendata kilomeetreid sentimeetriteks ega nadalaid
     tundideks - matemaatiliselt on need oiged, aga ulesandena voorad. Ajas kaivad
     ainult naaberuhikud, ainus lubatud hupe on h <-> s. */
  var P3 = [['cm', 'mm'], ['dm', 'cm'], ['m', 'dm'], ['km', 'm'],
            ['m', 'cm'], ['m', 'mm'], ['dm', 'mm']]
    .concat(paarid('mass', 2), paarid('maht', 3),
            paarid('aeg', 1, 0), [['h', 's']], paarid('aeg', 1, 1), paarid('raha', 1));

  /* Tasemel 4 lisanduvad pindala ja ruumala, samuti ainult koolis esinevad paarid:
     km² <-> a ja m³ <-> cm³ jaavad valja. */
  var P4 = P3.concat(
    [['cm²', 'mm²'], ['dm²', 'cm²'], ['m²', 'dm²'], ['m²', 'cm²'],
     ['a', 'm²'], ['ha', 'a'], ['ha', 'm²'], ['km²', 'ha']],
    [['cm³', 'mm³'], ['dm³', 'cm³'], ['m³', 'dm³']]);

  /* Tasemed jargivad oppekava. Vt faili paise, reegel 1. */
  var TASEMED = [null,
    { nr: 1, nimi: 'Lihtsad', klass: '2. klass',
      paarid: [['m', 'cm'], ['m', 'dm'], ['dm', 'cm'], ['kg', 'g'],
               ['h', 'min'], ['min', 's'], ['€', 'senti']],
      kordajad: [1, 2, 3, 4, 5, 6, 10],
      tyybid: ['teisenda', 'teisenda', 'teisenda', 'vordle', 'yhik'] },

    { nr: 2, nimi: 'Naaberühikud', klass: '3. klass',
      paarid: [['cm', 'mm'], ['dm', 'cm'], ['m', 'dm'], ['km', 'm'], ['m', 'cm'],
               ['kg', 'g'], ['t', 'kg'], ['min', 's'], ['h', 'min'], ['ööpäev', 'h'],
               ['nädal', 'ööpäev'], ['aasta', 'kuu'], ['sajand', 'aasta'],
               ['l', 'dl'], ['l', 'ml'], ['€', 'senti']],
      kordajad: [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 15, 20, 25, 50],
      nimegaPaarid: [['km', 'm'], ['m', 'cm'], ['kg', 'g'], ['t', 'kg'],
                     ['l', 'ml'], ['€', 'senti']],
      tyybid: ['teisenda', 'teisenda', 'nimega', 'nimega', 'vordle', 'yhik'] },

    { nr: 3, nimi: 'Üle ühe astme', klass: '4. klass',
      paarid: P3, kordajad: [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 15, 25, 40, 75],
      nimegaPaarid: [['km', 'm'], ['m', 'cm'], ['kg', 'g'], ['t', 'kg'],
                     ['l', 'ml'], ['€', 'senti'], ['h', 'min'], ['min', 's']],
      ylekanne: true,
      tyybid: ['teisenda', 'teisenda', 'nimega', 'ylekanne', 'vordle', 'yhik'] },

    { nr: 4, nimi: 'Koma ja ruudud', klass: '5. klass',
      paarid: P4, kordajad: [1, 2, 3, 4, 5, 6, 8, 12, 25, 40],
      nimegaPaarid: [['km', 'm'], ['m', 'cm'], ['kg', 'g'], ['t', 'kg'], ['l', 'ml']],
      ylekanne: true, koma: true,
      tyybid: ['teisenda', 'teisenda', 'koma', 'koma', 'nimega', 'vordle', 'yhik'] }
  ];

  /* "Milline uhik sobib?" - oppekava rida "moistab, mida esitatud mootarv reaalselt
     tahendab". Iga fakt utleb ise, mis tasemel ta tohib tulla. */
  var FAKTID = [
    { l: 'Uks on 2 ___ kõrge.', o: 'm', v: ['cm', 'mm', 'km'], s: 'pikkus', tase: 1 },
    { l: 'Pliiats on 15 ___ pikk.', o: 'cm', v: ['m', 'mm', 'km'], s: 'pikkus', tase: 1 },
    { l: 'Klassitahvel on 3 ___ lai.', o: 'm', v: ['cm', 'dm', 'km'], s: 'pikkus', tase: 1 },
    { l: 'Sipelgas on 5 ___ pikk.', o: 'mm', v: ['cm', 'dm', 'm'], s: 'pikkus', tase: 2 },
    { l: 'Sõrmeküüs on 10 ___ lai.', o: 'mm', v: ['cm', 'dm', 'm'], s: 'pikkus', tase: 2 },
    { l: 'Tallinnast Tartusse on 185 ___.', o: 'km', v: ['m', 'dm', 'cm'], s: 'pikkus', tase: 2 },
    { l: 'Koolimaja on 12 ___ kõrge.', o: 'm', v: ['cm', 'km', 'mm'], s: 'pikkus', tase: 2 },
    { l: 'Õun kaalub 150 ___.', o: 'g', v: ['kg', 't'], s: 'mass', tase: 1 },
    { l: 'Suur koer kaalub 30 ___.', o: 'kg', v: ['g', 't'], s: 'mass', tase: 1 },
    { l: 'Kiri kaalub 20 ___.', o: 'g', v: ['kg', 't'], s: 'mass', tase: 1 },
    { l: 'Veoauto kaalub 8 ___.', o: 't', v: ['kg', 'g'], s: 'mass', tase: 2 },
    { l: 'Suur hobune kaalub 600 ___.', o: 'kg', v: ['g', 't'], s: 'mass', tase: 2 },
    { l: 'Piimapakis on 1 ___ piima.', o: 'l', v: ['ml', 'dl'], s: 'maht', tase: 1 },
    { l: 'Teelusikasse mahub 5 ___.', o: 'ml', v: ['l', 'dl'], s: 'maht', tase: 2 },
    { l: 'Joogiklaasi mahub 2 ___.', o: 'dl', v: ['l', 'ml'], s: 'maht', tase: 2 },
    { l: 'Vanni mahub 150 ___ vett.', o: 'l', v: ['ml', 'dl'], s: 'maht', tase: 2 },
    { l: 'Koolitund kestab 45 ___.', o: 'min', v: ['s', 'h'], s: 'aeg', tase: 1 },
    { l: 'Kümneni lugemine kestab umbes 10 ___.', o: 's', v: ['min', 'h'], s: 'aeg', tase: 1 },
    { l: 'Laps magab öösel umbes 10 ___.', o: 'h', v: ['min', 's'], s: 'aeg', tase: 1 },
    { l: 'Suvevaheaeg kestab 3 ___.', o: 'kuu', v: ['nädal', 'aasta'], s: 'aeg', tase: 2 },
    { l: 'Jõuluvaheaeg kestab 2 ___.', o: 'nädal', v: ['ööpäev', 'kuu'], s: 'aeg', tase: 2 },
    { l: 'Jalgpallimäng kestab 90 ___.', o: 'min', v: ['s', 'h'], s: 'aeg', tase: 2 },
    { l: 'Postmargi pindala on 6 ___.', o: 'cm²', v: ['mm²', 'm²', 'dm²'], s: 'pindala', tase: 4 },
    { l: 'Korvpalliplatsi pindala on 420 ___.', o: 'm²', v: ['cm²', 'km²', 'ha'], s: 'pindala', tase: 4 },
    { l: 'Väikese metsatuki pindala on 2 ___.', o: 'ha', v: ['m²', 'km²', 'a'], s: 'pindala', tase: 4 },
    { l: 'Suhkrutüki ruumala on 4 ___.', o: 'cm³', v: ['mm³', 'dm³', 'm³'], s: 'ruumala', tase: 4 },
    { l: 'Kallur veab korraga 5 ___ liiva.', o: 'm³', v: ['cm³', 'dm³', 'mm³'], s: 'ruumala', tase: 4 }
  ];

  function rnd(n, R) { return Math.floor((R || Math.random)() * n); }
  function vali(list, R) { return list[rnd(list.length, R)]; }
  function sega(list, R) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rnd(i + 1, R), x = a[i]; a[i] = a[j]; a[j] = x;
    }
    return a;
  }
  function kategooriaks(paar) {
    var T = tegur(paar[0], paar[1]);
    return T ? T.suurus : null;
  }
  function filtreeri(list, kategooria) {
    if (!kategooria || kategooria === 'koik') return list;
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (kategooriaks(list[i]) === kategooria) out.push(list[i]);
    }
    return out.length ? out : list;
  }

  /* Kui tegur ei ole 10 aste ega 60, jaab suurema uhiku arv korrutustabelisse:
     "6 oopaeva = ___ h" (6 x 24) on 3. klassile liiga raske peastarvutus
     (Silver 15. sept). 60 on korras, sest 7 x 60 on sisuliselt 7 x 6. */
  var KORDAJA_LAGI = { 24: 3, 12: 5, 7: 5 };
  function kordajaLagi(tg) { return KORDAJA_LAGI[tg] || Infinity; }
  function kordajadPaarile(list, tg) {
    var lagi = kordajaLagi(tg), out = [];
    for (var i = 0; i < list.length; i++) if (list[i] <= lagi) out.push(list[i]);
    return out.length ? out : list;
  }

  /* "3 km = ___ m" */
  function genTeisenda(t, kategooria, R) {
    var tase = TASEMED[t];
    var p = vali(filtreeri(tase.paarid, kategooria), R);
    var TG = tegur(p[0], p[1]);
    var alla = rnd(2, R) === 0;
    var k = vali(kordajadPaarile(tase.kordajad, TG.tegur), R);
    var mille = alla ? p[0] : p[1];
    var mida = alla ? p[1] : p[0];
    var arv = alla ? k : k * TG.tegur;
    var vastus = teisenda(arv, mille, mida);
    if (vastus > 1000000 || arv > 1000000) return null;
    return {
      tyyp: 'teisenda', tase: t, suurus: TG.suurus,
      id: mille + '>' + mida, lemma: mille + '>' + mida,
      kysimus: vormU(arv, mille) + ' = ___ ' + silt(mida),
      arv: arv, mille: mille, mida: mida,
      valjad: 1, sildid: [mida], vastus: vastus
    };
  }

  /* "2,5 kg = ___ g" - ainult tasemel 4, sest kumnendmurrud on 5. klassi teema. */
  function genKoma(t, kategooria, R) {
    if (!TASEMED[t].koma) return null;
    var p = vali(filtreeri(TASEMED[t].paarid, kategooria), R);
    var TG = tegur(p[0], p[1]);
    if (TG.tegur < 10) return null;
    /* Kumnendmurd ei kai ajauhikutega: "1,25 aastat" ei utle keegi, oeldakse
       "aasta ja 3 kuud". Sama kehtib koigi sonaga uhikute kohta. */
    if (TG.suurus === 'aeg' || SONA[p[0]] || SONA[p[1]]) return null;
    var murd = vali([0.5, 0.25, 0.75, 0.1, 0.2, 0.4], R);
    var arv = vali([0, 1, 2, 3, 4, 6], R) + murd;
    var vastus = teisenda(arv, p[0], p[1]);
    if (Math.abs(vastus - Math.round(vastus)) > 1e-9 || vastus > 1000000) return null;
    return {
      tyyp: 'koma', tase: t, suurus: TG.suurus,
      id: p[0] + '>' + p[1], lemma: p[0] + '>' + p[1],
      kysimus: vormU(arv, p[0]) + ' = ___ ' + silt(p[1]),
      arv: arv, mille: p[0], mida: p[1],
      valjad: 1, sildid: [p[1]], vastus: vastus
    };
  }

  /* Nimega arv kahes uhikus. Kaks suunda: "2350 m = ___ km ___ m" ja
     "2 km 350 m = ___ m". Teine osa on meelega vahel alla saja (2 km 50 m),
     sest just seal kaob lapsel null kohavaartuses ara. */
  function genNimega(t, kategooria, R) {
    var lubatud = TASEMED[t].nimegaPaarid;
    if (!lubatud) return null;
    var p = vali(filtreeri(lubatud, kategooria), R);
    var TG = tegur(p[0], p[1]).tegur;
    var suur = p[0], vaike = p[1];
    var a = 1 + rnd(9, R);
    var valik = [], kand = [5, 7, 20, 50, 60, 25, 120, 250, 350, 900];
    for (var i = 0; i < kand.length; i++) if (kand[i] < TG) valik.push(kand[i]);
    if (!valik.length) return null;
    var b = vali(valik, R);
    var kokku = a * TG + b;
    var lahku = rnd(2, R) === 0;
    var id = suur + '+' + vaike;
    if (lahku) {
      return {
        tyyp: 'nimega', tase: t, suurus: tegur(suur, vaike).suurus, id: id, lemma: id,
        kysimus: vormU(kokku, vaike) + ' = ___ ' + silt(suur) + ' ___ ' + silt(vaike),
        arv: kokku, mille: vaike, mida: suur, osa: b,
        valjad: 2, sildid: [suur, vaike], vastus: [a, b]
      };
    }
    return {
      tyyp: 'nimega', tase: t, suurus: tegur(suur, vaike).suurus, id: id, lemma: id,
      kysimus: vormU(a, suur) + ' ' + vormU(b, vaike) + ' = ___ ' + silt(vaike),
      arv: kokku, mille: suur, mida: vaike, osa: b,
      valjad: 1, sildid: [vaike], vastus: kokku, tykid: [a, b]
    };
  }

  /* "3 h 65 min = ___ h ___ min" - ulekanne kuuekumne juures. Ainult aeg, sest
     just seal kannab laps kumnendloogika vale kohta ule. */
  function genYlekanne(t, kategooria, R) {
    if (!TASEMED[t].ylekanne) return null;
    if (kategooria && kategooria !== 'koik' && kategooria !== 'aeg') return null;
    var p = vali([['h', 'min'], ['min', 's']], R);
    var a = 1 + rnd(5, R);
    var b = 61 + rnd(59, R);
    var id = p[0] + '+' + p[1] + '!';
    return {
      tyyp: 'ylekanne', tase: t, suurus: 'aeg', id: id, lemma: id,
      kysimus: vormU(a, p[0]) + ' ' + vormU(b, p[1]) +
               ' = ___ ' + silt(p[0]) + ' ___ ' + silt(p[1]),
      mille: p[0], mida: p[1], arv: a * 60 + b,
      valjad: 2, sildid: [p[0], p[1]], vastus: [a + 1, b - 60]
    };
  }

  /* "Kumb on suurem: 250 cm või 3 m?" Arvud on meelega nii, et suurem arv ei ole
     suurem suurus - muidu saab vastata teisendamata. */
  function genVordle(t, kategooria, R) {
    var p = vali(filtreeri(TASEMED[t].paarid, kategooria), R);
    var TG = tegur(p[0], p[1]);
    var a = 1 + rnd(Math.min(9, kordajaLagi(TG.tegur)), R);
    var alus = a * TG.tegur;
    var samm = Math.max(1, Math.round(TG.tegur / 10));
    var b = alus + (rnd(2, R) ? 1 : -1) * vali([1, 2, 5, 10], R) * samm;
    if (b <= 0 || b === alus || alus > 1000000 || b > 1000000) return null;
    var uks = vormU(a, p[0]), kaks = vormU(b, p[1]);
    var esimene = rnd(2, R) === 0;
    var valikud = esimene ? [uks, kaks] : [kaks, uks];
    var suuremIndeks = (alus > b) === esimene ? 0 : 1;
    var id = 'vordle:' + p[0] + '>' + p[1];
    return {
      tyyp: 'vordle', tase: t, suurus: TG.suurus, id: id, lemma: id,
      kysimus: 'Kumb on suurem?',
      valikud: valikud, valjad: 0, vastus: suuremIndeks,
      mille: p[0], mida: p[1], arv: a, teineArv: b
    };
  }

  /* "Uks on 2 ___ kõrge." */
  function genYhik(t, kategooria, R) {
    var sobivad = [];
    for (var i = 0; i < FAKTID.length; i++) {
      var f = FAKTID[i];
      if (f.tase > t) continue;
      if (kategooria && kategooria !== 'koik' && f.s !== kategooria) continue;
      sobivad.push(f);
    }
    if (!sobivad.length) return null;
    var fakt = vali(sobivad, R);
    var valed = sega(fakt.v, R).slice(0, 2);
    var id = 'yhik:' + fakt.o;
    var valikud = sega([fakt.o].concat(valed), R), sildid = [];
    for (var n2 = 0; n2 < valikud.length; n2++) sildid.push(silt(valikud[n2]));
    return {
      tyyp: 'yhik', tase: t, suurus: fakt.s, id: id, lemma: id,
      kysimus: fakt.l, valikud: valikud, valikudSildid: sildid,
      valjad: 0, vastus: fakt.o, mida: fakt.o
    };
  }

  var GENID = {
    teisenda: genTeisenda, koma: genKoma, nimega: genNimega,
    ylekanne: genYlekanne, vordle: genVordle, yhik: genYhik
  };

  /* Uks ulesanne. Kategooria on uks AHELAD-i voti voi 'koik'. */
  function genereeri(tase, kategooria, R) {
    var t = Math.max(1, Math.min(4, tase || 1));
    for (var katse = 0; katse < 40; katse++) {
      var tyyp = vali(TASEMED[t].tyybid, R);
      var q = GENID[tyyp](t, kategooria, R);
      if (q) return q;
    }
    return genTeisenda(t, null, R) || genYhik(t, null, R);
  }

  function suureTaht(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* Kontrollib vastust. valjad=0 on nupuvajutus, 1 uks arv, 2 kaks arvu. */
  function kontrolli(q, vastus) {
    if (q.valjad === 0) {
      if (q.tyyp === 'vordle') return { oige: Number(vastus) === q.vastus, sisestus: vastus };
      return { oige: String(vastus) === String(q.vastus), sisestus: vastus };
    }
    if (q.valjad === 2) {
      var list = [].concat(vastus);
      var a = loeArv(list[0]), b = loeArv(list[1]);
      if (a === null || b === null) return { oige: false, sisestus: [a, b], tyhi: true };
      return { oige: sama(a, q.vastus[0]) && sama(b, q.vastus[1]), sisestus: [a, b] };
    }
    var v = loeArv([].concat(vastus)[0]);
    if (v === null) return { oige: false, sisestus: null, tyhi: true };
    return { oige: sama(v, q.vastus), sisestus: v };
  }

  /* Kumme astmes n? Kasutatakse "nullid puudu" aratundmiseks. */
  function kumnendSuhe(a, b) {
    if (!a || !b) return null;
    var suhe = a > b ? a / b : b / a;
    var log = Math.log(suhe) / Math.log(10);
    var yle = Math.round(log);
    if (Math.abs(log - yle) > 1e-9 || yle < 1) return null;
    return Math.pow(10, yle);
  }

  /* Vale vastuse diagnoos. See on mooduli moote: mang utleb, MILLISE vea laps tegi.
     Liigid: tyhi, sama, suund, nullid, koht, ulekanne, lahedal, muu. */
  function diagnoosi(q, vastus) {
    var K = kontrolli(q, vastus);
    if (K.oige) return { liik: 'oige', lause: '' };
    if (K.tyhi) return { liik: 'tyhi', lause: 'Kirjuta arv ja vajuta „Vastan“.' };

    if (q.tyyp === 'vordle' || q.tyyp === 'yhik') {
      return { liik: 'muu', lause: '' };
    }

    if (q.valjad === 2) {
      var a = K.sisestus[0], b = K.sisestus[1];
      if (q.tyyp === 'ylekanne') {
        if (sama(a, q.vastus[0] - 1)) {
          var bAlg = q.vastus[1] + 60;
          return { liik: 'ulekanne', lause: vormU(bAlg, q.mida) + ' on rohkem kui ' +
            vormU(1, q.mille) + '. ' + vormU(60, q.mida) + ' = ' + vormU(1, q.mille) +
            ', seega ' + vormU(bAlg, q.mida) + ' = ' + vormU(1, q.mille) + ' ' +
            vormU(q.vastus[1], q.mida) + '.' };
        }
        return { liik: 'muu', lause: '' };
      }
      if (sama(a + b, q.arv)) {
        return { liik: 'koht', lause: 'Vaata, mitu täis ' + nimi(q.sildid[0], 3) +
          ' sisse mahub: ' + vormU(q.arv, q.sildid[1]) + ' = ' +
          vormU(q.vastus[0], q.sildid[0]) + ' ja ' + vormU(q.vastus[1], q.sildid[1]) + '.' };
      }
      return { liik: 'muu', lause: '' };
    }

    var v = K.sisestus, T = tegur(q.mille, q.mida);
    if (!T) return { liik: 'muu', lause: '' };
    if (sama(v, q.arv)) {
      return { liik: 'sama', lause: 'Arv jäi samaks. Ühik muutus, seega peab muutuma ka arv.' };
    }
    if (q.tykid && sama(v, Number('' + q.tykid[0] + q.tykid[1]))) {
      var TGk = T.tegur;
      return { liik: 'koht', lause: vormU(q.tykid[0], q.mille) + ' = ' +
        vormU(q.tykid[0] * TGk, q.mida) + '. Liida: ' + vorm(q.tykid[0] * TGk) + ' + ' +
        vorm(q.tykid[1]) + ' = ' + vormU(q.vastus, q.mida) + '.' };
    }
    var vale = T.suurem === q.mille ? q.arv / T.tegur : q.arv * T.tegur;
    if (sama(v, vale)) {
      var vaiksem = T.suurem === q.mille ? q.mida : q.mille;
      return { liik: 'suund', lause: suureTaht(nimi(q.mida, 0)) + ' on ' +
        (q.mida === vaiksem ? 'väiksem' : 'suurem') + ' ühik kui ' + nimi(q.mille, 0) +
        ', seega läheb arv ' + (q.mida === vaiksem ? 'suuremaks' : 'väiksemaks') + '.' };
    }
    var suhe = kumnendSuhe(v, q.vastus);
    if (suhe) {
      var puudu = q.vastus > v;
      var vaiksemY = T.suurem === q.mille ? q.mida : q.mille;
      return { liik: 'nullid', lause: (puudu ? 'Nulle jäi puudu. ' : 'Nulle sai liiga palju. ') +
        'Õige vastus on ' + vorm(suhe) + ' korda ' + (puudu ? 'suurem' : 'väiksem') +
        ' kui sinu oma. Loe üle: ' + vormU(1, T.suurem) + ' = ' + vormU(T.tegur, vaiksemY) + '.' };
    }
    return { liik: 'muu', lause: '' };
  }

  /* Vihje. Alati kaks lauset: esimene ütleb redeli, teine teeb tehte ette. */
  function vihje(q) {
    if (q.tyyp === 'yhik') {
      return 'Proovi iga ühikut lausesse: ' + (q.valikudSildid || q.valikud).join(', ') +
        '. Vali see, mis päriselus sobib.';
    }
    if (q.tyyp === 'vordle') {
      var yhes = teisenda(q.arv, q.mille, q.mida);
      return 'Teisenda mõlemad samasse ühikusse. ' + vormU(q.arv, q.mille) + ' = ' +
        vormU(yhes, q.mida) + ', teine on ' + vormU(q.teineArv, q.mida) + '.';
    }
    if (q.tyyp === 'ylekanne') {
      var bA = q.vastus[1] + 60;
      return vormU(60, q.mida) + ' = ' + vormU(1, q.mille) + '. ' + vormU(bA, q.mida) +
        ' = ' + vormU(1, q.mille) + ' ' + vormU(q.vastus[1], q.mida) + ', seega vastus on ' +
        vormU(q.vastus[0], q.mille) + ' ' + vormU(q.vastus[1], q.mida) + '.';
    }
    if (q.tyyp === 'nimega') {
      var suur = q.valjad === 2 ? q.sildid[0] : q.mille;
      var vaike = q.valjad === 2 ? q.sildid[1] : q.mida;
      var Tn = tegur(suur, vaike).tegur;
      var alus = vormU(1, suur) + ' = ' + vormU(Tn, vaike) + '. ';
      if (q.valjad === 2) {
        return alus + vormU(q.arv, vaike) + ' = ' + vormU(q.vastus[0], suur) + ' ja ' +
          vormU(q.vastus[1], vaike) + '.';
      }
      return alus + vorm(q.tykid[0]) + ' × ' + vorm(Tn) + ' + ' + vorm(q.tykid[1]) +
        ' = ' + vormU(q.vastus, vaike) + '.';
    }
    var T = tegur(q.mille, q.mida);
    if (!T) return '';
    var alla = T.suurem === q.mille;
    var suurem = T.suurem, vaiksem = suurem === q.mille ? q.mida : q.mille;
    return vormU(1, suurem) + ' = ' + vormU(T.tegur, vaiksem) + '. ' + vorm(q.arv) +
      (alla ? ' × ' : ' : ') + vorm(T.tegur) + ' = ' + vormU(q.vastus, q.mida) + '.';
  }

  /* Redel joonistamiseks: uhe suuruse ahelad koos kordajatega. */
  function redel(suurus) {
    var out = [];
    var ahelad = AHELAD[suurus] || [];
    for (var n = 0; n < ahelad.length; n++) {
      var rida = [];
      for (var i = 0; i < ahelad[n].length; i++) {
        rida.push({ t: ahelad[n][i][0], nimi: nimi(ahelad[n][i][0], 0), samm: ahelad[n][i][1] });
      }
      out.push(rida);
    }
    return out;
  }

  var API = {
    AHELAD: AHELAD, NIMI: NIMI, TASEMED: TASEMED, FAKTID: FAKTID,
    nimi: nimi, tahis: tahis, silt: silt, tegur: tegur, teisenda: teisenda,
    vorm: vorm, vormU: vormU, loeArv: loeArv,
    genereeri: genereeri, kontrolli: kontrolli, diagnoosi: diagnoosi,
    vihje: vihje, redel: redel,
    kategooriad: ['pikkus', 'mass', 'maht', 'aeg', 'raha', 'pindala', 'ruumala']
  };

  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.TYhik = API;
}(typeof window !== 'undefined' ? window : this));
