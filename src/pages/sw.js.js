// The service worker: what lets the site install as an app and keep working offline.
// Served at /sw.js. A new version is stamped on every build, so phones pick up updates.
//
// How it behaves:
//  - Pages always come fresh from the internet when there's a connection, so answers are
//    never stale. A copy of each page you open is kept, so it still opens offline.
//  - Scripts, fonts and icons are kept after the first visit, so pages open fast.
//  - Offline and on a page you haven't opened before, you get a friendly offline page.
const VERSION = Date.now().toString(36);

const code = `
const VERSION = '${VERSION}';
const STATIC = 'ata-static-' + VERSION;   // home page, offline page, search index, icons
const ASSETS = 'ata-assets';              // scripts and fonts (their names change when they change)
const PAGES = 'ata-pages';                // copies of pages you've opened
const MAX_PAGES = 80;
const MAX_ASSETS = 200;
const PRECACHE = ['/', '/offline/', '/search.json', '/logo-mark.png', '/favicon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('ata-static-') && key !== STATIC) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js' || url.pathname.startsWith('/og/')) return;

  if (req.mode === 'navigate') event.respondWith(page(req));
  else if (url.pathname === '/search.json') event.respondWith(networkFirst(req));
  else if (url.pathname.startsWith('/_astro/') || /\\.(woff2?|png|svg|webmanifest)$/.test(url.pathname)) event.respondWith(cacheFirst(req));
});

// A cached response that came through a redirect can't be handed to a page as-is.
function clean(res) {
  if (!res || !res.redirected) return res;
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function page(req) {
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') {
      const cache = await caches.open(PAGES);
      await cache.delete(req.url); // re-adding moves it to the newest end, so trimming drops the oldest
      await cache.put(req.url, res.clone());
      trim(cache, MAX_PAGES);
    }
    return res;
  } catch (err) {
    const u = new URL(req.url);
    u.search = '';
    const other = u.pathname.endsWith('/') ? u.href.slice(0, -1) : u.href + '/';
    const hit = (await caches.match(u.href)) || (await caches.match(other)) || (await caches.match('/offline/'));
    return clean(hit) || Response.error();
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(STATIC)).put(req, res.clone());
    return res;
  } catch (err) {
    return clean(await caches.match(req)) || Response.error();
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return clean(hit);
  const res = await fetch(req);
  if (res.ok && res.type === 'basic') {
    const cache = await caches.open(ASSETS);
    await cache.put(req, res.clone());
    trim(cache, MAX_ASSETS);
  }
  return res;
}
`;

export function GET() {
  return new Response(code, { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
}
