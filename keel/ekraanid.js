/* Ekraanisõnade joonistatud ekraanid (plaan: claude/keel-yldplaan.md).

   Päris ekraanipilte ega logosid ei kasutata — ekraan on lihtne joonistus,
   millel on päris äpi nupud päris kohtades ja päris ingliskeelse kirjaga.
   Nupp, mida mäng küsib, on <button class="ek" data-id="<sõna id>">.

   KEkraan.joonista(host, teema)            — ekraan nuppudega (vajuta-samm)
   KEkraan.margi(host, {vajutatud, oige, ok}) — vastuse järel: vajutatud nupp
                                              teeb oma asja, õige nupp roheline
   KEkraan.nupud(host, sonad)               — loe-samm: hallid nupud, ainult kiri
   KEkraan.juhis(host, sona, {vasta, teade}) — juhiste teema: ingliskeelne juhis,
                                              laps puudutab / korjab / hoiab väljal
   KEkraan.margiJuhis(host, {siht, vale})     — juhise vastuse järel */
(function () {
  'use strict';
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  var S = 'viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  var IKOON = {
    maja: '<svg ' + S + '><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>',
    luup: '<svg ' + S + '><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/></svg>',
    poial: '<svg ' + S + '><path class="ek-taide" d="M7 10v10H4V10z"/><path class="ek-taide" d="M7 10l4-7c1.6 0 2.6 1.2 2.3 2.8L12.8 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7"/></svg>',
    nool: '<svg ' + S + '><path d="M14 5l7 6-7 6v-4c-5 0-8 1.5-11 5 1-5 4-9 11-10z"/></svg>',
    alla: '<svg ' + S + '><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>',
    mull: '<svg ' + S + '><path d="M4 5h16v11H9l-5 4z"/></svg>',
    edasi: '<svg ' + S + '><path d="m5 5 8 7-8 7z" fill="currentColor"/><path d="M18 5v14"/></svg>',
    kolmnurk: '<svg ' + S + '><path d="m7 4 13 8-13 8z" fill="currentColor"/></svg>',
    ratas: '<svg ' + S + '><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
    pluss: '<svg ' + S + '><path d="M12 5v14M5 12h14"/></svg>',
    haamer: '<svg ' + S + '><path d="M14 4l6 6-3 3-6-6z"/><path d="M11 7 3 15l3 3 8-8"/></svg>',
    klots: '<svg ' + S + '><path d="M12 3 20 7.5v9L12 21 4 16.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/></svg>',
    noolid: '<svg ' + S + '><path d="M12 3v18M3 12h18"/><path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/></svg>',
    poora: '<svg ' + S + '><path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/></svg>',
    prygi: '<svg ' + S + '><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    pintsel: '<svg ' + S + '><path d="M18 3l3 3-9 9-3-3z"/><path d="M9 12c-3 0-5 2-5 5 0 1-1 2-2 2 4 2 9 1 9-4"/></svg>',
    tagasi: '<svg ' + S + '><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    ketas: '<svg ' + S + '><path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/></svg>',
    kott: '<svg ' + S + '><path d="M6 8h12l1 13H5z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    lipp: '<svg ' + S + '><path d="M5 21V4"/><path d="M5 4h12l-3 4 3 4H5"/></svg>',
    inimesed: '<svg ' + S + '><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c2.8 0 5 2 5 5"/></svg>'
  };

  function nupp(sona, klass, sisu) {
    return '<button class="ek ' + klass + '" data-id="' + esc(sona.id) + '">' + sisu + '</button>';
  }
  function leia(teema, en) {
    for (var i = 0; i < teema.sonad.length; i++) if (teema.sonad[i].en === en) return teema.sonad[i];
    return { id: '', en: en };
  }
  function kiri(ikoon, en) {
    return (ikoon ? IKOON[ikoon] : '') + '<span>' + esc(en) + '</span>';
  }

  /* ---------- YouTube: video lehekülg telefonis ---------- */
  function youtube(t) {
    var w = function (en) { return leia(t, en); };
    return '<div class="ekraan yt">' +
      '<div class="yt-pais"><b class="yt-nimi">YouTube</b>' +
        nupp(w('Search'), 'yt-otsi', kiri('luup', 'Search')) + '</div>' +
      '<div class="yt-otsirida" aria-hidden="true"><span class="yt-kursor"></span></div>' +
      '<div class="yt-video">' +
        '<svg class="yt-pilt" viewBox="0 0 320 180" aria-hidden="true">' +
          '<rect width="320" height="180" fill="#7fc4f0"/><circle cx="262" cy="42" r="20" fill="#ffe27a"/>' +
          '<path d="M0 132 60 96l50 26 60-44 70 40 80-28v90H0z" fill="#6fbf5b"/>' +
          '<path d="M0 150h320v30H0z" fill="#8b6a3e"/>' +
          '<rect x="120" y="92" width="44" height="44" fill="#9a9a9a" stroke="#555" stroke-width="3"/>' +
          '<rect x="164" y="92" width="44" height="44" fill="#b0b0b0" stroke="#555" stroke-width="3"/>' +
          '<rect x="142" y="48" width="44" height="44" fill="#a5a5a5" stroke="#555" stroke-width="3"/>' +
        '</svg>' +
        '<div class="yt-reklaam"><span class="yt-ad">Ad</span>' +
          nupp(w('Skip'), 'yt-skip', '<span>Skip</span>' + IKOON.edasi) + '</div>' +
      '</div>' +
      '<p class="yt-pealkiri">How to build a stone castle</p>' +
      '<div class="yt-kanal"><i class="yt-avatar" aria-hidden="true"></i>' +
        '<span class="yt-kanalinimi">Blocky Builder<small>52K</small></span>' +
        nupp(w('Subscribe'), 'yt-telli', '<span class="yt-t1">Subscribe</span><span class="yt-t2">Subscribed</span>') + '</div>' +
      '<div class="yt-tegevused">' +
        nupp(w('Like'), 'yt-pill yt-like', kiri('poial', 'Like') + '<small class="yt-arv">1,2K</small>') +
        nupp(w('Share'), 'yt-pill', kiri('nool', 'Share')) +
        nupp(w('Download'), 'yt-pill', kiri('alla', 'Download')) +
      '</div>' +
      nupp(w('Comments'), 'yt-kommentaarid', '<span class="yt-kom-pais">' + IKOON.mull + '<span>Comments</span><small>128</small></span>' +
        '<span class="yt-kom-rida"><i></i><em>Wow, so cool!</em></span>') +
      '<div class="yt-alla">' +
        nupp(w('Home'), 'yt-home', kiri('maja', 'Home')) +
        '<span class="yt-tyhi" aria-hidden="true"><i></i></span><span class="yt-tyhi" aria-hidden="true"><i></i></span><span class="yt-tyhi" aria-hidden="true"><i></i></span>' +
      '</div>' +
    '</div>';
  }

  /* ---------- Minecraft: menüü, uue maailma valikud ja surmaaken ---------- */
  function minecraft(t) {
    var w = function (en) { return leia(t, en); };
    return '<div class="ekraan mc">' +
      '<p class="mc-nimi">MINECRAFT</p>' +
      '<div class="mc-menyy">' +
        nupp(w('Play'), 'mc-nupp mc-suur', kiri('kolmnurk', 'Play')) +
        nupp(w('Settings'), 'mc-nupp', kiri('ratas', 'Settings')) +
      '</div>' +
      '<div class="mc-paneel">' +
        '<div class="mc-rida">' + nupp(w('Create New'), 'mc-nupp mc-roheline', kiri('pluss', 'Create New')) + '</div>' +
        '<span class="mc-silt">Game Mode</span>' +
        '<div class="mc-rida">' + nupp(w('Survival'), 'mc-nupp mc-valik', '<span>Survival</span>') +
          nupp(w('Creative'), 'mc-nupp mc-valik', '<span>Creative</span>') + '</div>' +
        '<span class="mc-silt">Difficulty</span>' +
        '<div class="mc-rida">' + nupp(w('Easy'), 'mc-nupp mc-valik', '<span>Easy</span>') +
          nupp(w('Hard'), 'mc-nupp mc-valik', '<span>Hard</span>') + '</div>' +
      '</div>' +
      '<div class="mc-surm"><p>You died!</p>' +
        '<span class="mc-sydamed" aria-hidden="true">' + new Array(6).join('<i></i>') + '</span>' +
        nupp(w('Respawn'), 'mc-nupp', '<span>Respawn</span>') + '</div>' +
    '</div>';
  }


  /* ---------- Roblox: mängu leht, sõbrad ja mängusisene menüü ---------- */
  function roblox(t) {
    var w = function (en) { return leia(t, en); };
    return '<div class="ekraan rb">' +
      '<div class="rb-pais">' + nupp(w('Chat'), 'rb-ikoon', kiri('mull', 'Chat')) +
        '<span class="rb-tyhi"></span>' + nupp(w('Settings'), 'rb-ikoon', kiri('ratas', 'Settings')) + '</div>' +
      '<div class="rb-kaart">' +
        '<svg class="rb-pilt" viewBox="0 0 320 120" aria-hidden="true"><rect width="320" height="120" fill="#5aa9e6"/>' +
          '<rect x="30" y="80" width="40" height="40" fill="#e84a5f"/><rect x="90" y="60" width="40" height="60" fill="#f7b32b"/>' +
          '<rect x="150" y="40" width="40" height="80" fill="#2ec4b6"/><rect x="210" y="20" width="40" height="100" fill="#9b5de5"/>' +
          '<rect x="228" y="4" width="8" height="16" fill="#fff"/></svg>' +
        '<p class="rb-nimi">Tower Obby</p>' +
        nupp(w('Play'), 'rb-play', kiri('kolmnurk', 'Play')) +
      '</div>' +
      '<div class="rb-sobrad">' + nupp(w('Friends'), 'rb-link', kiri('inimesed', 'Friends')) +
        '<div class="rb-sober"><i class="rb-avatar" aria-hidden="true"></i><span>Sam_builds<small>Tower Obby</small></span>' +
          nupp(w('Join'), 'rb-join', '<span>Join</span>') + '</div></div>' +
      '<div class="rb-menyy"><p class="rb-menyy-nimi">Game Menu</p>' +
        nupp(w('Resume'), 'rb-mnupp rb-sinine', '<span>Resume</span>') +
        nupp(w('Reset Character'), 'rb-mnupp', '<span>Reset Character</span>') +
        nupp(w('Leave'), 'rb-mnupp', '<span>Leave</span>') + '</div>' +
    '</div>';
  }

  /* ---------- Ehitamine: ehitusplats ja tööriistariba ---------- */
  function ehitamine(t) {
    var w = function (en) { return leia(t, en); };
    var riist = function (en, ik) { return nupp(w(en), 'eh-riist', IKOON[ik] + '<span>' + esc(en) + '</span>'); };
    return '<div class="ekraan eh">' +
      '<div class="eh-plats">' +
        '<svg class="eh-maja" viewBox="0 0 160 120" aria-hidden="true">' +
          '<path class="eh-katus" d="M20 50 80 12l60 38z" fill="#c0504d" stroke="#3a2a1a" stroke-width="3"/>' +
          '<rect class="eh-sein" x="30" y="50" width="100" height="62" fill="#e9d7b5" stroke="#3a2a1a" stroke-width="3"/>' +
          '<rect x="48" y="66" width="26" height="22" fill="#9fd3f0" stroke="#3a2a1a" stroke-width="3"/>' +
          '<rect x="92" y="72" width="22" height="40" fill="#8b5a2b" stroke="#3a2a1a" stroke-width="3"/>' +
          '<rect class="eh-uus" x="136" y="92" width="20" height="20" fill="#7cc36b" stroke="#3a2a1a" stroke-width="3"/>' +
        '</svg>' +
        '<span class="eh-teade">Saved</span>' +
      '</div>' +
      '<div class="eh-riba">' +
        riist('Build', 'haamer') + riist('Place', 'klots') + riist('Move', 'noolid') + riist('Rotate', 'poora') +
        riist('Delete', 'prygi') + riist('Paint', 'pintsel') + riist('Undo', 'tagasi') + riist('Save', 'ketas') +
      '</div>' +
    '</div>';
  }

  /* ---------- Tasemed ja auhinnad: mängu ekraan tasemete, müntide ja ülesandega ---------- */
  function edasi(t) {
    var w = function (en) { return leia(t, en); };
    return '<div class="ekraan ed">' +
      '<div class="ed-hud">' +
        nupp(w('Level'), 'ed-silt', '<span>Level</span><b>7</b>') +
        nupp(w('Coins'), 'ed-silt ed-kuld', '<i class="ed-munt" aria-hidden="true"></i><span>Coins</span><b>250</b>') +
        nupp(w('Inventory'), 'ed-silt', IKOON.kott + '<span>Inventory</span>') +
      '</div>' +
      nupp(w('Level Up'), 'ed-banner', '<span>Level Up!</span>') +
      '<div class="ed-paneel">' + nupp(w('Quest'), 'ed-pealkiri', IKOON.lipp + '<span>Quest</span>') +
        '<p class="ed-tekst">Collect 10 apples <b>6/10</b></p></div>' +
      '<div class="ed-rida">' +
        '<div class="ed-ese"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M26 4h6v28h-6z" fill="#cfd8e3" stroke="#445" stroke-width="2"/><path d="M18 32h22v4H18z" fill="#8b5a2b"/><path d="M26 36h6v8h-6z" fill="#6b4a2e"/></svg>' +
          nupp(w('Equip'), 'ed-nupp', '<span>Equip</span>') + '</div>' +
        '<div class="ed-ese"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="18" width="36" height="24" rx="3" fill="#b97a3c" stroke="#5a3a1a" stroke-width="2"/><path d="M6 18q18-14 36 0z" fill="#d49a58" stroke="#5a3a1a" stroke-width="2"/><rect x="20" y="24" width="8" height="8" fill="#f3c445"/></svg>' +
          nupp(w('Reward'), 'ed-nupp ed-kuld', '<span>Reward</span>') + '</div>' +
      '</div>' +
      nupp(w('Next'), 'ed-next', '<span>Next</span>' + IKOON.edasi) +
    '</div>';
  }

  /* ---------- Ettevaatust: reklaam, pood, kutse ja võõra mängija kaart ---------- */
  function ettevaatust(t) {
    var w = function (en) { return leia(t, en); };
    return '<div class="ekraan oh">' +
      '<div class="oh-reklaam">' + nupp(w('Ad'), 'oh-ad', '<span>Ad</span>') +
        '<p class="oh-suur">' + nupp(w('Free'), 'oh-free', '<span>FREE</span>') + ' <span>ROBUX!</span></p>' +
        '<p class="oh-vaike">Click here now!</p></div>' +
      '<div class="oh-pood"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 40 36 12l4 4-28 28z" fill="#9b5de5" stroke="#333" stroke-width="2"/><path d="M34 8l6 6" stroke="#f3c445" stroke-width="4"/></svg>' +
        '<span class="oh-ese">Magic Sword<small>99 R$</small></span>' + nupp(w('Buy'), 'oh-osta', '<span>Buy</span>') + '</div>' +
      '<div class="oh-kutse">' + nupp(w('Invite'), 'oh-pealkiri', '<span>Invite</span>') +
        '<p><b>xX_Stranger_Xx</b> wants to play with you.</p>' +
        '<div class="oh-nupud">' + nupp(w('Accept'), 'oh-roheline', '<span>Accept</span>') +
          nupp(w('Decline'), 'oh-hall', '<span>Decline</span>') + '</div></div>' +
      '<div class="oh-mangija"><i class="rb-avatar oh-voor" aria-hidden="true"></i><span>xX_Stranger_Xx</span>' +
        nupp(w('Report'), 'oh-punane', '<span>Report</span>') + nupp(w('Block'), 'oh-hall', '<span>Block</span>') + '</div>' +
    '</div>';
  }

  /* ---------- Juhised: ingliskeelne mängujuhis, laps teeb seda väljal ---------- */
  var ASI = {
    star: '<path d="M24 5l5.6 12 13 1.4-9.7 8.8 2.7 12.8L24 33.5 12.4 40l2.7-12.8L5.4 18.4l13-1.4z" fill="#f7c948" stroke="#b8860b" stroke-width="2"/>',
    coin: '<circle cx="24" cy="24" r="16" fill="#f3c445" stroke="#b8860b" stroke-width="3"/><circle cx="24" cy="24" r="9" fill="none" stroke="#b8860b" stroke-width="2"/>',
    key: '<circle cx="15" cy="24" r="8" fill="none" stroke="#c9a227" stroke-width="5"/><path d="M23 24h20M36 24v7M42 24v6" stroke="#c9a227" stroke-width="5"/>',
    heart: '<path d="M24 41 8 25a9 9 0 0 1 16-11 9 9 0 0 1 16 11z" fill="#e84a5f" stroke="#a02a3a" stroke-width="2"/>',
    button: '<circle cx="24" cy="26" r="17" fill="#b02a2a"/><circle cx="24" cy="22" r="17" fill="#e84a5f" stroke="#8a1f1f" stroke-width="2"/>',
    bush: '<circle cx="15" cy="28" r="11" fill="#4c9a3f"/><circle cx="33" cy="28" r="11" fill="#4c9a3f"/><circle cx="24" cy="18" r="12" fill="#5cb24d"/>',
    gem: '<path d="M12 18 18 8h12l6 10-12 22z" fill="#5bc0eb" stroke="#1f6f99" stroke-width="2"/>',
    opendoor: '<rect x="10" y="6" width="28" height="38" fill="#3a2a1a"/><path d="M10 6 26 10v38L10 44z" fill="#b97a3c" stroke="#5a3a1a" stroke-width="2"/>',
    lockeddoor: '<rect x="10" y="6" width="28" height="38" fill="#b97a3c" stroke="#5a3a1a" stroke-width="2"/><rect x="18" y="24" width="12" height="10" fill="#888" stroke="#333" stroke-width="2"/><path d="M20 24v-4a4 4 0 0 1 8 0v4" fill="none" stroke="#333" stroke-width="2"/>',
    chest: '<rect x="6" y="20" width="36" height="22" rx="3" fill="#b97a3c" stroke="#5a3a1a" stroke-width="2"/><path d="M6 20q18-14 36 0z" fill="#d49a58" stroke="#5a3a1a" stroke-width="2"/><rect x="20" y="24" width="8" height="8" fill="#f3c445"/>',
    shield: '<path d="M24 5 40 11v12c0 10-7 17-16 20C15 40 8 33 8 23V11z" fill="#5b8def" stroke="#244a99" stroke-width="2"/>',
    sword: '<path d="M26 4h6v28h-6z" fill="#cfd8e3" stroke="#445" stroke-width="2"/><path d="M18 32h22v4H18z" fill="#8b5a2b"/><path d="M26 36h6v8h-6z" fill="#6b4a2e"/>',
    bow: '<path d="M14 4q24 20 0 40" fill="none" stroke="#8b5a2b" stroke-width="4"/><path d="M14 4v40" stroke="#ddd" stroke-width="2"/>',
    flag: '<path d="M12 44V4" stroke="#555" stroke-width="3"/><path d="M12 5h24l-6 7 6 7H12z" fill="#2ec4b6" stroke="#1a7a70" stroke-width="2"/>'
  };
  var RADA = {
    lavapath: '<svg viewBox="0 0 120 60" aria-hidden="true"><rect width="120" height="60" fill="#3a2a2a"/><path d="M0 20q30-12 60 0t60 0v20q-30 12-60 0t-60 0z" fill="#ff6a13"/><path d="M10 30h100" stroke="#ffd166" stroke-width="4" stroke-dasharray="6 8"/></svg>',
    grasspath: '<svg viewBox="0 0 120 60" aria-hidden="true"><rect width="120" height="60" fill="#6fbf5b"/><path d="M0 22h120v16H0z" fill="#c9a36b"/><path d="M10 30h100" stroke="#8b6a3e" stroke-width="3" stroke-dasharray="6 8"/></svg>'
  };

  /* Juhise väli. o.vasta(v): v = sõna id (tehtud) või "vale:<asi>". o.teade(tekst): vihje lapsele. */
  function juhis(host, sona, o) {
    var mitu = sona.mitu || 1, korjatud = 0, HOIA_MS = 900;
    /* Asjad on iga kord eri kohtades, et laps ei jätaks meelde ainult kohta. */
    var asjad = sona.stseen.slice();
    for (var k = asjad.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)); var x = asjad[k]; asjad[k] = asjad[j]; asjad[j] = x; }
    host.innerHTML = '<div class="ekraan ju">' +
      (mitu > 1 ? '<p class="ju-loendur" id="juLoendur">0 / ' + mitu + '</p>' : '') +
      '<div class="ju-vali' + (sona.stseen.some(function (a) { return RADA[a]; }) ? ' ju-rajad' : '') + '">' +
      asjad.map(function (a, i) {
        var sisu = RADA[a] || '<svg viewBox="0 0 48 48" aria-hidden="true">' + (ASI[a] || '') + '</svg>';
        return '<button class="jo' + (RADA[a] ? ' jo-rada' : '') + '" data-t="' + esc(a) + '" data-i="' + i + '">' + sisu +
          (sona.hoia && a === sona.siht ? '<i class="jo-taitub"></i>' : '') + '</button>';
      }).join('') + '</div></div>';
    var valmis = false;
    function tee(v) { if (valmis) return; valmis = true; o.vasta(v); }
    host.querySelectorAll('button.jo').forEach(function (b) {
      var t = b.dataset.t;
      if (t === sona.siht && sona.hoia) {
        var taimer = null, hoitud = false;
        var alga = function (e) {
          if (valmis || b.disabled) return;
          if (e && e.preventDefault) e.preventDefault();
          hoitud = false;
          b.classList.add('hoian');
          taimer = setTimeout(function () { hoitud = true; b.classList.remove('hoian'); tee(sona.id); }, HOIA_MS);
        };
        var lopp = function () {
          if (!taimer) return;
          clearTimeout(taimer); taimer = null;
          b.classList.remove('hoian');
          if (!hoitud && !valmis && o.teade) o.teade('Hoia sõrme kauem all.');
        };
        b.addEventListener('pointerdown', alga);
        b.addEventListener('pointerup', lopp);
        b.addEventListener('pointerleave', lopp);
        b.addEventListener('pointercancel', lopp);
        b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        return;
      }
      b.addEventListener('click', function () {
        if (valmis || b.disabled) return;
        if (t !== sona.siht) { tee('vale:' + t); return; }
        korjatud++;
        if (mitu > 1) {
          b.classList.add('korjatud'); b.disabled = true;
          var l = host.querySelector('#juLoendur'); if (l) l.textContent = korjatud + ' / ' + mitu;
        }
        if (korjatud >= mitu) tee(sona.id);
      });
    });
  }

  function margiJuhis(host, o) {
    host.querySelectorAll('button.jo').forEach(function (b) {
      b.disabled = true;
      var t = b.dataset.t;
      if (t === o.siht && !b.classList.contains('korjatud')) b.classList.add('oige');
      if (o.vale && t === o.vale) b.classList.add('vale');
    });
  }

  var EKRAANID = { youtube: youtube, minecraft: minecraft, roblox: roblox, ehitamine: ehitamine, edasi: edasi, ettevaatust: ettevaatust };

  function joonista(host, teema) {
    var f = EKRAANID[teema.ekraan];
    host.innerHTML = f ? f(teema) : '';
    return host.firstChild;
  }

  function margi(host, o) {
    var e = host.querySelector('.ekraan') || host;
    host.querySelectorAll('button.ek').forEach(function (b) {
      b.disabled = true;
      var id = b.dataset.id;
      b.classList.toggle('vajutatud', id === o.vajutatud);
      b.classList.toggle('oige', id === o.oige);
      b.classList.toggle('vale', id === o.vajutatud && !o.ok);
    });
    /* Vajutatud nupp teeb oma asja, ka siis, kui see oli vale nupp. */
    if (o.vajutatud) e.classList.add('tehtud-' + o.vajutatud);
  }

  /* Loe-samm: ainult kiri, kõik ühte värvi, järjekord segamini (sonad.js). */
  function nupud(host, sonad) {
    host.innerHTML = '<div class="ek-nupud">' + sonad.map(function (s) {
      return '<button class="ek ek-hall" data-id="' + esc(s.id) + '">' + esc(s.en) + '</button>';
    }).join('') + '</div>';
  }

  window.KEkraan = { joonista: joonista, margi: margi, nupud: nupud, juhis: juhis, margiJuhis: margiJuhis, EKRAANID: EKRAANID, ASI: ASI, RADA: RADA };
})();
