const CACHE_NAME = "gorankarim-offline-v3";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json"
];

// ذخیره فایل‌های اصلی سایت هنگام نصب
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const file of FILES_TO_CACHE) {
        try {
          await cache.add(file);
        } catch (error) {
          console.log("Cache error:", file, error);
        }
      }
    })
  );

  self.skipWaiting();
});

// فعال‌سازی نسخه جدید بدون پاک کردن ذخیره‌های صوت و متن
self.addEventListener("activate", event => {
  event.waitUntil(
    self.clients.claim()
  );
});

// مدیریت درخواست‌ها برای حالت آنلاین و آفلاین
self.addEventListener("fetch", event => {

  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const scope = self.registration.scope;

  // فقط فایل‌های مربوط به همین سایت
  if (url.origin !== self.location.origin) return;
  if (!url.href.startsWith(scope)) return;

  // صفحه اصلی: ابتدا اینترنت، در صورت قطع اینترنت حافظه کش
  if (request.mode === "navigate") {

    event.respondWith(
      fetch(request)
        .then(response => {

          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, copy);
            });
          }

          return response;
        })
        .catch(async () => {

          const cached = await caches.match(request);

          if (cached) return cached;

          const indexURL = new URL("./index.html", scope);
          const indexCache = await caches.match(indexURL);

          return indexCache || Response.error();
        })
    );

    return;
  }

  // فایل‌های سایت: ابتدا کش، سپس اینترنت
  event.respondWith(
    caches.match(request).then(async cached => {

      if (cached) return cached;

      try {
        const response = await fetch(request);

        if (response && response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;

      } catch (error) {
        return Response.error();
      }

    })
  );

});
