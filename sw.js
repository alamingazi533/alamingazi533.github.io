// OneSignal v16 + site cache worker
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = 'alamin-ai-v2';

const APP_SHELL = [
  './',
  './index.html',
  './admin.html',
  './manifest.json',
  './404.html',
  './about.html',
  './privacy.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();

        caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, copy))
          .catch(() => {});

        return response;
      })
      .catch(() =>
        caches.match(event.request)
          .then(cached =>
            cached || caches.match('./index.html')
          )
      )
  );
});
