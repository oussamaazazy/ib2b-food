const CACHE_NAME = 'esb2b-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// تثبيت الأصول الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// تفعيل وحذف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// إصلاح fetch event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // تجاهل تماماً جميع الطلبات الخارجية (Google Script, Firebase, etc.)
  if (url.origin !== self.location.origin) {
    // تجاهل طلبات Google Apps Script
    if (url.href.includes('script.google.com')) {
      return; // دع المتصفح يتعامل معها مباشرة
    }
    // تجاهل طلبات Firebase
    if (url.href.includes('firebase') || url.href.includes('googleapis')) {
      return;
    }
    // تجاهل Vite/HMR
    if (url.href.includes('@vite') || url.href.includes('node_modules')) {
      return;
    }
  }
  
  // فقط اعترض الطلبات المحلية
  event.respondWith(
    (async () => {
      try {
        // حاول أولاً من الكاش
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // إذا لم يوجد، اجلب من الشبكة
        const networkResponse = await fetch(event.request);
        
        // فقط خزن استجابات ناجحة للمحتوى الثابت
        if (networkResponse.status === 200 && event.request.destination) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // فقط لطلبات الصفحات، ارجع صفحة الـ offline
        if (event.request.destination === 'document') {
          const cached = await caches.match('/index.html');
          if (cached) return cached;
        }
        throw error;
      }
    })()
  );
});