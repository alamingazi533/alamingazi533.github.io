// OneSignal v16 + performance-focused site cache worker
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = "alamin-ai-v5";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./404.html",
  "./about.html",
  "./privacy.html",
  "./terms.html"
];

const STATIC_EXTENSIONS = /\.(?:css|js|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf)$/i;

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
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

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the admin panel; always get the current version.
  if (url.pathname.endsWith("/admin.html")) return;

  // JS ও JSON: নেটওয়ার্ক-ফার্স্ট — সাইট আপডেট করলে ভিজিটর সাথে সাথে নতুন কোড পায়; অফলাইনে ক্যাশ থেকে চলে।
  if (/\.(?:js|json)$/i.test(url.pathname) && !url.pathname.endsWith("/sw.js")) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static files: cache-first for faster repeat visits, with network fallback.
  if (STATIC_EXTENSIONS.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const network = fetch(event.request).then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, copy))
              .catch(() => {});
          }
          return response;
        }).catch(() => cached);

        return cached || network;
      })
    );
    return;
  }

  // HTML/documents: network-first so users see new site changes quickly.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, copy))
            .catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request)
          .then(cached => cached || caches.match("./index.html"))
      )
  );
});
