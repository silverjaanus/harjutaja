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

  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

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
    return old ? write(old) : null;
  }

  /* Moodulile, millel on oma koopia (Korrutaja). Ühine võti võidab, sest
     just see teebki ühes moodulis liitumisest kõigi moodulite liikmesuse. */
  function sync(local) {
    var shared = read();
    if (shared) return shared;
    if (valid(local)) return write(local);
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
    net: 'Internetti pole või server ei vasta.'
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

  /* p = {module, mode, op, n, ok, score, avg, greens, state} */
  function report(p) {
    var c = current();
    if (!c) return Promise.resolve({ error: 'auth' });
    return rpc('report_session', {
      p_player_id: c.player_id, p_secret: c.secret,
      p_mode: p.mode, p_op: p.op, p_n: p.n, p_ok: p.ok,
      p_score: p.score, p_avg: p.avg,
      p_greens_mul: 0, p_greens_div: 0, p_best_test: 0,
      p_state: p.state || null, p_module: p.module, p_greens: p.greens || 0
    });
  }

  /* ---------- liitumisekraan ----------
     Joonistab end ise ja toob oma laadi kaasa, nii et moodul ei pea selle
     jaoks HTML-i ega CSS-i hoidma. Korrutajal on praegu veel oma vana ekraan;
     see on teadlik dubleerimine, mille saab hiljem ära koristada. */
  var CSS = [
    '.hk-wrap{position:fixed;inset:0;z-index:60;background:rgba(22,40,74,.45);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px}',
    '.hk-card{background:#fff;color:#16284a;border-radius:18px;max-width:420px;width:100%;margin:auto;padding:22px 20px 20px;position:relative;box-shadow:0 18px 50px rgba(22,40,74,.25);font:inherit}',
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
    '.hk-note{margin:14px 0 0;font-size:.8rem;line-height:1.5;color:#6b7891}'
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

  /* openJoin({onDone: fn(cls)}) */
  function openJoin(opts) {
    opts = opts || {};
    styles();

    var wrap = el('div', 'hk-wrap');
    var card = el('div', 'hk-card');
    wrap.appendChild(card);

    var x = el('button', 'hk-x', '✕');
    x.setAttribute('aria-label', 'Sulge');
    card.appendChild(x);

    card.appendChild(el('h2', null, 'Liitu klassiga'));
    card.appendChild(el('p', 'hk-lead',
      'Klassikoodis on kuus märki. Selle annab õpetaja või sõber. Sama klass on sul kõigis Harjutaja mängudes.'));

    var code = field('Klassikood', { maxlength: '6', autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false' });
    var nick = field('Sinu hüüdnimi', { maxlength: '16', autocomplete: 'off' });
    if (opts.code) code.input.value = opts.code;    // kutselingist tulnud kood
    card.appendChild(code.label);
    card.appendChild(nick.label);

    var err = el('p', 'hk-err');
    err.hidden = true;
    card.appendChild(err);

    var go = el('button', 'hk-go', 'Liitu');
    card.appendChild(go);

    function fail(msg) { err.textContent = msg; err.hidden = false; }
    function busy(b, btn, label) { btn.disabled = b; btn.textContent = b ? 'Hetk…' : label; }

    function done(cls) {
      close();
      if (opts.onDone) opts.onDone(cls);
    }

    go.onclick = function () {
      err.hidden = true;
      var c = code.input.value.trim().toUpperCase(), n = nick.input.value.trim();
      if (c.length !== 6) return fail('Koodis peab olema kuus märki.');
      if (n.length < 2) return fail(ERR.nick);
      busy(true, go, 'Liitu');
      join(c, n).then(function (r) {
        busy(false, go, 'Liitu');
        if (r && r.error) return fail(ERR[r.error] || 'Ei õnnestunud.');
        done(read());
      }).catch(function () { busy(false, go, 'Liitu'); fail(ERR.net); });
    };

    /* Taastamine teises brauseris */
    var d1 = el('details', 'hk-more');
    d1.appendChild(el('summary', null, 'Mul oli konto juba olemas'));
    var sec = field('Taastekood (8 märki)', { maxlength: '8', autocapitalize: 'characters', autocomplete: 'off' });
    d1.appendChild(el('p', 'hk-lead', 'Kirjuta siia klassikood, hüüdnimi ja taastekood. Taastekoodi näeb mängu seadetes.'));
    d1.appendChild(sec.label);
    var go1 = el('button', 'hk-go', 'Taasta konto');
    d1.appendChild(go1);
    card.appendChild(d1);

    go1.onclick = function () {
      err.hidden = true;
      var c = code.input.value.trim().toUpperCase(), n = nick.input.value.trim(), s = sec.input.value.trim().toUpperCase();
      if (c.length !== 6 || n.length < 2 || s.length !== 8) return fail('Sisesta klassikood, hüüdnimi ja 8-märgiline taastekood.');
      busy(true, go1, 'Taasta konto');
      restore(c, n, s).then(function (r) {
        busy(false, go1, 'Taasta konto');
        if (r && r.error) return fail(ERR[r.error] || 'Ei õnnestunud.');
        done(read());
      }).catch(function () { busy(false, go1, 'Taasta konto'); fail(ERR.net); });
    };

    /* Uue klassi loomine */
    var d2 = el('details', 'hk-more');
    d2.appendChild(el('summary', null, 'Loo uus klass'));
    d2.appendChild(el('p', 'hk-lead', 'Seda teeb tavaliselt õpetaja või lapsevanem. Pärast loomist saad koodi, mille teised sisestavad.'));
    var school = field('Kooli nimi', { maxlength: '60', autocomplete: 'off' });
    d2.appendChild(school.label);
    var row = el('div', 'hk-row');
    var gl = el('label', null, 'Klass');
    var gsel = document.createElement('select');
    for (var i = 1; i <= 12; i++) gsel.appendChild(new Option(i + '. klass', String(i)));
    gsel.value = '3';
    gl.appendChild(gsel);
    var letter = field('Klassi täht (nt A)', { maxlength: '1', autocapitalize: 'characters', autocomplete: 'off' });
    row.appendChild(gl);
    row.appendChild(letter.label);
    d2.appendChild(row);
    var go2 = el('button', 'hk-go', 'Loo klass ja liitu');
    d2.appendChild(go2);
    card.appendChild(d2);

    go2.onclick = function () {
      err.hidden = true;
      var n = nick.input.value.trim();
      if (school.input.value.trim().length < 2) return fail(ERR.school);
      if (n.length < 2) return fail('Kirjuta ülal ka oma hüüdnimi.');
      busy(true, go2, 'Loo klass ja liitu');
      create('class', school.input.value.trim(), parseInt(gsel.value, 10), letter.input.value.trim(), null)
        .then(function (r) {
          if (r && r.error) { busy(false, go2, 'Loo klass ja liitu'); return fail(ERR[r.error] || 'Ei õnnestunud.'); }
          return join(r.code, n).then(function (j) {
            busy(false, go2, 'Loo klass ja liitu');
            if (j && j.error) return fail(ERR[j.error] || 'Klass on loodud, aga liitumine ei õnnestunud.');
            done(read());
          });
        })
        .catch(function () { busy(false, go2, 'Loo klass ja liitu'); fail(ERR.net); });
    };

    card.appendChild(el('p', 'hk-note',
      'Sinu koht klassis on salvestatud sellesse brauserisse. Kui brauseri andmed kustutatakse, kaob ka sinu koht klassis — seepärast kirjuta taastekood üles.'));

    function close() {
      document.removeEventListener('keydown', onKey);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }

    x.onclick = close;
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    setTimeout(function () { try { code.input.focus(); } catch (e) {} }, 60);
    return { close: close };
  }

  /* Konfiguratsioon tuleb core/config.js-ist, kui see on lehele laetud. */
  if (window.HARJUTAJA_SB) setup(window.HARJUTAJA_SB);

  window.HKlass = {
    key: KEY, valid: valid, read: read, set: write, clear: clear,
    sync: sync, current: current, adopt: adopt,
    setup: setup, online: online, rpc: rpc,
    join: join, restore: restore, create: create,
    board: board, report: report, openJoin: openJoin, ERR: ERR
  };
})();
