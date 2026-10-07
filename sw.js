/* سرویس‌ورکر میز سیگنال — فقط فایل‌های خود برنامه را نگه می‌دارد، نه داده‌ی کانال یا صرافی‌ها.
 *
 * - صفحه‌ی اصلی: از حافظه همان لحظه باز می‌شود و پشت صحنه نسخه‌ی تازه گرفته می‌شود
 *   (stale-while-revalidate). اگر نسخه‌ی تازه فرق داشت، به صفحه خبر می‌دهد تا دکمه‌ی
 *   «نسخه‌ی تازه» نشان دهد؛ بی‌اجازه وسط کار صفحه را عوض نمی‌کنیم.
 * - فونت و آیکون: از حافظه، چون عوض نمی‌شوند.
 * - هر چیز دیگری (تلگرام، صرافی‌ها، واسط‌ها، ورکر همگام‌سازی): اصلاً دست نمی‌زنیم.
 * بدون اینترنت هم برنامه باز می‌شود و پوزیشن‌ها و کارنامه از حافظه‌ی مرورگر می‌آیند.
 */
const CACHE = 'signaldesk-shell-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './fonts/Vazirmatn.woff2',
  './icons/icon.svg', './icons/icon-192.png', './icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => null)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('signaldesk-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const META = './__sd_updated';
self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'sd-check' || !e.source) return;
  e.waitUntil(caches.open(CACHE).then(c => c.match(META)).then(r => r ? r.text() : '0').then(t => {
    if (+t > (+e.data.since || 0)) e.source.postMessage({ type: 'sd-update' });
  }));
});

const sameOrigin = url => url.origin === self.location.origin;
const isPage = (req, url) => req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!sameOrigin(url)) return;                       // داده‌ی بیرونی هیچ‌وقت از حافظه نمی‌آید
  if (url.pathname.endsWith('/sw.js')) return;

  if (isPage(req, url)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const key = './index.html';
      const cached = await cache.match(key);
      // بدنه‌ی cached به صفحه داده می‌شود و دیگر خواندنی نیست؛ نسخه‌ی مقایسه از همین حالا
      const oldCopy = cached ? cached.clone() : null;
      // درخواستِ «navigate» را نمی‌شود با گزینه‌ی تازه دوباره فرستاد (TypeError)؛ پس با خود آدرس
      const fresh = fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }).then(async res => {
        if (res && res.ok && res.type === 'basic') {
          const txt = await res.clone().text();
          const old = oldCopy ? await oldCopy.text() : null;
          await cache.put(key, res.clone());
          if (old != null && old !== txt) {
            // زمانش را نگه می‌داریم: صفحه‌ای که همین حالا از حافظه باز شده هنوز آماده‌ی شنیدن نیست
            // و بعد از بالا آمدن خودش می‌پرسد (sd-check)
            await cache.put(META, new Response(String(Date.now())));
            const cs = await self.clients.matchAll({ type: 'window' });
            cs.forEach(c => c.postMessage({ type: 'sd-update' }));
          }
        }
        return res;
      }).catch(() => null);
      if (cached) { e.waitUntil(fresh); return cached; }
      return (await fresh) || new Response('بدون اینترنت و بدون نسخه‌ی ذخیره‌شده', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })());
    return;
  }

  // فونت، آیکون و manifest: اول حافظه
  if (/\/(fonts|icons)\//.test(url.pathname) || url.pathname.endsWith('.webmanifest')) {
    e.respondWith(caches.open(CACHE).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }));
  }
});

/* زدن روی اعلان: همان پنجره‌ی برنامه جلو می‌آید (یا باز می‌شود) */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) if ('focus' in w) return w.focus();
    return self.clients.openWindow ? self.clients.openWindow('./') : null;
  }));
});
