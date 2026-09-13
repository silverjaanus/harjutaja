/* Kell: elulised tekstülesanded ajaarvutusega.
 *
 * Silveri näide, mis selle tellis: „Kell on praegu 12 ja kolme ja poole tunni
 * pärast läheme kinno — mis kell läheme? Ja kui juurde panna minekuaeg, mis
 * kell peab kodust minema hakkama?" Sellest sai kahesammuline ülesanne.
 *
 * KOLM KEELEREEGLIT, mis siin kogu aeg varitsevad (Fable'i ülevaatus, allikad
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
 */
(function () {
  'use strict';

  var TUND_OM = ['', 'ühe', 'kahe', 'kolme', 'nelja', 'viie', 'kuue',
                 'seitsme', 'kaheksa', 'üheksa', 'kümne', 'üheteistkümne', 'kaheteistkümne'];
  var TUND_NIM = ['', 'üks', 'kaks', 'kolm', 'neli', 'viis', 'kuus',
                  'seitse', 'kaheksa', 'üheksa', 'kümme', 'üksteist', 'kaksteist'];

  /* Kestus numbriga: „20 minutit", „1 tund", „1 tund ja 30 minutit". */
  function kestus(min) {
    if (min % 60 === 0) {
      var h = min / 60;
      return h === 1 ? '1 tund' : h + ' tundi';
    }
    if (min < 60) return min === 1 ? '1 minut' : min + ' minutit';
    var t = Math.floor(min / 60), m = min % 60;
    return (t === 1 ? '1 tund' : t + ' tundi') + ' ja ' + (m === 1 ? '1 minut' : m + ' minutit');
  }

  /* Sama kestus sõnadega, kui see on tundides: „kolm ja pool tundi".
     Vihje kasutab seda, et loo ja vihje sõnastus kokku läheksid. */
  function kestusSonadega(min) {
    var t = Math.floor(min / 60), m = min % 60;
    if (t < 1 || t > 12) return kestus(min);
    if (m === 0) return t === 1 ? 'üks tund' : TUND_NIM[t] + ' tundi';
    if (m === 30) return TUND_NIM[t] + ' ja pool tundi';
    return kestus(min);
  }

  /* „kolme tunni pärast", „kolme ja poole tunni pärast".
     null, kui kestus ei ole tundides — siis ei tohi „pärast" kasutada. */
  function tunniParast(min) {
    if (min < 60 || min > 720) return null;
    var t = Math.floor(min / 60), m = min % 60;
    if (m === 0) return TUND_OM[t] + ' tunni pärast';
    if (m === 30) return TUND_OM[t] + ' ja poole tunni pärast';
    return null;
  }

  /* Stseenid. `n` lause alguses, `s` lause sees. `pikk` ütleb, kas sündmus
     võib kesta tunni või rohkem — 15-minutiline sünnipäevapidu oleks veider. */
  var STSEENID = [
    { n: 'Film', s: 'film', pikk: true },
    { n: 'Trenn', s: 'trenn', pikk: true },
    { n: 'Kontsert', s: 'kontsert', pikk: true },
    { n: 'Etendus', s: 'etendus', pikk: true },
    { n: 'Sünnipäevapidu', s: 'sünnipäevapidu', pikk: true },
    { n: 'Ujumistund', s: 'ujumistund', pikk: false }
  ];
  var LYHIKE = [
    { n: 'Vahetund', s: 'vahetund', pikk: false },
    { n: 'Multikas', s: 'multikas', pikk: false },
    { n: 'Mäng', s: 'mäng', pikk: true }
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
    kestus: kestus, kestusSonadega: kestusSonadega, tunniParast: tunniParast,
    liida: liida, STSEENID: STSEENID, LYHIKE: LYHIKE, valik: valik, rnd: rnd
  };
})();

