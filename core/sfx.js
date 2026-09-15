/* Harjutaja ühine tuum: heliefektid WebAudioga (ühtegi helifaili pole). */
(function () {
  /* 15. sept: Silver ei kuulnud Androidis heli üldse. Arvutis mängis kõik
     (Playwrightis loodi ostsillaatorid, kontekst oli "running"), seega on
     need kaks tõenäolised põhjused, mõlemad parandatud:
     1. Toon ajastati hetkele currentTime, aga peatatud AudioContext käivitub
        telefonis alles mõnesaja millisekundi pärast. Selleks ajaks oli 0,2 s
        pikkune toon „möödas" ja jäi vaikseks. Nüüd oodatakse resume() ära ja
        ajastatakse alles siis, väikese varuga.
     2. Toonid olid vaiksed (0,1–0,16) ja „vale" oli 220–260 Hz, mida telefoni
        kõlar peaaegu ei esita. Nüüd on helid valjemad ja kõrgemad ning
        kompressor hoiab need moonutuseta. */
  let ctx = null, out = null;
  function ac() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      try {
        const comp = ctx.createDynamicsCompressor();
        out = ctx.createGain(); out.gain.value = 0.9;
        out.connect(comp).connect(ctx.destination);
      } catch (e) { out = ctx.destination; }
    }
    return ctx;
  }
  /* Käivita helid alles siis, kui kontekst päriselt jookseb. */
  function kui(fn) {
    const c = ac(); if (!c) return;
    if (c.state === "running") { fn(c); return; }
    const p = c.resume();
    if (p && p.then) p.then(() => fn(c)).catch(() => {});
    else fn(c);
  }
  function tone(c, freq, start, dur, type, vol) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    const t = c.currentTime + 0.03 + start;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  window.HSfx = {
    enabled: true,
    unlock() { const c = ac(); if (c && c.state !== "running") c.resume(); },
    ok() {
      if (!this.enabled) return;
      kui(c => { tone(c, 880, 0, 0.22, "sine", 0.4); tone(c, 1320, 0.08, 0.28, "sine", 0.32); });
    },
    bad() {
      if (!this.enabled) return;
      kui(c => { tone(c, 392, 0, 0.24, "triangle", 0.45); tone(c, 311, 0.13, 0.3, "triangle", 0.42); });
    },
    tada() {
      if (!this.enabled) return;
      kui(c => [523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.1, 0.4, "sine", 0.32)));
    }
  };
})();
