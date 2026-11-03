// Jusoor Self-Purging Service Worker
// يقوم هذا الملف بحذف كافة ملفات الكاش القديمة وإلغاء تسجيل الـ Service Worker فوراً
// لضمان اتصال مباشر وسلس 100% بالخادم السحابي ومنع ظهور شاشة الأوفلاين تماماً.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister())
  );
});

// لا يتم اعتراض أي طلب نهائياً - الاتصال بالإنترنت والشبكة يمر بشكل مباشر 100%
self.addEventListener("fetch", () => {
  return;
});
