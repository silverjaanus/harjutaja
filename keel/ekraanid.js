/* Ekraanisõnade joonistatud ekraanid (plaan: claude/keel-yldplaan.md).

   Päris ekraanipilte ega logosid ei kasutata — ekraan on lihtne joonistus,
   millel on päris äpi nupud päris kohtades ja päris ingliskeelse kirjaga.
   Nupp, mida mäng küsib, on <button class="ek" data-id="<sõna id>">.

   KEkraan.joonista(host, teema)            — ekraan nuppudega (vajuta-samm)
   KEkraan.margi(host, {vajutatud, oige, ok}) — vastuse järel: vajutatud nupp
                                              teeb oma asja, õige nupp roheline
   KEkraan.nupud(host, sonad)               — loe-samm: hallid nupud, ainult kiri */
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
    pluss: '<svg ' + S + '><path d="M12 5v14M5 12h14"/></svg>'
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

  var EKRAANID = { youtube: youtube, minecraft: minecraft };

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

  window.KEkraan = { joonista: joonista, margi: margi, nupud: nupud, EKRAANID: EKRAANID };
})();