/* ---------- ülesannete koostamine ---------- */
(function () {
  'use strict';
  var T = window.HTekst, valik = T.valik, rnd = T.rnd;

  /* Kohad kahesammulise ülesande jaoks. `koht` on sisseütlevas:
     „Kinno jõudmiseks kulub 20 minutit." */
  var KAUGED = [
    { n: 'Kinoseanss', s: 'kinoseanss', koht: 'Kinno' },
    { n: 'Trenn', s: 'trenn', koht: 'Trenni' },
    { n: 'Kontsert', s: 'kontsert', koht: 'Kontserdile' },
    { n: 'Etendus', s: 'etendus', koht: 'Teatrisse' },
    { n: 'Sünnipäevapidu', s: 'sünnipäevapidu', koht: 'Peole' }
  ];

  /* Kellaaeg lauses käib alati sõnaga „kell" — vt faili päist, reegel 1. */
  var kell = (h, m) => 'kell ' + HAeg.utle(h, m);

  function suvaAeg(samm) {
    var mins = [];
    for (var m = 0; m < 60; m += samm) mins.push(m);
    return { h: 1 + rnd(12), m: mins[rnd(mins.length)] };
  }

  /* Kestuse kandidaadid võrgus. Neist tulevad nii õige vastus kui valikud,
     nii et ükski valik ei ole sama pikk aeg teises sõnastuses. */
  function kandidaadid(samm) {
    var k = [];
    for (var i = 1; i <= 6 && samm * i <= 180; i++) k.push(samm * i);
    while (k.length < 4) k.push(k[k.length - 1] + samm);
    return k;
  }

  function loo(samm) {
    var tyybid = ['edasi', 'tagasi', 'vahe', 'kaks'];
    var t = valik(tyybid);
    if (t === 'kaks') return kaheSammuga(samm);
    if (t === 'vahe') return kestusUlesanne(samm);

    var kand = kandidaadid(samm).filter(v => v <= 180);
    var k = valik(kand.slice(0, 4));
    var st = valik((k >= 60 ? T.STSEENID.filter(s => s.pikk) : T.STSEENID.concat(T.LYHIKE)));

    if (t === 'edasi') {
      var a = suvaAeg(samm), b = T.liida(a.h, a.m, k);
      return { sammud: [{
        lugu: st.n + ' algab ' + kell(a.h, a.m) + ' ja kestab ' + T.kestus(k) + '.',
        kysimus: 'Mis kell ' + st.s + ' lõpeb?',
        tyyp: 'aeg', vastus: b,
        vihje: 'Algusajale tuleb kestus juurde liita. ' + HAeg.utle(a.h, a.m) + ' pluss ' +
               T.kestus(k) + ' on <b>' + HAeg.utle(b.h, b.m) + '</b>.'
      }] };
    }

    var b2 = suvaAeg(samm), a2 = T.liida(b2.h, b2.m, -k);
    return { sammud: [{
      lugu: st.n + ' lõpeb ' + kell(b2.h, b2.m) + ' ja kestab ' + T.kestus(k) + '.',
      kysimus: 'Mis kell ' + st.s + ' algab?',
      tyyp: 'aeg', vastus: a2,
      vihje: 'Lõpuajast tuleb kestus maha arvata. ' + HAeg.utle(b2.h, b2.m) + ' miinus ' +
             T.kestus(k) + ' on <b>' + HAeg.utle(a2.h, a2.m) + '</b>.'
    }] };
  }

  /* Algus ja lõpp antud, küsitakse kestust. Valikud on õigele kõige lähemad
     kandidaadid, et pikim vastus ei paistaks arvutamata silma. */
  function kestusUlesanne(samm) {
    var kand = kandidaadid(samm);
    var k = valik(kand);
    var lahedad = kand.filter(v => v !== k).sort((x, y) => Math.abs(x - k) - Math.abs(y - k)).slice(0, 3);
    var valikud = lahedad.concat([k]);
    var minutites = Math.max.apply(null, valikud) < 60;
    var st = valik((k >= 60 ? T.STSEENID.filter(s => s.pikk) : T.STSEENID.concat(T.LYHIKE)));
    var a = suvaAeg(samm), b = T.liida(a.h, a.m, k);
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
    var a = suvaAeg(samm);
    /* „pärast" tohib olla ainult tundides — vt faili päist, reegel 2. */
    var tunde = 1 + rnd(4);
    var pool = (samm <= 30 && Math.random() < 0.5) ? 30 : 0;
    var k = tunde * 60 + pool;
    var algus = T.liida(a.h, a.m, k);
    var soit = samm * (1 + rnd(Math.max(1, Math.floor(45 / samm))));
    var valja = T.liida(algus.h, algus.m, -soit);

    return { sammud: [
      {
        lugu: 'Kell on praegu ' + HAeg.utle(a.h, a.m) + '. ' + st.n + ' algab ' + T.tunniParast(k) + '.',
        kysimus: 'Mis kell ' + st.s + ' algab?',
        tyyp: 'aeg', vastus: algus,
        vihje: 'Kell on ' + HAeg.utle(a.h, a.m) + ' ja juurde tuleb ' + T.kestusSonadega(k) +
               ' — siis on kell <b>' + HAeg.utle(algus.h, algus.m) + '</b>.'
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
