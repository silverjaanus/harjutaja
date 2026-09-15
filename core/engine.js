/* Harjutaja ühine tuum: kohanduv kordamine.
   - Vale vastusega küsimus tuleb samas ringis 3–6 küsimuse pärast uuesti.
   - Muidu eelistatakse sõnu, mis on uued, läksid viimati valesti või pole veel kindlalt selged.
   - Sama lemma ei tule kahel järjestikusel küsimusel.
   stats[id] = { n, ok, streak, lastOk, t } */
(function () {
  function weight(s) {
    if (!s || !s.n) return 3;           // uus
    if (!s.lastOk) return 6;            // viimati vale
    if (s.streak < 2) return 2.5;       // pole veel kindel
    return 0.6;                          // selge
  }
  function mastered(s) { return !!(s && s.lastOk && s.streak >= 2); }

  function Round(items, stats, length) {
    this.items = items; this.stats = stats; this.length = length;
    this.asked = 0; this.due = []; this.recent = []; this.history = []; this.repeats = {};
  }
  Round.prototype.next = function () {
    if (this.asked >= this.length) {
      // ring läbi; ring ei veni üle kahekordse pikkuse (15. sept: 6-küsimuseline
      // ring andis 13 vastust, lagi oli 12)
      if (!this.due.length || this.asked >= this.length * 2) return null;
      this.asked++; return this._take(this.due.shift().item, true);  // lõpus küsime vead veel üle
    }
    this.asked++;
    // korduste järjekord
    const dueIdx = this.due.findIndex(d => d.at <= this.asked && !this.recent.includes(d.item.lemma));
    if (dueIdx >= 0) { const d = this.due.splice(dueIdx, 1)[0]; return this._take(d.item, true); }
    let pool = this.items.filter(it => !this.recent.includes(it.lemma));
    if (!pool.length) pool = this.items;
    const now = Date.now();
    let total = 0;
    const w = pool.map(it => {
      const s = this.stats[it.id];
      let x = weight(s);
      if (s && s.t) x *= Math.min(2, 1 + (now - s.t) / 864e5 / 3); // kaua nägemata → veidi sagedamini
      if (this.history.includes(it.id)) x *= 0.15;                  // selles ringis juba olnud
      total += x; return x;
    });
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return this._take(pool[i], false); }
    return this._take(pool[pool.length - 1], false);
  };
  Round.prototype._take = function (it, repeat) {
    this.recent.push(it.lemma); if (this.recent.length > 3) this.recent.shift();
    this.history.push(it.id);
    return { item: it, repeat };
  };
  Round.prototype.record = function (it, ok) {
    const s = this.stats[it.id] || (this.stats[it.id] = { n: 0, ok: 0, streak: 0, lastOk: false, t: 0 });
    s.n++; s.t = Date.now(); s.lastOk = ok;
    if (ok) { s.ok++; s.streak++; } else { s.streak = 0; }
    // vale vastus tuleb 3–6 küsimuse pärast tagasi, aga üks sõna kuni kaks korda ringis
    // ja ring ei veni üle kahe korra algsest pikkusest
    this.repeats[it.id] = (this.repeats[it.id] || 0) + (ok ? 0 : 1);
    if (!ok && this.repeats[it.id] <= 2 && this.asked < this.length * 2)
      this.due.push({ item: it, at: this.asked + 3 + Math.floor(Math.random() * 4) });
  };
  window.HEngine = { Round, mastered, weight };
})();
