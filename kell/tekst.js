/* Kell: elulised tekstülesanded ajaarvutusega.
 *
 * Silveri näide, mis selle tellis: „Kell on praegu 12 ja kolme ja poole tunni
 * pärast läheme kinno — mis kell läheme? Ja kui juurde panna minekuaeg, mis
 * kell peab kodust minema hakkama?" Sellest sai kahesammuline ülesanne.
 *
 * KEELEREEGLID, mis siin kogu aeg varitsevad (Fable'i ülevaatus, allikad
 * failis claude/kell-ajaarvutus-keelereeglid.md):
 *
 * 1. Kellaaeg lauses saab sõna „kell" ette: „Kontsert lõpeb **kell** kaheksa."
 *    Paljas nimetav („lõpeb kaheksa") ei ole lause. Sõna „kell" hoiab väljendi
 *    ka nimetavas, nii et kood ei pea seda käänama.
 * 2. „N MINUTI pärast" ei tohi tekstülesandes esineda, sest kellaaja vorm
 *    „kahekümne minuti pärast neli" (= 3.40) ON sõna-sõnalt seesama
 *    konstruktsioon. „N TUNNI pärast" on ohutu — tunninime järele ei tule.
 * 3. 15/30/45 minutit võib öelda ka „veerand/pool/kolmveerand tundi". Mõlemad
 *    on õiged, seega ei tohi neid valikvastustes vastandada.
 * 4. Minutid numbritega, tunnid sõnadega: „45 minutit", „tund aega",
 *    „kaks tundi", „tund ja 15 minutit". „Kestab 1 tund" on kõnekeelne.
 *    90 ja 150 minutit on „poolteist tundi" ja „kaks ja pool tundi" — ainsad
 *    loomulikud vormid, ja nii kaob ka topelt-„ja".
 * 5. Kestus käib lauses enne lõpuaega: „Vahetund kestab 15 minutit ja lõpeb
 *    kell üksteist", mitte „lõpeb kell üksteist ja kestab 15 minutit".
 * 6. Vihje on arvutuslause: seal käib „üks tund", mitte „tund aega"
 *    („miinus tund aega" on kohmakas), ja punkti järel algab uus lause suure
 *    tähega.
 *
 * ELULISUS: iga stseen ütleb ise, kui kaua ta võib kesta ja mis kellaajal ta
 * juhtuda saab. Ilma selleta tuli välja „vahetund kell viis" ja
 * „15-minutiline ujumistund".
 */
