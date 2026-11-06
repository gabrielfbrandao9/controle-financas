/*
 * Service worker: deixa o site instalável e abrindo rápido.
 *
 * - Arquivos do próprio site: tenta a rede primeiro (para pegar a versão mais
 *   nova depois de cada publicação) e usa a cópia guardada quando está offline.
 * - Fontes (Google Fonts): usa a cópia guardada; se não houver, baixa.
 *
 * Ao mudar a lista de arquivos, aumente a versão para limpar o cache antigo.
 */
const VERSION = 'v5';
const CACHE = `financas-${VERSION}`;

const APP_FILES = [
  './',
  'index.html',
  'privacidade.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/util.js',
  'js/store.js',
  'js/config.js',
  'js/vendor/supabase.min.js',
  'js/cloud.js',
  'js/calculos.js',
  'js/mercado.js',
  'js/app.js',
  'js/app-apk.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

const CDN_FILES = [
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
];

const NETWORK_TIMEOUT = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(APP_FILES.map((url) => new Request(url, { cache: 'reload' })));
    await Promise.all(CDN_FILES.map((url) => cache.add(new Request(url, { mode: 'cors' })).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('financas-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isCacheableCdn(url) {
  return url.hostname === 'fonts.googleapis.com'
    || url.hostname === 'fonts.gstatic.com';
}

function fetchFresh(request) {
  if (request.mode === 'navigate') return fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' });
  return fetch(request, { cache: 'no-cache' });
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await Promise.race([
      fetchFresh(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT)),
    ]);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await cache.match('index.html');
      if (shell) return shell;
    }
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  } else if (isCacheableCdn(url)) {
    event.respondWith(cacheFirst(request));
  }
});
