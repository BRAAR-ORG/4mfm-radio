const CACHE_NAME = "4mfm-radio-v3";
const STATIC_ASSETS = [
"/",
"/index.html",
"/style.css",
"/script.js",
"/logo-4mfm.png",
"/favicon.ico"
];

// INSTALAÇÃO
self.addEventListener("install", event => {
event.waitUntil(
caches.open(CACHE_NAME)
.then(cache => cache.addAll(STATIC_ASSETS))
);
self.skipWaiting();
});

// ATIVAÇÃO
self.addEventListener("activate", event => {
event.waitUntil(
caches.keys().then(keys =>
Promise.all(
keys.map(key => {
if (key !== CACHE_NAME) return caches.delete(key);
})
)
)
);
self.clients.claim();
});

// FETCH INTELIGENTE
self.addEventListener("fetch", event => {

const url = new URL(event.request.url);

// Estratégia diferente para API GitHub (network-first)
if (url.hostname.includes("api.github.com")) {
event.respondWith(
fetch(event.request)
.catch(() => caches.match(event.request))
);
return;
}

// Estratégia cache-first para assets
event.respondWith(
caches.match(event.request)
.then(response => response || fetch(event.request)
.then(networkResponse => {
return caches.open(CACHE_NAME).then(cache => {
cache.put(event.request, networkResponse.clone());
return networkResponse;
});
})
)
);
});