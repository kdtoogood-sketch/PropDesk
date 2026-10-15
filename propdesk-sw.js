// PropDesk service worker — app install, offline start, notification taps.
// Always fetches the latest PropDesk from the network first, so updates show immediately;
// the saved copy is only used when the phone is offline.
const CACHE = 'propdesk-v1';
const SHELL = ['./', './propdesk-icon-192.png', './propdesk-badge-96.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // Only the app page itself; never touch Firestore or other data requests
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('./', copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./'))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const tab = (e.notification.data && e.notification.data.tab) || 'leads';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) {
        await c.focus();
        c.postMessage({ type: 'pd-open', tab });
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow('./?tab=' + tab);
  })());
});
