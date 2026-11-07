const CACHE = 'vaquita-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // El backend (Apps Script) y las fuentes nunca se cachean: siempre a la red.
  if (url.hostname.indexOf('script.google') >= 0 || url.hostname.indexOf('googleusercontent') >= 0) return;
  if (url.origin !== self.location.origin) return;

  // la pagina siempre fresca: GitHub Pages la cachea 10 min y la tablet se quedaba con la vieja
  const fresca = req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname);
  e.respondWith(
    (fresca ? fetch(req.url, {cache: 'no-store', credentials: 'same-origin'}) : fetch(req))
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
