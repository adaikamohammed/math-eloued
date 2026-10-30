// Service Worker - منصة جسور التعليمية (Jusoor Offline Engine)
const CACHE_NAME = "jusoor-offline-v1";

// الملفات والصفحات المحورية المطلوب حفظها مسبقاً في ذاكرة الهاتف أو الحاسوب
const PRECACHE_ASSETS = [
  "/",
  "/offline",
  "/login",
  "/eval",
  "/t/search",
  "/assessment",
  "/manifest.json",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/fonts/alexandria-arabic.woff2",
  "/fonts/alexandria-latin.woff2",
];

// نقاط النهاية العامة التي يمكن حفظها لتصفح الدروس والكراريس بدون إنترنت
const CACHEABLE_PUBLIC_API = ["/api/lessons", "/api/honors"];

function isCacheablePublicApi(url) {
  return url.searchParams.has("teacher") && CACHEABLE_PUBLIC_API.some((p) => url.pathname.startsWith(p));
}

// 1. مرحلة التثبيت: حفظ الخط العربي والصفحات الأساسية في ذاكرة الجهاز
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // حفظ الملفات الأساسية مع استمرار التثبيت حتى لو تعذر جلب ملف ثانوي
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn("Pre-cache asset warning:", asset, err);
        }
      }
    })
  );
  self.skipWaiting();
});

// 2. مرحلة التفعيل: تنظيف الذاكرة القديمة وترقية الكاش
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. إدارة الطلبات والتخزين المؤقت (Fetch Strategy)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // تجاهل أي طلب غير GET أو غير http/https
  if (req.method !== "GET" || !url.protocol.startsWith("http")) return;

  // أ. ملفات الخط العربي المحلية: Cache-First فائق السرعة
  if (url.pathname.startsWith("/fonts/") || url.pathname.endsWith(".woff2")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ب. استدعاءات الـ API: Network-first مع بديل من الذاكرة عند انقطاع النت
  if (url.pathname.startsWith("/api/")) {
    const cacheable = isCacheablePublicApi(url);
    const cacheKey = new URL(url);
    cacheKey.searchParams.delete("_t");
    cacheKey.searchParams.delete("t");

    event.respondWith(
      fetch(req)
        .then((response) => {
          if (cacheable && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey.toString(), clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = cacheable ? await caches.match(cacheKey.toString()) : null;
          if (cached) return cached;
          return new Response(
            JSON.stringify({
              error: "وضع العمل بدون إنترنت (أوفلاين)",
              offline: true,
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }
          );
        })
    );
    return;
  }

  // ج. تصفح الصفحات (HTML Navigation): Network-first مع الرجوع للكاش ثم صفحة /offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;

          // إذا كانت محاولة فتح صفحة التقويم
          if (url.pathname.startsWith("/eval")) {
            const evalCached = await caches.match("/eval");
            if (evalCached) return evalCached;
          }

          // العودة لصفحة الأوفلاين الاحتياطية المخصصة أو الرئيسية
          const offlineFallback = await caches.match("/offline");
          if (offlineFallback) return offlineFallback;

          const homeFallback = await caches.match("/");
          if (homeFallback) return homeFallback;

          return Response.error();
        })
    );
    return;
  }

  // د. الموارد الثابتة (CSS, JS, Icons, Images): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