(function () {
  'use strict';

  var TUND_OM = ['', 'ühe', 'kahe', 'kolme', 'nelja', 'viie', 'kuue',
                 'seitsme', 'kaheksa', 'üheksa', 'kümne', 'üheteistkümne', 'kaheteistkümne'];
  var TUND_NIM = ['', 'üks', 'kaks', 'kolm', 'neli', 'viis', 'kuus',
                  'seitse', 'kaheksa', 'üheksa', 'kümme', 'üksteist', 'kaksteist'];

  /* Kestus: minutid numbritega, tunnid sõnadega — vt päist, reegel 4. */
  function kestus(min) {
    var t = Math.floor(min / 60), m = min % 60;
    if (t === 0) return m === 1 ? '1 minut' : m + ' minutit';
    if (m === 30) return t === 1 ? 'poolteist tundi' : TUND_NIM[t] + ' ja pool tundi';
    if (m === 0) return t === 1 ? 'tund aega' : TUND_NIM[t] + ' tundi';
    return (t === 1 ? 'tund' : TUND_NIM[t] + ' tundi') +
           ' ja ' + (m === 1 ? '1 minut' : m + ' minutit');
  }

  /* Sama kestus arvutuslauses: „pluss üks tund", mitte „pluss tund aega". */
  function kestusArv(min) { return min === 60 ? 'üks tund' : kestus(min); }

  /* Lause algustäht suureks. */
  function suur(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* Sama kestus tervete tundidena sõnadega: „kolm ja pool tundi".
     Vihje kasutab seda, et loo ja vihje sõnastus kokku läheksid. */
  function kestusSonadega(min) {
    var t = Math.floor(min / 60), m = min % 60;
    if (t < 1 || t > 12) return kestus(min);
    if (m === 0) return t === 1 ? 'tund aega' : TUND_NIM[t] + ' tundi';
    if (m === 30) return t === 1 ? 'poolteist tundi' : TUND_NIM[t] + ' ja pool tundi';
    return kestus(min);
  }

  /* „kolme tunni pärast", „kolme ja poole tunni pärast".
     null, kui kestus ei ole tundides — siis ei tohi „pärast" kasutada. */
  function tunniParast(min) {
    if (min < 60 || min > 720) return null;
    var t = Math.floor(min / 60), m = min % 60;
    if (m === 0) return TUND_OM[t] + ' tunni pärast';
    if (m === 30) return t === 1 ? 'poolteise tunni pärast'
                                 : TUND_OM[t] + ' ja poole tunni pärast';
    return null;
  }

  /* Stseenid. `n` lause alguses, `s` lause sees, `lyh`..`pik` usutav kestus
     minutites, `tunnid` need 12-tunnise sihverplaadi numbrid, mille peal see
     sündmus usutavalt toimub. Vahetund ei ole kell viis, ujumistund ei kesta
     veerand tundi. */
  var STSEENID = [
    { n: 'Film',           s: 'film',           lyh: 60,  pik: 180, tunnid: [12, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { n: 'Trenn',          s: 'trenn',          lyh: 45,  pik: 120, tunnid: [10, 11, 12, 1, 2, 3, 4, 5, 6, 7] },
    { n: 'Kontsert',       s: 'kontsert',       lyh: 60,  pik: 120, tunnid: [12, 1, 2, 3, 4, 5, 6, 7, 8] },
    { n: 'Etendus',        s: 'etendus',        lyh: 60,  pik: 120, tunnid: [12, 1, 2, 3, 4, 5, 6, 7] },
    { n: 'Sünnipäevapidu', s: 'sünnipäevapidu', lyh: 120, pik: 180, tunnid: [12, 1, 2, 3, 4, 5, 6] },
    { n: 'Ujumistund',     s: 'ujumistund',     lyh: 45,  pik: 60,  tunnid: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6] },
    { n: 'Jalgpallimäng',  s: 'jalgpallimäng',  lyh: 60,  pik: 120, tunnid: [10, 11, 12, 1, 2, 3, 4, 5, 6, 7] },
    { n: 'Lauamäng',       s: 'lauamäng',       lyh: 30,  pik: 90,  tunnid: [11, 12, 1, 2, 3, 4, 5, 6, 7, 8] },
    { n: 'Vahetund',       s: 'vahetund',       lyh: 10,  pik: 20,  tunnid: [9, 10, 11, 12, 1] },
    { n: 'Multikas',       s: 'multikas',       lyh: 15,  pik: 30,  tunnid: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7] }
  ];

  var rnd = n => Math.floor(Math.random() * n);
  var valik = a => a[rnd(a.length)];

  function liida(h, m, delta) {
    var kokku = ((h % 12) * 60 + m + delta) % 720;
    if (kokku < 0) kokku += 720;
    var hh = Math.floor(kokku / 60);
    return { h: hh === 0 ? 12 : hh, m: kokku % 60 };
  }

  window.HTekst = {
    kestus: kestus, kestusArv: kestusArv, kestusSonadega: kestusSonadega,
    tunniParast: tunniParast, suur: suur,
    liida: liida, STSEENID: STSEENID, valik: valik, rnd: rnd
  };
})();

/* ---------- ülesannete koostamine ---------- */
(function () {
  'use strict';
  var T = window.HTekst, valik = T.valik, rnd = T.rnd;

  /* Kohad kahesammulise ülesande jaoks. `koht` on sisseütlevas:
     „Kinno jõudmiseks kulub 20 minutit." */
  var KAUGED = [
    { n: 'Film',           s: 'film',           koht: 'Kinno',       tunnid: [12, 1, 2, 3, 4, 5, 6, 7, 8] },
    { n: 'Trenn',          s: 'trenn',          koht: 'Trenni',      tunnid: [10, 11, 12, 1, 2, 3, 4, 5, 6, 7] },
    { n: 'Kontsert',       s: 'kontsert',       koht: 'Kontserdile', tunnid: [12, 1, 2, 3, 4, 5, 6, 7] },
    { n: 'Etendus',        s: 'etendus',        koht: 'Teatrisse',   tunnid: [12, 1, 2, 3, 4, 5, 6, 7] },
    { n: 'Sünnipäevapidu', s: 'sünnipäevapidu', koht: 'Peole',       tunnid: [12, 1, 2, 3, 4, 5, 6] }
  ];

  /* Kellaaeg lauses käib alati sõnaga „kell" — vt faili päist, reegel 1. */
  var kell = (h, m) => 'kell ' + HAeg.utle(h, m);

  /* „Kestab tund ja 15 minutit JA lõpeb..." oleks kaks „ja" kõrvuti. Kui
     kestuses on juba „ja", saab lause teiseks sidesõnaks „ning". */
  function side(kestusTekst) { return / ja /.test(kestusTekst) ? ' ning ' : ' ja '; }

  function minutid(samm) {
    var mins = [];
    for (var m = 0; m < 60; m += samm) mins.push(m);
    return mins;
  }

  /* Suvaline kellaaeg. `tunnid` piirab, mis kella peal sündmus toimuda võib. */
  function suvaAeg(samm, tunnid) {
    var mins = minutid(samm);
    var h = tunnid && tunnid.length ? valik(tunnid) : 1 + rnd(12);
    return { h: h, m: mins[rnd(mins.length)] };
  }

  /* Kestuse kandidaadid võrgus. Neist tulevad nii õige vastus kui valikud,
     nii et ükski valik ei ole sama pikk aeg teises sõnastuses. */
  function kandidaadid(samm) {
    var k = [];
    for (var i = 1; i <= 6 && samm * i <= 180; i++) k.push(samm * i);
    while (k.length < 4) k.push(k[k.length - 1] + samm);
    return k;
  }

  /* Valib stseeni ja kestuse nii, et lugu oleks eluliselt usutav. Kui ükski
     stseen antud sammuga ei sobi (nt tase „täistunnid" ja vahetund), langeb
     tagasi lihtsalt kõige lähema sobivusega stseenile. */
  function stseenJaKestus(kand) {
    var paarid = [];
    T.STSEENID.forEach(function (st) {
      kand.forEach(function (k) {
        if (k >= st.lyh && k <= st.pik) paarid.push({ st: st, k: k });
      });
    });
    if (paarid.length) return valik(paarid);
    var k2 = valik(kand);
    var sobivad = T.STSEENID.filter(function (st) { return st.pik >= k2; });
    return { st: valik(sobivad.length ? sobivad : T.STSEENID), k: k2 };
  }

  function loo(samm) {
    var t = valik(['edasi', 'tagasi', 'vahe', 'kaks']);
    if (t === 'kaks') return kaheSammuga(samm);
    if (t === 'vahe') return kestusUlesanne(samm);

    var p = stseenJaKestus(kandidaadid(samm)), st = p.st, k = p.k;

    if (t === 'edasi') {
      var a = suvaAeg(samm, st.tunnid), b = T.liida(a.h, a.m, k);
      return { sammud: [{
        lugu: st.n + ' algab ' + kell(a.h, a.m) + side(T.kestus(k)) + 'kestab ' + T.kestus(k) + '.',
        kysimus: 'Mis kell ' + st.s + ' lõpeb?',
        tyyp: 'aeg', vastus: b,
        vihje: 'Liida algusajale kestus juurde. ' + T.suur(HAeg.utle(a.h, a.m)) + ' pluss ' +
               T.kestusArv(k) + ' on <b>' + HAeg.utle(b.h, b.m) + '</b>.'
      }] };
    }

    /* Kestus käib enne lõpuaega — vt faili päist, reegel 5. */
    var b2 = suvaAeg(samm, st.tunnid), a2 = T.liida(b2.h, b2.m, -k);
    return { sammud: [{
      lugu: st.n + ' kestab ' + T.kestus(k) + side(T.kestus(k)) + 'lõpeb ' + kell(b2.h, b2.m) + '.',
      kysimus: 'Mis kell ' + st.s + ' algab?',
      tyyp: 'aeg', vastus: a2,
      vihje: 'Lahuta lõpuajast kestus maha. ' + T.suur(HAeg.utle(b2.h, b2.m)) + ' miinus ' +
             T.kestusArv(k) + ' on <b>' + HAeg.utle(a2.h, a2.m) + '</b>.'
    }] };
  }

  /* Algus ja lõpp antud, küsitakse kestust. Valikud on õigele kõige lähemad
     kandidaadid, et pikim vastus ei paistaks arvutamata silma. */
  function kestusUlesanne(samm) {
    var kand = kandidaadid(samm);
    var p = stseenJaKestus(kand), st = p.st, k = p.k;
    var lahedad = kand.filter(v => v !== k).sort((x, y) => Math.abs(x - k) - Math.abs(y - k)).slice(0, 3);
    var valikud = lahedad.concat([k]);
    var minutites = Math.max.apply(null, valikud) < 60;
    var a = suvaAeg(samm, st.tunnid), b = T.liida(a.h, a.m, k);
    return { sammud: [{
      lugu: st.n + ' algab ' + kell(a.h, a.m) + ' ja lõpeb ' + kell(b.h, b.m) + '.',
      kysimus: (minutites ? 'Mitu minutit ' : 'Kui kaua ') + st.s + ' kestab?',
      tyyp: 'kestus', vastus: k, valikud: valikud,
      vihje: 'Loe algusest lõpuni: ' + HAeg.utle(a.h, a.m) + ' → ' + HAeg.utle(b.h, b.m) +
             ' on <b>' + T.kestus(k) + '</b>.'
    }] };
  }

  /* Silveri näide: praegu on kell X, sündmus on Y tunni pärast, ja kui juurde
     tuleb minekuaeg, siis mis kell tuleb kodust välja minna. */
  function kaheSammuga(samm) {
    var st = valik(KAUGED);
    /* „pärast" tohib olla ainult tundides — vt faili päist, reegel 2.
       Kuni kolm tundi: neli ja pool tundi ootamist ei ole lapsele eluline. */
    var tunde = 1 + rnd(3);
    var pool = (samm <= 30 && tunde < 3 && Math.random() < 0.5) ? 30 : 0;
    var k = tunde * 60 + pool;
    /* Sündmuse aeg valitakse usutavas aknas ja „praegu" arvutatakse tagasi. */
    var algus = suvaAeg(samm, st.tunnid);
    var a = T.liida(algus.h, algus.m, -k);
    var soit = samm * (1 + rnd(Math.max(1, Math.floor(45 / samm))));
    var valja = T.liida(algus.h, algus.m, -soit);

    return { sammud: [
      {
        lugu: 'Kell on praegu ' + HAeg.utle(a.h, a.m) + '. ' + st.n + ' algab ' + T.tunniParast(k) + '.',
        kysimus: 'Mis kell ' + st.s + ' algab?',
        tyyp: 'aeg', vastus: algus,
        vihje: 'Kell on ' + HAeg.utle(a.h, a.m) + '. ' + T.suur(T.tunniParast(k)) +
               ' on kell <b>' + HAeg.utle(algus.h, algus.m) + '</b>.'
      },
      {
        lugu: st.n + ' algab ' + kell(algus.h, algus.m) + '. ' + st.koht + ' jõudmiseks kulub ' + T.kestus(soit) + '.',
        kysimus: 'Mis kell pead kodust välja minema?',
        tyyp: 'aeg', vastus: valja,
        vihje: 'Kohal pead olema ' + kell(algus.h, algus.m) + '. Tee võtab ' + T.kestus(soit) +
               ', seega tuleb välja minna <b>' + kell(valja.h, valja.m) + '</b>.'
      }
    ] };
  }

  T.loo = loo;
})();


/* ---------- numbritega ajaarvutus ----------
 *
 * Silveri tellimus (14. sept): „meil on hommikul kodus sagedane vestlus see,
 * mis kell ta peab toast välja minema, et 8.28 bussile jõuda. siis ta vaatab
 * mis kell parajasti on ja mitu minutit tal veel aega on."
 *
 * MIKS SIIN TOHIB MINUTI TÄPSUS OLLA, kui sõnadega ülesannetes ei tohi:
 * kogu keeleline lõks on „N minuti pärast" — vt faili päist, reegel 2. Siin
 * seda konstruktsiooni ei esine: aeg on kirjas numbritega („kell 8.28") ja
 * vastus on minutite arv („22 minutit"). Nii käib see päris elus ka —
 * bussiplaan ei ütle „kahekümne kaheksa minuti pärast kaheksa".
 *
 * NUMBRITEGA AJA KEELEREEGLID (Fable'i ülevaatus 14. sept):
 *  a. Lauses käib numbri ette „kell": „Buss väljub kell 8.39", „Kell on 8.11".
 *     Ilma selleta on see tabelirida, mitte lause.
 *  b. Vahemik saab käändelõpu ja sõna „kella": „kella 8.11-st 8.39-ni".
 *     Mõttekriipsu (16.35–17.55) ei kasuta — näeb välja nagu miinus.
 *  c. Küsimus on „Mitu minutit …?", mitte „Kui kaua …?" — „kui kaua" lubaks
 *     vastuse „1 tund ja 20 minutit" ja tekitaks kaks õiget vastust.
 *  d. „Tund" on kahemõtteline (ajaühik ja koolitund) — kasuta „koolitund".
 */
(function () {
  'use strict';
  var T = window.HTekst, valik = T.valik, rnd = T.rnd;

  /* `oma` = mitmenda minuti täpsusega see aeg päris elus on. Bussi- ja
     rongiplaanis on 8.28 tavaline, film ja trenn algavad ümara aja peal. */
  var MINEK = [
    { kuni: 'bussi väljumiseni',      algus: 'Buss väljub',                tee: 'bussipeatusesse', aken: [420, 530],  valmis: [10, 15, 20],     oma: 1 },
    { kuni: 'rongi väljumiseni',      algus: 'Rong väljub',                tee: 'jaama',           aken: [420, 1080], valmis: [15, 20, 25, 30], oma: 1 },
    { kuni: 'kooli alguseni',         algus: 'Koolitund algab',            tee: 'kooli',           aken: [480, 840],  valmis: [15, 20, 25],     oma: 5 },
    { kuni: 'trenni alguseni',        algus: 'Trenn algab',                tee: 'trenni',          aken: [900, 1140], valmis: [15, 20, 25, 30], oma: 5 },
    { kuni: 'filmi alguseni',         algus: 'Film algab kinos',           tee: 'kinno',           aken: [960, 1200], valmis: [20, 25, 30],     oma: 5 },
    { kuni: 'multika alguseni',       algus: 'Multikas algab sõbra juures', tee: 'sõbra juurde',   aken: [540, 1140], valmis: [10, 15, 20],     oma: 5 },
    { kuni: 'ujumistunni alguseni',   algus: 'Ujumistund algab',           tee: 'ujulasse',        aken: [540, 1080], valmis: [20, 25, 30],     oma: 5 }
  ];

  /* Kestuse küsimusel on oma nimekiri: iga sündmusega käib kaasas usutav
     pikkus, et ei tekiks 65-minutilist koolitundi. */
  var KESTUSED = [
    { n: 'Film',       s: 'film',       aken: [960, 1200], lyh: 80, pik: 120 },
    { n: 'Etendus',    s: 'etendus',    aken: [720, 1140], lyh: 60, pik: 90 },
    { n: 'Trenn',      s: 'trenn',      aken: [900, 1140], lyh: 45, pik: 90 },
    { n: 'Ujumistund', s: 'ujumistund', aken: [540, 1080], lyh: 40, pik: 60 },
    { n: 'Multikas',   s: 'multikas',   aken: [540, 1140], lyh: 20, pik: 40 },
    { n: 'Matk',       s: 'matk',       aken: [600, 900],  lyh: 60, pik: 120 }
  ];

  /* Kellaaeg numbritega: 8.06, 16.45. */
  function kellNr(min) {
    var h = Math.floor(min / 60) % 24, m = min % 60;
    return h + '.' + (m < 10 ? '0' + m : m);
  }
  function mitu(min) { return min === 1 ? '1 minut' : min + ' minutit'; }
  function aken(a, samm) {
    var v = a[0] + rnd(a[1] - a[0] + 1);
    return Math.round(v / samm) * samm;
  }

  /* Vahe kahe kellaaja vahel. Tunnipiiri ületamisel annab laps kõige sagedamini
     alla, seega vihje teeb selle kahes sammus täistunni kaudu. */
  function vaheVihje(a, b) {
    var pais = 'Kella ' + kellNr(a) + '-st ' + kellNr(b) + '-ni ';
    var tais = (Math.floor(a / 60) + 1) * 60;
    /* Ühe sammuga, kui vahe jääb sama tunni sisse VÕI lõpeb täpselt täistunnil
       — muidu tuleks vihjesse „kella 10.00-st 10.00-ni 0 minutit". */
    if (Math.floor(a / 60) === Math.floor(b / 60) || b === tais) {
      return pais + 'on <b>' + mitu(b - a) + '</b>.';
    }
    return 'Loe täistunni kaudu: kella ' + kellNr(a) + '-st ' + kellNr(tais) + '-ni on ' +
           mitu(tais - a) + ' ja kella ' + kellNr(tais) + '-st ' + kellNr(b) + '-ni ' +
           mitu(b - tais) + '. Kokku <b>' + mitu(b - a) + '</b>.';
  }

  /* Neli lähedast vastust. Üks eksitaja on tüüpviga: tunnipiiri valesti
     lugemine, ehk kella 8.50-st 9.05-ni arvatakse 55 minutit, mitte 15. */
  function minutiValikud(oige) {
    var kand = {};
    [oige + 10, oige - 10, oige + 5, oige - 5, 60 - (oige % 60), oige + 20, oige - 20]
      .forEach(function (v) { if (v > 0 && v < 200 && v !== oige) kand[v] = 1; });
    var k = Object.keys(kand).map(Number);
    k.sort(function (x, y) { return Math.abs(x - oige) - Math.abs(y - oige); });
    return k.slice(0, 3).concat([oige]);
  }

  /* Kellaaja eksitajad on tüüpvead: liitis lahutamise asemel, unustas ühe osa. */
  function aegValikud(oige, algus, kestus) {
    var kand = {};
    [algus + kestus, algus, oige - 60, oige + 5, oige - 5]
      .forEach(function (v) {
        var x = ((v % 1440) + 1440) % 1440;
        if (x !== oige) kand[x] = 1;
      });
    return Object.keys(kand).map(Number).slice(0, 3).concat([oige]);
  }

  /* Silveri hommik kahes sammus. Esimene küsib, palju aega sündmuseni on;
     teine lisab valmistumise ja tee ning küsib, palju vaba aega järele jääb. */
  function hommik() {
    var st = valik(MINEK);
    var syndmus = aken(st.aken, st.oma);
    var ette = 20 + rnd(41);                 // 20–60 minutit varem
    var praegu = syndmus - ette;
    var kulub = valik(st.valmis);
    var jaab = ette - kulub;
    if (jaab < 3) return null;               // muidu ei ole teisel küsimusel mõtet

    return { sammud: [
      {
        lugu: 'Kell on ' + kellNr(praegu) + '. ' + st.algus + ' kell ' + kellNr(syndmus) + '.',
        kysimus: 'Mitu minutit on ' + st.kuni + '?',
        tyyp: 'kestus', numbritega: true, vastus: ette, valikud: minutiValikud(ette),
        vihje: vaheVihje(praegu, syndmus)
      },
      {
        /* Teine samm peab olema iseseisev: esimese loo tekst on juba ekraanilt
           läinud. Kokkuvõte EI tohi kasutada „pärast"-vormi — vt päist, reegel 2. */
        lugu: T.suur(st.kuni) + ' on ' + mitu(ette) + '. Riidesse panemiseks ja ' +
              st.tee + ' minekuks kulub kokku ' + mitu(kulub) + '.',
        kysimus: 'Mitu minutit on sul veel vaba aega?',
        tyyp: 'kestus', numbritega: true, vastus: jaab, valikud: minutiValikud(jaab),
        vihje: 'Aega on ' + mitu(ette) + ', neist ' + mitu(kulub) + ' kulub ära. Jääb <b>' +
               mitu(jaab) + '</b>.'
      }
    ] };
  }

  /* Mis kell tuleb välja minna. Vastus on kellaaeg numbritega. */
  function valjaminek() {
    var st = valik(MINEK);
    var syndmus = aken(st.aken, st.oma);
    var kulub = valik(st.valmis);
    var valja = syndmus - kulub;
    return { sammud: [{
      lugu: st.algus + ' kell ' + kellNr(syndmus) + '. ' + T.suur(st.tee) +
            ' minekuks kulub ' + mitu(kulub) + '.',
      kysimus: 'Mis kell pead kodust välja minema?',
      tyyp: 'kellNr', numbritega: true, vastus: valja, valikud: aegValikud(valja, syndmus, kulub),
      vihje: 'Lahuta teele kuluv aeg: ' + kellNr(syndmus) + ' miinus ' + mitu(kulub) +
             ' on <b>' + kellNr(valja) + '</b>.'
    }] };
  }

  /* Algus ja lõpp numbritega, küsitakse kestust minutites. */
  function kuiKaua() {
    var st = valik(KESTUSED);
    var algus = aken(st.aken, 5);
    var kestus = 5 * Math.round((st.lyh + rnd(st.pik - st.lyh + 1)) / 5);
    var lopp = algus + kestus;
    return { sammud: [{
      lugu: st.n + ' algab kell ' + kellNr(algus) + ' ja lõpeb kell ' + kellNr(lopp) + '.',
      kysimus: 'Mitu minutit ' + st.s + ' kestab?',
      tyyp: 'kestus', numbritega: true, vastus: kestus, valikud: minutiValikud(kestus),
      vihje: vaheVihje(algus, lopp)
    }] };
  }

  function looNr() {
    var t = valik(['hommik', 'hommik', 'valja', 'kaua']);   // Silveri lugu sagedamini
    if (t === 'valja') return valjaminek();
    if (t === 'kaua') return kuiKaua();
    return hommik() || valjaminek();
  }

  T.looNr = looNr;
  T.kellNr = kellNr;
  T.mitu = mitu;
})();
