/* Kell: elulised tekstülesanded ajaarvutusega.
 *
 * Silveri näide, mis selle tellis: „Kell on praegu 12 ja kolme ja poole tunni
 * pärast läheme kinno — mis kell läheme? Ja kui juurde panna minekuaeg, mis
 * kell peab kodust minema hakkama?" Sellest sai kahesammuline ülesanne.
 *
 * KEELELÕKS, mis siin kogu aeg varitseb (Fable'i ülevaatus, allikad failis
 * claude/kell-ajaarvutus-keelereeglid.md): kellaaja vorm „kahekümne minuti
 * pärast neli" (= 3.40) ON sõna-sõnalt kestuskonstruktsioon. Seega:
 *
 *   - „N MINUTI pärast" ei tohi tekstülesandes esineda — laps ei tea, kas
 *     jutt on kestusest või kellaajast. Nendel juhtudel „kestab" või „hiljem".
 *   - „N TUNNI pärast" on ohutu, sest tunninime järele ei tule — ja see on
 *     ka kõige loomulikum eesti keel („kolme ja poole tunni pärast").
 *
 * Teine lõks: 15/30/45 minutit võib öelda ka „veerand/pool/kolmveerand
 * tundi". Mõlemad on õiged, seega ei tohi neid valikvastustes vastandada —
 * küsimus on alati „Mitu minutit …?", mis nõuab minutivormi.
 *
 * Kellaajaväljend jääb lauses alati NIMETAVASSE („Film algab veerand neli"),
 * sest kood ei oska seda käänata. Seepärast ei tohi mallides olla „kuni",
 * „-ni", „paiku" ega „ajal".
 */
(function () {
  'use strict';

  var TUND_OM = ['', 'ühe', 'kahe', 'kolme', 'nelja', 'viie', 'kuue',
                 'seitsme', 'kaheksa', 'üheksa', 'kümne', 'üheteistkümne', 'kaheteistkümne'];

  /* Kestus nimetavas: „20 minutit", „1 tund", „2 tundi", „1 tund ja 30 minutit".
     Number kirjutatakse numbriga, sõna täispikalt — nii on õpikutes. */
  function kestus(min) {
    if (min % 60 === 0) {
      var h = min / 60;
      return h === 1 ? '1 tund' : h + ' tundi';
    }
    if (min < 60) return min === 1 ? '1 minut' : min + ' minutit';
    var t = Math.floor(min / 60), m = min % 60;
    return (t === 1 ? '1 tund' : t + ' tundi') + ' ja ' + (m === 1 ? '1 minut' : m + ' minutit');
  }

  /* „kolme tunni pärast", „kolme ja poole tunni pärast".
     Tagastab null, kui kestus ei ole tundides — siis ei tohi „pärast" kasutada. */
  function tunniParast(min) {
    if (min < 60 || min > 720) return null;
    var t = Math.floor(min / 60), m = min % 60;
    if (m === 0) return TUND_OM[t] + ' tunni pärast';
    if (m === 30) return TUND_OM[t] + ' ja poole tunni pärast';
    return null;
  }

  /* Stseenid. `n` on nimetav lause alguses, `s` sama sõna lause sees. */
  var STSEENID = [
    { n: 'Film', s: 'film' },
    { n: 'Trenn', s: 'trenn' },
    { n: 'Kontsert', s: 'kontsert' },
    { n: 'Etendus', s: 'etendus' },
    { n: 'Sünnipäevapidu', s: 'pidu' },
    { n: 'Ujumistund', s: 'ujumistund' }
  ];
  var LYHIKE = [
    { n: 'Vahetund', s: 'vahetund' },
    { n: 'Multikas', s: 'multikas' },
    { n: 'Mäng', s: 'mäng' }
  ];

  var rnd = n => Math.floor(Math.random() * n);
  var valik = a => a[rnd(a.length)];

  function liida(h, m, delta) {
    var kokku = ((h % 12) * 60 + m + delta) % 720;
    if (kokku < 0) kokku += 720;
    var hh = Math.floor(kokku / 60);
    return { h: hh === 0 ? 12 : hh, m: kokku % 60 };
  }

  window.HTekst = { kestus: kestus, tunniParast: tunniParast, liida: liida, STSEENID: STSEENID, LYHIKE: LYHIKE, valik: valik, rnd: rnd };
})();

