try {
  importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
} catch (e) {
  // OneSignal লোড ব্যর্থ হলেও সাইটের মূল অফলাইন-ক্যাশিং যেন থেমে না যায়
}

const CACHE_NAME = 'fb-somadhan-cache-v4';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './admin.html',
  './profile.jpg',
  './manifest.json',
  './admin-manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((name) => name !== CACHE_NAME)
             .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// HTML পেজ (নেভিগেশন + .html ফাইল) কিনা যাচাই — এগুলোর জন্য সবসময় আগে নেটওয়ার্ক থেকে সবশেষ ভার্সন আনার চেষ্টা হবে
function isHtmlRequest(request) {
  return request.mode === 'navigate' || request.url.endsWith('.html') || request.url.endsWith('/');
}

self.addEventListener('fetch', (event) => {
  // শুধু GET রিকোয়েস্ট ক্যাশ করা হয় (ফর্ম সাবমিট / POST রিকোয়েস্ট বাদ)
  if (event.request.method !== 'GET') return;

  if (isHtmlRequest(event.request)) {
    // নেটওয়ার্ক-ফার্স্ট: সবসময় সবশেষ ভার্সন আনার চেষ্টা, নেট না থাকলে ক্যাশ থেকে দেখাবে
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ছবি/আইকন/অন্যান্য স্ট্যাটিক ফাইল: আগের মতোই দ্রুত লোডের জন্য ক্যাশ-ফার্স্ট, ব্যাকগ্রাউন্ডে আপডেট
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
