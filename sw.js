// SienaLane Games offline support.
// Pages load fresh when online and from the cache when offline. Bump CACHE and add new files to FILES when adding a game.
const CACHE = 'sl-games-v3';
const FILES = [
  'games.html', 'potion-sort.html', 'puzzles.html', 'world-order.html', 'wild-acres.html', 'blind-tasting.html',
  'guess-five.html', 'four-by-four.html', 'honeycomb.html', 'close-call.html', 'letter-loop.html', 'word-ladder.html',
  'game-common.css', 'game-common.js', 'pwa.js', 'zoo-symphony.js', 'ambient-mixer.html',
  'guess-five-data.js', 'honeycomb-data.js', 'word-dict.js', 'close-call-data.js', 'letter-loop-data.js', 'word-ladder-data.js', 'world-order-data.js',
  'manifest.webmanifest', 'app-icon-192.png', 'app-icon-512.png', 'apple-touch-icon.png', 'favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req.url, { cache: 'no-cache' }).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached && req.mode !== 'navigate') { e.waitUntil(fresh); return cached; }
    const res = await fresh;
    if (res) return res; if (cached) return cached;
    if (req.mode === 'navigate') return cache.match('games.html');
    return new Response('', { status: 504 });
  }));
});