/* ---------- ülesannete koostamine ---------- */
(function () {
  'use strict';
  var T = window.HTekst, valik = T.valik, rnd = T.rnd;

  /* Kohad kahesammulise ülesande jaoks. `koht` on sisseütlevas:
     „Kinno jõudmiseks kulub 20 minutit." */
  var KAUGED = [
    { n: 'Kinoseanss', s: 'seanss', koht: 'Kinno' },
    { n: 'Trenn', s: 'trenn', koht: 'Trenni' },
    { n: 'Kontsert', s: 'kontsert', koht: 'Kontserdile' },
    { n: 'Etendus', s: 'etendus', koht: 'Teatrisse' },
    { n: 'Sünnipäevapidu', s: 'pidu', koht: 'Peole' }
  ];

  var aeg = (h, m) => HAeg.utle(h, m);

  /* Kestus, mis on samm-võrgus ja mahub antud piiridesse. */
  function suvaKestus(samm, minKordi, maxKordi) {
    return samm * (minKordi + rnd(maxKordi - minKordi + 1));
  }
  function suvaAeg(samm) {
    var mins = [];
    for (var m = 0; m < 60; m += samm) mins.push(m);
    return { h: 1 + rnd(12), m: mins[rnd(mins.length)] };
  }

  /* Üks lugu = üks või kaks küsimust. Tagastab:
     { sammud: [ {lugu, kysimus, tyyp:'aeg'|'kestus', vastus} ] } */
  function loo(samm) {
    var tyybid = ['edasi', 'tagasi', 'vahe', 'kaks'];
    if (samm >= 60) tyybid = ['edasi', 'tagasi', 'kaks'];   // „mitu minutit" ei sobi tundide juures
    var t = valik(tyybid);

    if (t === 'kaks') return kaheSammuga(samm);

    var st = valik(t === 'vahe' ? T.LYHIKE.concat(T.STSEENID) : T.STSEENID);

    if (t === 'edasi') {
      var a = suvaAeg(samm), k = suvaKestus(samm, 1, samm >= 60 ? 3 : 4);
      var b = T.liida(a.h, a.m, k);
      return { sammud: [{
        lugu: st.n + ' algab ' + aeg(a.h, a.m) + ' ja kestab ' + T.kestus(k) + '.',
        kysimus: 'Mis kell ' + st.s + ' lõpeb?',
        tyyp: 'aeg', vastus: b,
        vihje: 'Alguse juurde tuleb kestus <b>liita</b>. Kell on ' + aeg(a.h, a.m) +
               ' ja juurde tuleb ' + T.kestus(k) + ' — siis on kell <b>' + aeg(b.h, b.m) + '</b>.'
      }] };
    }

    if (t === 'tagasi') {
      var b2 = suvaAeg(samm), k2 = suvaKestus(samm, 1, samm >= 60 ? 3 : 4);
      var a2 = T.liida(b2.h, b2.m, -k2);
      return { sammud: [{
        lugu: st.n + ' lõpeb ' + aeg(b2.h, b2.m) + ' ja kestab ' + T.kestus(k2) + '.',
        kysimus: 'Mis kell ' + st.s + ' algab?',
        tyyp: 'aeg', vastus: a2,
        vihje: 'Lõpust tuleb kestus <b>maha võtta</b>. Kell ' + aeg(b2.h, b2.m) + ' miinus ' +
               T.kestus(k2) + ' teeb <b>' + aeg(a2.h, a2.m) + '</b>.'
      }] };
    }

    /* vahe: neli valikut tulevad kõik samast võrgust, nii et ükski neist ei ole
       sama pikk aeg teises sõnastuses. Kui mõni valik ulatub tunnini, ei saa
       küsida „Mitu minutit?" — siis on küsimus „Kui kaua?". */
    var kand = [];
    for (var i = 1; i <= 5 && samm * i <= 180; i++) kand.push(samm * i);
    while (kand.length < 4) kand.push(kand[kand.length - 1] + samm);
    var k3 = valik(kand);
    var minutites = kand[kand.length - 1] < 60;
    var a3 = suvaAeg(samm), b3 = T.liida(a3.h, a3.m, k3);
    return { sammud: [{
      lugu: st.n + ' algab ' + aeg(a3.h, a3.m) + ' ja lõpeb ' + aeg(b3.h, b3.m) + '.',
      kysimus: (minutites ? 'Mitu minutit ' : 'Kui kaua ') + st.s + ' kestab?',
      tyyp: 'kestus', vastus: k3, valikud: kand,
      vihje: 'Loe algusest lõpuni: ' + aeg(a3.h, a3.m) + ' → ' + aeg(b3.h, b3.m) +
             ' on <b>' + T.kestus(k3) + '</b>.'
    }] };
  }

  /* Silveri näide: praegu on kell X, sündmus on Y tunni pärast, ja kui juurde
     tuleb minekuaeg, siis mis kell tuleb kodunt välja minna. */
  function kaheSammuga(samm) {
    var st = valik(KAUGED);
    var a = suvaAeg(samm);
    /* „pärast" tohib olla ainult tundides — vt faili päist. */
    var tunde = 1 + rnd(4);
    var pool = (samm <= 30 && Math.random() < 0.5) ? 30 : 0;
    var k = tunde * 60 + pool;
    var algus = T.liida(a.h, a.m, k);
    var soit = suvaKestus(samm, 1, Math.max(1, Math.floor(45 / samm)));
    var valja = T.liida(algus.h, algus.m, -soit);

    return { sammud: [
      {
        lugu: 'Kell on praegu ' + aeg(a.h, a.m) + '. ' + st.n + ' algab ' + T.tunniParast(k) + '.',
        kysimus: 'Mis kell ' + st.s + ' algab?',
        tyyp: 'aeg', vastus: algus,
        vihje: 'Kell on ' + aeg(a.h, a.m) + ' ja juurde tuleb ' + T.kestus(k) +
               ' — siis on kell <b>' + aeg(algus.h, algus.m) + '</b>.'
      },
      {
        lugu: st.n + ' algab ' + aeg(algus.h, algus.m) + '. ' + st.koht + ' jõudmiseks kulub ' + T.kestus(soit) + '.',
        kysimus: 'Mis kell pead kodust välja minema?',
        tyyp: 'aeg', vastus: valja,
        vihje: 'Kohal pead olema ' + aeg(algus.h, algus.m) + '. Tee võtab ' + T.kestus(soit) +
               ', seega tuleb välja minna <b>' + aeg(valja.h, valja.m) + '</b>.'
      }
    ] };
  }

  /* Kestuse eksitajad: naaberväärtused samas võrgus, mitte kunagi sama pikk
     aeg teises sõnastuses. */
  function kestusEksitajad(k, samm) {
    var out = [], seen = {};
    seen[k] = 1;
    var lisa = function (v) { if (v > 0 && v < 60 && !seen[v]) { seen[v] = 1; out.push(v); } };
    lisa(k + samm);
    lisa(k - samm);
    lisa(k + 2 * samm);
    lisa(k - 2 * samm);
    var kaitse = 0;
    while (out.length < 3 && kaitse++ < 60) lisa(samm * (1 + rnd(Math.floor(55 / samm))));
    return out.slice(0, 3);
  }

  T.loo = loo;
  T.kestusEksitajad = kestusEksitajad;
})();
