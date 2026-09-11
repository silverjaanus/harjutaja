/* Harjutaja ühine tuum: salvestus brauseri mällu. Iga moodul kasutab oma võtit. */
(function () {
  function load(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  window.HStore = { load, save };
})();
