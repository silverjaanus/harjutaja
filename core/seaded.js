/* Harjutaja ühine seadete leht (raamistiku etapp 4, 15. sept 2026).

   Enne oli seadete leht ainult Korrutajas. Liitumisaken ütles „taastekood
   on mängu seadetes", aga Kirjutajas, Kellas ja Teisendajas seadeid polnud
   (Codex, B25). Nüüd on leht igas moodulis sama: heli, muusika (kui
   moodulil on lugu), nimi (kui moodul seda kasutab), klass koos koodi ja
   taastekoodiga, klassist lahkumine, ja lõpus mooduli oma valikud.

   Leht joonistatakse #s-settings sisse, avalehe päises on hammasratta nupp #setBtn.

   Kasutus:
     HSeaded.loo({
       mang, kodu: () => mang.koju(),
       muusika: true, nimi: false,
       liitu: () => HKlass.openJoin({...}),
       lahkus: () => { D.board = null; save(); renderKlass(); },
       lisa: host => {}                    // mooduli oma väljad (Korrutaja)
     });
*/
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  var MALL =
    '<header class="top">' +
      '<button class="icon-btn" id="setBack" aria-label="Tagasi">‹</button>' +
      '<h2 class="scr-title">Seaded</h2>' +
    '</header>' +
    '<div class="field"><div><span class="flabel" id="lSfx">Heli</span><small>Kõlab õige ja vale vastuse peale.</small></div>' +
      '<div class="seg" id="segSfx" role="group" aria-labelledby="lSfx"><button data-v="0">Väljas</button><button data-v="1">Sees</button></div></div>' +
    '<div class="field" id="fMusic" hidden><div><span class="flabel" id="lMusic">Taustamuusika</span><small>Vaikne, mängib ainult harjutamise ajal.</small></div>' +
      '<div class="seg" id="segMusic" role="group" aria-labelledby="lMusic"><button data-v="0">Väljas</button><button data-v="1">Sees</button></div></div>' +
    '<div class="field" id="fName" hidden><div><label class="flabel" for="inName">Nimi</label></div>' +
      '<input type="text" id="inName" maxlength="16" autocomplete="off"></div>' +
    '<div id="setExtra"></div>' +
    '<div class="bcard" id="setClass">' +
      '<span class="label">Klass</span>' +
      '<p class="klass-line" id="setClassName"></p>' +
      '<div id="setCodes">' +
        '<p class="setrow">Klassikood: <b id="setCode"></b></p>' +
        '<p class="setrow">Taastekood: <b id="setSecret"></b></p>' +
        '<p class="hint-small">Kirjuta taastekood üles. Sellega saad oma tulemused tagasi, kui vahetad telefoni.</p>' +
      '</div>' +
      '<div class="row">' +
        '<button class="ghost" id="setJoin">Liitu klassiga</button>' +
        '<button class="ghost" id="setLeave">Lahku klassist</button>' +
      '</div>' +
      '<p class="quitnote" id="setLeaveNote" hidden></p>' +
    '</div>';

  function loo(o) {
    var host = $('s-settings');
    host.innerHTML = MALL;
    if (o.lisa) o.lisa($('setExtra'));

    function seg(id, sees) {
      [].forEach.call($(id).children, function (b) {
        var on = (b.dataset.v === '1') === !!sees;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function joonista() {
      seg('segSfx', HSfx.enabled);
      $('fMusic').hidden = !(o.muusika && window.HMuusika && HMuusika.olemas());
      seg('segMusic', !!HPrefs.get('music'));
      $('fName').hidden = !o.nimi;
      $('inName').value = HPrefs.get('name') || '';
      var c = window.HKlass ? HKlass.current() : null;
      $('setClassName').textContent = c && c.class_name ? c.class_name + ' · ' + (c.nick || '') : 'Sa pole veel klassis.';
      $('setCodes').hidden = !c;
      $('setCode').textContent = c ? c.code : '';
      $('setSecret').textContent = c ? c.secret : '';
      $('setJoin').hidden = !!c;
      $('setLeave').hidden = !c;
      leave.disarm();
    }

    function ava() { joonista(); o.mang.naita('s-settings'); }

    $('segSfx').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if ((b.dataset.v === '1') !== HSfx.enabled) HSfx.toggle();
    });
    $('segMusic').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if ((b.dataset.v === '1') !== !!HPrefs.get('music')) HMuusika.toggle();
    });
    $('inName').addEventListener('input', function () { HPrefs.set('name', this.value.trim()); });
    HPrefs.on(function (n, v) {
      if (n === 'sfx') seg('segSfx', v);
      if (n === 'music') seg('segMusic', v);
    });

    $('setBack').addEventListener('click', function () { o.kodu(); });
    $('setJoin').addEventListener('click', function () { if (o.liitu) o.liitu(); });
    /* Lahkumine on pöördumatu (ilma taastekoodita ei saa tagasi), seega
       kinnitusega nagu ✕ võistluses. */
    var leave = HArm($('setLeave'), {
      armedText: 'Oled kindel? Vajuta veel kord',
      note: $('setLeaveNote'),
      message: 'Kui lahkud, kaob klass sellest telefonist. Klassi saad tagasi ainult klassikoodi, oma nime ja taastekoodiga.',
      action: function () {
        HKlass.clear();
        if (o.lahkus) o.lahkus();
        joonista();
      }
    });
    $('setBtn').addEventListener('click', ava);

    return { ava: ava, joonista: joonista };
  }

  window.HSeaded = { loo: loo };
})();
