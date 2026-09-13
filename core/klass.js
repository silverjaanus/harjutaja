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
    nick: 'Nimi peab olema 2–16 märki.',
    taken: 'See nimi on juba võetud. Vali teine.',
    name: 'Nimi peab olema vähemalt 2 märki.',
    school: 'Kooli nimi peab olema vähemalt 2 märki.',
    grade: 'Vali klassiaste.',
    letter: 'Klassi täht peab olema üks täht, näiteks A.',
    auth: 'Kood, nimi või taastekood ei klapi.',
    done_today: 'Tänane võistlus on juba tehtud.',
    input: 'Midagi oli vormis valesti.',
    net: 'Võrku pole või server ei vasta.'
  };

  window.HKlass = {
    key: KEY, valid: valid, read: read, set: write, clear: clear,
    sync: sync, current: current, adopt: adopt,
    setup: setup, online: online, rpc: rpc, join: join, restore: restore, ERR: ERR
  };
})();
