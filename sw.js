/* Harjutaja service worker: rakenduse failid vahemällu, heli vahemällu esimesel kuulamisel. */
const VERSION = 'h-202609111948';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'core/store.js', 'core/sfx.js', 'core/engine.js',
  'kirjutaja/', 'kirjutaja/index.html', 'kirjutaja/kirjutaja.css', 'kirjutaja/app.js', 'kirjutaja/robot.js', 'kirjutaja/data.js',
  'icons/kirjutaja-192.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open('app-' + VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('app-') && k !== 'app-' + VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.endsWith('.mp3')) {
    // heli ei muutu: vahemälust, puudumisel võrgust ja vahemällu
    e.respondWith(caches.open('audio').then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }))));
    return;
  }
  if (url.origin === location.origin) {
    // rakenduse failid: võrgust, kui võimalik (uus versioon kohe), muidu vahemälust
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open('app-' + VERSION).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request)));
  }
});
