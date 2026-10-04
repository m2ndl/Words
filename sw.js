'use strict';

// Offline support, so a lesson keeps working on patchy mobile data.
// - The app (HTML, CSS, JS, the course) comes from the network first, so updates show at once, and from the
//   cache when offline.
// - Audio clips and font files come from the cache first: a clip's address changes when the clip does (?v=<hash>).
//   Opening a unit downloads its clips in the background (js/audioManager.js, prefetch).
// Bump VERSION to drop the old caches. Keep SHELL in step with the files the page loads.
const VERSION = 'v1';
const SHELL_CACHE = `words-shell-${VERSION}`;
const MEDIA_CACHE = `words-media-${VERSION}`;
const SHELL = [
  './', './index.html', './styles.css', './tailwind.css', './manifest.webmanifest', './curriculum.json',
  './audio/manifest.json',
  './js/main.js', './js/themeManager.js', './js/effectsManager.js', './js/soundManager.js', './js/dataManager.js',
  './js/stateManager.js', './js/audioManager.js', './js/uiManager.js', './js/teacherDashboard.js',
  './js/gameEngine.js', './js/questionRenderer.js', './js/textUtils.js', './js/soundOut.js', './js/dialogs.js',
  './js/router.js',
  './icons/icon-192.png',
  './img/units/u0_sounds.svg', './img/units/u1_short.svg', './img/units/u2_digraphs.svg', './img/units/u3_blends.svg',
  './img/units/u4_endings.svg', './img/units/u5_silent_e.svg', './img/units/u6_teams.svg', './img/units/u7_r_vowels.svg',
  './img/units/u8_more_vowels.svg', './img/units/u9_longer.svg'
];

self.addEventListener('install', event => {
  // One missing file must not stop the rest from being kept.
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => Promise.all(SHELL.map(url => cache.add(url).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('words-') && k !== SHELL_CACHE && k !== MEDIA_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    const isClip = url.pathname.includes('/audio/') && url.pathname.endsWith('.mp3');
    event.respondWith(isClip ? cacheFirst(request, MEDIA_CACHE) : networkFirst(request, SHELL_CACHE));
  } else if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
  } else if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(networkFirst(request, MEDIA_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    // Offline: the stored copy (curriculum.json is requested with ?v=…), or the app itself for a page load.
    const hit = await cache.match(request) || await cache.match(request, { ignoreSearch: true })
      || (request.mode === 'navigate' ? await cache.match('./index.html') : undefined);
    if (hit) return hit;
    throw error;
  }
}
