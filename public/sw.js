const CACHE_NAME = 'b2b-hub-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo.png', // تأكد من وجود هذا الملف أو احذفه من المصفوفة
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // استخدام cache.addAll أسهل ولكن سنبقي على منطقك لتجنب انهيار التثبيت بسبب ملف واحد
      return Promise.all(
        ASSETS.map((url) =>
          fetch(url)
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch((err) => console.warn('Skipping cache for:', url))
        )
      );
    })
  );
});

// Fetch event - الجزء الذي يحتاج إصلاح
self.addEventListener('fetch', (event) => {
  // 1. تجاهل الطلبات التي ليست HTTP أو HTTPS (مثل إضافات المتصفح)
  if (!(event.request.url.indexOf('http') === 0)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // إذا وجدنا الملف في الكاش، نرجعه
      if (cachedResponse) {
        return cachedResponse;
      }

      // إذا لم نجده، نحاول جلبة من الشبكة
      return fetch(event.request)
        .then((networkResponse) => {
          // تأكد أن الاستجابة صالحة قبل محاولة استخدامها
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          return networkResponse;
        })
        .catch((err) => {
          // هنا يحدث الـ "Failed to fetch" عند انقطاع الشبكة
          console.error('Fetch failed:', err);
          
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
    })
  );
});