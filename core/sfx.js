/* Harjutaja ühine tuum: heliefektid WebAudioga (ühtegi helifaili pole). */
(function () {
  let ctx = null;
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, type, vol) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    const t = c.currentTime + start;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  window.HSfx = {
    enabled: true,
    unlock() { ac(); },
    ok() { if (!this.enabled) return; tone(880, 0, 0.18, "sine", 0.16); tone(1320, 0.07, 0.22, "sine", 0.12); },
    bad() { if (!this.enabled) return; tone(260, 0, 0.22, "triangle", 0.12); tone(220, 0.12, 0.26, "triangle", 0.1); },
    tada() { if (!this.enabled) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.35, "sine", 0.14)); }
  };
})();
