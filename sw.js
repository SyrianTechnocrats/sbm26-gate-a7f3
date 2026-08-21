/* Offline cache for the Technocrats attendance scanner (Syrian Biomedica 2026).
   v4: index.html is NETWORK-FIRST (falls back to cache offline) so roster updates
   reach installed phones automatically; static assets stay cache-first. */
var CACHE = 'sbm26-attendance-v4';
var ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function isAppShell(req) {
  if (req.mode === 'navigate') return true;
  var p = new URL(req.url).pathname;
  return p.endsWith('/index.html') || p.endsWith('/sbm26-gate-a7f3/') || p.endsWith('/sbm26-gate-a7f3');
}

self.addEventListener('fetch', function (e) {
  var req = e.request;

  // Never touch the sync POSTs to Google Apps Script — they must always hit the network.
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  if (isAppShell(req)) {
    // network-first: updates arrive whenever the phone is online; offline still works
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) {
            c.put('./index.html', copy);
          }).catch(function () {});
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // static assets: cache-first
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
