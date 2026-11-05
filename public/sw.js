// منصة جسور التعليمية - Service Worker v2 (PWA & Web Push)
const CACHE_NAME = "jusoor-pwa-v2";

const STATIC_ASSETS = [
  "/manifest.json",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/fonts/alexandria-arabic.woff2",
  "/fonts/alexandria-latin.woff2",
];

// 1. التثبيت والتخزين المؤقت للأصول الأساسية
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Failed to cache some static assets during install:", err);
      });
    })
  );
});

// 2. تفعيل وتنظيف الكاش القديم
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. اعتراض الطلبات باستراتيجية الشبكة أولاً (Network-First) لمنع الجمود
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // استثناء طلبات قواعد البيانات والتصريح والـ API من الكاش تماماً
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("vercel-storage.com")
  ) {
    return;
  }

  // أ. التنقل بين الصفحات (HTML Pages): الشبكة أولاً مع الاحتياط للكاش
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const rootCached = await caches.match("/");
          if (rootCached) return rootCached;
          return new Response(
            `<div dir="rtl" style="font-family:sans-serif;text-align:center;padding:50px;">
              <h2>أنت غير متصل بالإنترنت حالياً 📡</h2>
              <p>يرجى التحقق من اتصالك بالشبكة لتحديث محتوى منصة جسور التعليمية.</p>
            </div>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        })
    );
    return;
  }

  // ب. الملفات الثابتة (الخطوط والأيقونات والتصميم): الكاش أولاً ثم الشبكة
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }
});

// 4. نظام إشعارات الويب الذكية (Web Push)
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: "منصة جسور التعليمية", body: event.data.text() };
    }
  }

  const title = data.title || "منصة جسور التعليمية 🔔";
  const options = {
    body: data.body || "إشعار جديد في منصتك البيداغوجية",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    dir: "rtl",
    lang: "ar",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
      dateOfArrival: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. التفاعل مع النقر على الإشعار وتوجيه المستخدم للصفحة المستهدفة
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // إذا كانت النافذة مفتوحة بالفعل، يتم التركيز عليها
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      // إذا لم تكن مفتوحة، يتم فتحها في نافذة جديدة
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
