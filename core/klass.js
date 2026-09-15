/* Harjutaja ühine tuum: klassi identiteet.
 *
 * Üks klassikonto kehtib kõigis moodulites. Seepärast elab identiteet
 * omaette localStorage võtmes, mitte ühegi mooduli andmeploki sees.
 * Varem oli ta Korrutaja `korrutaja_v1` ploki küljes ja Kirjutaja ei näinud
 * seda üldse.
 *
 * HOIATUS: `secret` on ainus võti klassikontole ja elab ainult selles
 * brauseris. Kui see kaob, on klassiliikmesus lõplikult läinud —
 * `restore_player` tahab sedasama saladust. Siinne kood ei kustuta kunagi
 * vana asukohta; kolimine on ainult lisav.
 */
(function () {
  'use strict';

  var KEY = 'harjutaja_id_v1';
  var LEGACY = 'korrutaja_v1';
  var SB = { url: '', key: '' };

  function valid(c) {
    return !!(c && typeof c.player_id === 'string' && c.player_id &&
              typeof c.secret === 'string' && c.secret);
  }

  function pick(c) {
    if (!valid(c)) return null;
    return {
      player_id: c.player_id, secret: c.secret,
      class_id: c.class_id || null, class_name: c.class_name || '',
      code: c.code || '', nick: c.nick || ''
    };
  }

  function read() {
    try { var r = localStorage.getItem(KEY); return r ? pick(JSON.parse(r)) : null; }
    catch (e) { return null; }
  }

  function write(c) {
    var v = pick(c);
    if (!v) return null;
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
    return v;
  }

  /* Lahkumine jätab maha märgi, KES lahkus. Ilma selleta tõstis current()
     Korrutaja vanast asukohast sama konto kohe tagasi ja „Lahku klassist"
     ei teinud midagi (Codex, B26). Märk kehtib ainult sellele kontole:
     uue klassiga liitumine kirjutab ta üle. */
  var LAHKUS = 'harjutaja_lahkus_v1';
  function lahkunud() { try { return localStorage.getItem(LAHKUS) || ''; } catch (e) { return ''; } }
  function clear() {
    var c = read();
    try {
      if (c) localStorage.setItem(LAHKUS, c.player_id);
      localStorage.removeItem(KEY);
    } catch (e) {}
  }

  /* Korrutaja vana asukoht. Loeme, aga ei kirjuta ega kustuta. */
  function legacy() {
    try {
      var r = localStorage.getItem(LEGACY);
      return r ? pick(JSON.parse(r).cls) : null;
    } catch (e) { return null; }
  }

  /* Ühekordne ja idempotentne tõste vanast asukohast ühisesse. */
  function adopt() {
    var old = legacy();
    if (!old || old.player_id === lahkunud()) return null;
    return write(old);
  }

  /* Moodulile, millel on oma koopia (Korrutaja). Ühine võti võidab, sest
     just see teebki ühes moodulis liitumisest kõigi moodulite liikmesuse. */
  function sync(local) {
    var shared = read();
    if (shared) return shared;
    if (valid(local) && local.player_id !== lahkunud()) return write(local);
    return adopt();
  }

  /* Moodulile, millel oma koopiat ei ole (Kirjutaja, Kell). */
  function current() { return read() || adopt(); }

  function setup(cfg) {
    if (cfg && cfg.url && cfg.key) SB = { url: cfg.url, key: cfg.key };
  }
  function online() { return !!(SB.url && SB.key); }

  function rpc(fn, params) {
    if (!online()) return Promise.reject(new Error('config puudub'));
    return fetch(SB.url.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: {
        'apikey': SB.key, 'Authorization': 'Bearer ' + SB.key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params || {})
    }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    });
  }

  function join(code, nick) {
    return rpc('join_class', { p_code: code, p_nick: nick })
      .then(function (r) { if (r && !r.error) write(r); return r; });
  }

  function restore(code, nick, secret) {
    return rpc('restore_player', { p_code: code, p_nick: nick, p_secret: secret })
      .then(function (r) { if (r && !r.error) write(r); return r; });
  }

  /* Veateated ühes kohas, et igas moodulis ei kirjutataks neid uuesti. */
  var ERR = {
    code: 'Sellist koodi pole.',
    nick: 'Nimes peab olema 2–16 märki.',
    taken: 'See nimi on juba võetud. Vali teine.',
    name: 'Nimes peab olema vähemalt 2 märki.',
    school: 'Kooli nimi peab olema vähemalt 2 märki.',
    grade: 'Vali klassiaste.',
    letter: 'Klassi täht peab olema üks täht, näiteks A.',
    auth: 'Kood, nimi või taastekood ei klapi.',
    done_today: 'Tänane võistlus on juba tehtud.',
    input: 'Midagi oli vormis valesti.',
    net: 'Võrku pole või server ei vasta.'
  };

  /* Uue klassi või tiimi loomine. Loob ainult grupi — liitumine käib eraldi,
     sest sama vorm teenindab ka last, kes lihtsalt koodi sisestab. */
  function create(kind, school, grade, letter, name) {
    return rpc('create_group', {
      p_kind: kind, p_school: school || null, p_grade: grade || null,
      p_letter: letter || null, p_name: name || null
    });
  }

  function board(module) {
    var c = current();
    if (!c) return Promise.resolve({ error: 'auth' });
    return rpc('class_board', { p_player_id: c.player_id, p_secret: c.secret, p_module: module || 'korrutaja' });
  }

  /* p = {module, mode, op, n, ok, score, avg, greens, state}
     Korrutaja saadab lisaks greens_mul, greens_div ja best_test (server loeb
     tema selgeid tehteid kahes numbris). */
  function report(p) {
    var c = current();
    if (!c) return Promise.resolve({ error: 'auth' });
    return rpc('report_session', {
      p_player_id: c.player_id, p_secret: c.secret,
      p_mode: p.mode, p_op: p.op, p_n: p.n, p_ok: p.ok,
      p_score: p.score, p_avg: p.avg,
      p_greens_mul: p.greens_mul || 0, p_greens_div: p.greens_div || 0, p_best_test: p.best_test || 0,
      p_state: p.state || null, p_module: p.module, p_greens: p.greens || 0
    });
  }

  /* „Midagi on valesti" – lapse märge mängu seest.
     Kontekst tuleb kaasa ise, sest laps ei kirjelda viga ise. Mängija
     identiteet on valikuline: ka klassita laps peab saama märkida.
     p = {module, kind: 'sona'|'ulesanne'|'muu', item, detail, note, version} */
  function issue(p) {
    if (!online()) return Promise.resolve({ error: 'net' });
    var c = current();
    return rpc('report_issue', {
      p_module: p.module, p_kind: p.kind || 'muu',
      p_item: p.item || null, p_detail: p.detail || null, p_note: p.note || null,
      p_player_id: c ? c.player_id : null, p_secret: c ? c.secret : null,
      p_version: p.version || null
    });
  }

  /* ---------- liitumisekraan ----------
     Joonistab end ise ja toob oma laadi kaasa, nii et moodul ei pea selle
     jaoks HTML-i ega CSS-i hoidma. Sama ekraan teenindab kõiki mooduleid:
     liitumine koodiga, konto taastamine, uue klassi või tiimi loomine ja
     kutselingi jagamine. Korrutajal oli 14. septembrini oma ekraan; selle
     head küljed (koolisoovitus, nime eelvaade, kutsekaart, hoiatus vana
     grupi kohta, jagamisnupp) kolisid siia ja Korrutaja oma kadus. */
  var CSS = [
    '.hk-wrap{position:fixed;inset:0;z-index:60;background:rgba(22,40,74,.45);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px}',
    '.hk-card{background:#fff;color:#16284a;border-radius:18px;max-width:420px;width:100%;margin:auto;padding:22px 20px 20px;position:relative;box-shadow:0 18px 50px rgba(22,40,74,.25);font:inherit}',
    '.hk-card [hidden]{display:none!important}',
    '.hk-card h2{margin:0 0 6px;font-size:1.25rem}',
    '.hk-lead{margin:0 0 14px;color:#4a5a76;font-size:.92rem;line-height:1.45}',
    '.hk-card label{display:block;margin:10px 0;font-weight:700;font-size:.86rem}',
    '.hk-card input,.hk-card select{display:block;width:100%;margin-top:5px;padding:11px 12px;font:inherit;font-weight:600;border:2px solid #d8dfea;border-radius:11px;background:#fff;color:#16284a;box-sizing:border-box}',
    '.hk-card input:focus,.hk-card select:focus{outline:none;border-color:#f3c445}',
    '.hk-row{display:flex;gap:10px}.hk-row label{flex:1}',
    '.hk-go{display:block;width:100%;margin-top:14px;padding:13px;font:inherit;font-weight:800;font-size:1rem;border:0;border-radius:12px;background:#16284a;color:#fff;cursor:pointer}',
    '.hk-go[disabled]{opacity:.5;cursor:default}',
    '.hk-x{position:absolute;top:10px;right:10px;width:34px;height:34px;border:0;border-radius:50%;background:#eef1f6;color:#16284a;font-size:1rem;cursor:pointer}',
    '.hk-err{margin:10px 0 0;color:#b3261e;font-weight:700;font-size:.88rem}',
    '.hk-more{margin-top:14px;border-top:1px solid #eef1f6;padding-top:10px}',
    '.hk-more summary{cursor:pointer;font-weight:700;font-size:.88rem;color:#4a5a76}',
    '.hk-note{margin:14px 0 0;font-size:.8rem;line-height:1.5;color:#6b7891}',
    '.hk-invite{margin:0 0 12px;padding:12px 14px;border:2px solid #f3c445;border-radius:14px;background:#fff7e3}',
    '.hk-invite h3{margin:0 0 4px;font-size:1rem}',
    '.hk-invite p{margin:0;font-size:.86rem;line-height:1.45;color:#4a5a76}',
    '.hk-warn{margin:12px 0 0;padding:11px 12px;border-radius:12px;background:#fff7e3;color:#5b4a1f;font-size:.84rem;line-height:1.5}',
    '.hk-chips{display:flex;gap:8px;margin:10px 0}',
    '.hk-chip{flex:1;padding:9px;font:inherit;font-weight:700;font-size:.88rem;border:2px solid #d8dfea;border-radius:11px;background:#fff;color:#16284a;cursor:pointer}',
    '.hk-chip.on{border-color:#16284a;background:#16284a;color:#fff}',
    '.hk-sug{margin-top:-4px;border:2px solid #d8dfea;border-radius:11px;background:#fff;max-height:168px;overflow:auto}',
    '.hk-sug button{display:block;width:100%;padding:9px 12px;font:inherit;font-size:.9rem;text-align:left;border:0;background:none;color:#16284a;cursor:pointer}',
    '.hk-sug button:hover{background:#eef1f6}',
    '.hk-preview{margin:10px 0 0;font-size:.86rem;font-weight:700;color:#4a5a76}',
    '.hk-code{margin:14px 0 6px;text-align:center;font-weight:800;font-size:1.9rem;letter-spacing:.14em;color:#16284a}'
  ].join('');

  function styles() {
    if (document.getElementById('hk-css')) return;
    var s = document.createElement('style');
    s.id = 'hk-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function field(label, attrs) {
    var l = el('label', null, label);
    var i = document.createElement('input');
    for (var k in attrs) i.setAttribute(k, attrs[k]);
    l.appendChild(i);
    return { label: l, input: i };
  }

  /* Kutselink viib samasse moodulisse, kus kutsuja parajasti on.
     app on mooduli nimi seesütlevas ('Korrutajas'), sest see läheb lausesse. */
  function invite(code, name, app, kind) {
    var url = location.origin + location.pathname + '#k=' + encodeURIComponent(code) +
      (name ? '&n=' + encodeURIComponent(name) : '');
    var text = 'Tule harjuta minuga ' + (app || 'Harjutajas') + '!' +
      (name ? '\n' + (kind === 'team' ? 'Tiim: ' : 'Klass: ') + name : '') + '\nKlassikood: ' + code;
    return { url: url, text: text };
  }

  /* openJoin({code, name, app, onDone})
       code    kutselingist tulnud klassikood, mis pannakse lahtrisse ette
       name    kutsutud grupi nimi, kui kutselink selle kaasa andis
       app     mooduli nimi seesütlevas jagamistekstis, nt 'Korrutajas'
       onDone  fn(cls, r) - cls on salvestatud identiteet, r serveri vastus
               (taastamisel on seal ka state, mille moodul võib üle võtta) */
  function openJoin(opts) {
    opts = opts || {};
    styles();
    var app = opts.app || 'Harjutajas';
    var cur = current();

    var wrap = el('div', 'hk-wrap');
    var card = el('div', 'hk-card');
    wrap.appendChild(card);

    var x = el('button', 'hk-x', '✕');
    x.setAttribute('aria-label', 'Sulge');
    card.appendChild(x);

    card.appendChild(el('h2', null, 'Liitu klassiga'));

    if (opts.code) {
      var inv = el('div', 'hk-invite');
      inv.appendChild(el('h3', null, opts.name ? ('Kutse klassi „' + opts.name + '“') : 'Kutse klassiga liituma'));
      inv.appendChild(el('p', null, 'Kood on all juba kirjas. Kirjuta oma hüüdnimi ja vajuta „Liitu“. Vale klass? Kustuta kood ja kirjuta uus.'));
      card.appendChild(inv);
    }

    card.appendChild(el('p', 'hk-lead',
      'Klassikoodis on kuus märki. Selle annab õpetaja või sõber. Sama klass kehtib kõigis Harjutaja mängudes.'));

    var code = field('Klassikood', { maxlength: '6', autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false' });
    var nick = field('Sinu hüüdnimi', { maxlength: '16', autocomplete: 'off' });
    if (opts.code) code.input.value = opts.code;
    card.appendChild(code.label);
    card.appendChild(nick.label);

    /* Vana grupi hoiatus: uue grupiga liitumine alustab seal nullist ja
       ainus tee tagasi on taastekood, seega see peab silma jääma. */
    if (cur && cur.class_name) {
      var warn = el('p', 'hk-warn');
      warn.appendChild(document.createTextNode('Oled juba grupis '));
      warn.appendChild(el('b', null, cur.class_name));
      warn.appendChild(document.createTextNode('. Uues grupis alustad nullist: selle nädala punktid jäävad vanasse gruppi, aga seni õpitu ja rekord tulevad kaasa. Vanasse gruppi saad tagasi taastekoodiga '));
      warn.appendChild(el('b', null, cur.secret));
      warn.appendChild(document.createTextNode(' – kirjuta see üles.'));
      card.appendChild(warn);
    }

    var err = el('p', 'hk-err');
    err.hidden = true;
    card.appendChild(err);

    var go = el('button', 'hk-go', 'Liitu');
    card.appendChild(go);

    function fail(msg) { err.textContent = msg; err.hidden = false; }
    function busy(b, btn, label) { btn.disabled = b; btn.textContent = b ? 'Hetk…' : label; }
    function done(r) { close(); if (opts.onDone) opts.onDone(read(), r); }

    go.onclick = function () {
      err.hidden = true;
      var c = code.input.value.trim().toUpperCase(), n = nick.input.value.trim();
      if (c.length !== 6) return fail('Koodis peab olema kuus märki.');
      if (n.length < 2) return fail(ERR.nick);
      busy(true, go, 'Liitu');
      join(c, n).then(function (r) {
        busy(false, go, 'Liitu');
        if (r && r.error) return fail(ERR[r.error] || 'Midagi läks valesti. Proovi uuesti.');
        done(r);
      }).catch(function () { busy(false, go, 'Liitu'); fail(ERR.net); });
    };

    /* Taastamine teises brauseris */
    var d1 = el('details', 'hk-more');
    d1.appendChild(el('summary', null, 'Mul on juba konto'));
    d1.appendChild(el('p', 'hk-lead', 'Kirjuta siia klassikood, hüüdnimi ja taastekood. Taastekoodi leiad mängu seadetest.'));
    var sec = field('Taastekood (8 märki)', { maxlength: '8', autocapitalize: 'characters', autocomplete: 'off' });
    d1.appendChild(sec.label);
    var go1 = el('button', 'hk-go', 'Taasta konto');
    d1.appendChild(go1);
    card.appendChild(d1);

    go1.onclick = function () {
      err.hidden = true;
      var c = code.input.value.trim().toUpperCase(), n = nick.input.value.trim(), s = sec.input.value.trim().toUpperCase();
      if (c.length !== 6 || n.length < 2 || s.length !== 8) return fail('Kirjuta klassikood, hüüdnimi ja 8-märgiline taastekood.');
      busy(true, go1, 'Taasta konto');
      restore(c, n, s).then(function (r) {
        busy(false, go1, 'Taasta konto');
        if (r && r.error) return fail(ERR[r.error] || 'Midagi läks valesti. Proovi uuesti.');
        done(r);
      }).catch(function () { busy(false, go1, 'Taasta konto'); fail(ERR.net); });
    };

    /* Uue klassi või tiimi loomine. Loob ainult grupi ja näitab koodi;
       liitumine käib ülalt, sest looja ei pruugi ise mängida. */
    var d2 = el('details', 'hk-more');
    d2.appendChild(el('summary', null, 'Loo uus klass või tiim'));
    d2.appendChild(el('p', 'hk-lead', 'Seda teeb tavaliselt õpetaja või lapsevanem. Pärast loomist saad koodi, mille jagad teistele.'));

    var chips = el('div', 'hk-chips');
    var chClass = el('button', 'hk-chip on', 'Kooliklass');
    var chTeam = el('button', 'hk-chip', 'Tiim');
    chClass.type = 'button';
    chTeam.type = 'button';
    chips.appendChild(chClass);
    chips.appendChild(chTeam);
    d2.appendChild(chips);
    var kind = 'class';

    var fClass = el('div');
    var school = field('Kooli nimi', { maxlength: '60', autocomplete: 'off' });
    fClass.appendChild(school.label);
    var sug = el('div', 'hk-sug');
    sug.hidden = true;
    fClass.appendChild(sug);
    var row = el('div', 'hk-row');
    var gl = el('label', null, 'Klassi number');
    var gsel = document.createElement('select');
    for (var i = 1; i <= 12; i++) gsel.appendChild(new Option(i + '. klass', String(i)));
    gsel.value = '3';
    gl.appendChild(gsel);
    var letter = field('Klassi täht (nt A)', { maxlength: '1', autocapitalize: 'characters', autocomplete: 'off' });
    row.appendChild(gl);
    row.appendChild(letter.label);
    fClass.appendChild(row);
    d2.appendChild(fClass);

    var fTeam = el('div');
    fTeam.hidden = true;
    var tname = field('Tiimi nimi', { maxlength: '40', autocomplete: 'off' });
    fTeam.appendChild(tname.label);
    fTeam.appendChild(el('p', 'hk-lead', 'Tiimi liikmed võistlevad ainult omavahel. Kooli ja kogu Eesti võrdlusse tiim ei lähe.'));
    d2.appendChild(fTeam);

    var prev = el('p', 'hk-preview');
    d2.appendChild(prev);
    var go2 = el('button', 'hk-go', 'Loo');
    d2.appendChild(go2);

    var doneBox = el('div');
    doneBox.hidden = true;
    var codeBig = el('div', 'hk-code');
    doneBox.appendChild(codeBig);
    doneBox.appendChild(el('p', 'hk-lead', 'Jaga see kood klassile. Kood on nüüd ka üleval klassikoodi lahtris.'));
    var share = el('button', 'hk-go', 'Jaga kutset');
    var shBox = document.createElement('input');
    shBox.readOnly = true;
    shBox.hidden = true;
    doneBox.appendChild(share);
    doneBox.appendChild(shBox);
    d2.appendChild(doneBox);
    card.appendChild(d2);

    function preview() {
      if (kind === 'team') {
        var t = tname.input.value.trim();
        prev.textContent = t.length >= 2 ? ('Nimeks tuleb ' + t) : '';
        return;
      }
      var sc = school.input.value.trim().replace(/\s+/g, ' ');
      prev.textContent = sc.length >= 2 ? ('Nimeks tuleb ' + sc + ' ' + gsel.value + letter.input.value.trim().toUpperCase()) : '';
    }

    function setKind(k) {
      kind = k;
      chClass.classList.toggle('on', k === 'class');
      chTeam.classList.toggle('on', k === 'team');
      fClass.hidden = k !== 'class';
      fTeam.hidden = k === 'class';
      err.hidden = true;
      sug.hidden = true;
      preview();
    }
    chClass.onclick = function () { setKind('class'); };
    chTeam.onclick = function () { setKind('team'); };

    gsel.onchange = preview;
    tname.input.oninput = preview;
    letter.input.oninput = function () { this.value = this.value.toUpperCase(); preview(); };

    /* Koolinime soovitused: sama kool peab saama kõigis klassides sama nime,
       muidu ei tule koolivõrdlus kokku. */
    var sugT = null;
    school.input.oninput = function () {
      preview();
      var q = this.value.trim();
      if (sugT) clearTimeout(sugT);
      if (q.length < 2 || !online()) { sug.hidden = true; return; }
      sugT = setTimeout(function () {
        rpc('school_suggest', { p_q: q }).then(function (list) {
          while (sug.firstChild) sug.removeChild(sug.firstChild);
          if (!list || !list.length) { sug.hidden = true; return; }
          list.forEach(function (nm) {
            var b = el('button', null, nm);
            b.type = 'button';
            b.onclick = function () { school.input.value = nm; sug.hidden = true; preview(); };
            sug.appendChild(b);
          });
          sug.hidden = false;
        }).catch(function () { sug.hidden = true; });
      }, 300);
    };

    var madeCode = '', madeName = '';

    go2.onclick = function () {
      err.hidden = true;
      var kindArg, sc = null, gr = null, lt = null, nm = null;
      if (kind === 'team') {
        nm = tname.input.value.trim();
        if (nm.length < 2) return fail(ERR.name);
        kindArg = 'team';
      } else {
        sc = school.input.value.trim();
        if (sc.length < 2) return fail(ERR.school);
        gr = parseInt(gsel.value, 10);
        lt = letter.input.value.trim();
        kindArg = 'class';
      }
      busy(true, go2, 'Loo');
      create(kindArg, sc, gr, lt, nm).then(function (r) {
        busy(false, go2, 'Loo');
        if (r && r.error) return fail(ERR[r.error] || 'Midagi läks valesti. Proovi uuesti.');
        madeCode = r.code;
        madeName = r.name || '';
        codeBig.textContent = r.code;
        code.input.value = r.code;
        sug.hidden = true;
        doneBox.hidden = false;
      }).catch(function () { busy(false, go2, 'Loo'); fail(ERR.net); });
    };

    share.onclick = function () {
      if (!madeCode) return;
      var inv2 = invite(madeCode, madeName, app, kind);
      function flash(m) { share.textContent = m; setTimeout(function () { share.textContent = 'Jaga kutset'; }, 2400); }
      function manual() {
        shBox.hidden = false;
        shBox.value = inv2.url;
        try { shBox.focus(); shBox.setSelectionRange(0, inv2.url.length); } catch (e) {}
        flash('Kopeeri allolev link');
      }
      if (navigator.share) { navigator.share({ title: 'Harjutaja', text: inv2.text, url: inv2.url }).catch(function () {}); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(inv2.text + '\n' + inv2.url).then(function () { flash('Link kopeeritud'); }, manual);
        return;
      }
      manual();
    };

    card.appendChild(el('p', 'hk-note',
      'Sinu koht klassis on salvestatud sellesse brauserisse. Kui brauseri andmed kustutatakse, kaob ka sinu koht – seepärast kirjuta taastekood üles.'));

    function close() {
      document.removeEventListener('keydown', onKey);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }

    x.onclick = close;
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) close();
      else if (!sug.hidden && e.target !== school.input && e.target.parentNode !== sug) sug.hidden = true;
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    setTimeout(function () { try { (opts.code ? nick.input : code.input).focus(); } catch (e) {} }, 60);
    return { close: close };
  }

  /* Konfiguratsioon tuleb core/config.js-ist, kui see on lehele laetud. */
  if (window.HARJUTAJA_SB) setup(window.HARJUTAJA_SB);

  window.HKlass = {
    key: KEY, valid: valid, read: read, set: write, clear: clear,
    sync: sync, current: current, adopt: adopt,
    setup: setup, online: online, rpc: rpc,
    join: join, restore: restore, create: create, invite: invite,
    board: board, report: report, issue: issue, openJoin: openJoin, ERR: ERR
  };
})();
