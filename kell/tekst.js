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
