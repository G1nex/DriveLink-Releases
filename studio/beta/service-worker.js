/* Manifest version: P97Q2tBa */
// Published Blazor WebAssembly app shell. Only same-scope, versioned static
// assets are cached; Gateway WSS, certificate downloads and external APIs are not.
self.importScripts("./service-worker-assets.js");

const cachePrefix = "drivelink-studio:" +
    encodeURIComponent(new URL(self.registration.scope).pathname) + ":";
const cacheName = cachePrefix + self.assetsManifest.version;
const scope = new URL(self.registration.scope);
const included = /\.(?:html|wasm|dll|dat|json|js|css|svg|png|ico|woff2?|ttf)$/i;
const excluded = /(?:^|\/)(?:service-worker(?:\.published)?\.js|service-worker-assets\.js)$|\.(?:pdb|map)$/i;

const assets = self.assetsManifest.assets.filter(asset => {
    const url = new URL(asset.url, scope);
    return url.origin === scope.origin && url.pathname.startsWith(scope.pathname) &&
        included.test(url.pathname) && !excluded.test(url.pathname);
});
const offlinePaths = new Set(assets.map(asset => new URL(asset.url, scope).pathname));

self.addEventListener("install", event => {
    event.waitUntil((async () => {
        const cache = await caches.open(cacheName);
        const requests = assets.map(asset => {
            // The Pages packager rewrites index.html's <base> and the PWA
            // display name after dotnet publish. Their generated publish-time
            // integrity hashes no longer match, but all other assets retain SRI.
            const rewritten = asset.url === "index.html" ||
                asset.url === "manifest.webmanifest";
            return new Request(new URL(asset.url, scope), rewritten
                ? { cache: "reload" }
                : { integrity: asset.hash, cache: "reload" });
        });
        try {
            await cache.addAll(requests);
        } catch (error) {
            // Leave the active version intact and discard a partially cached
            // update (for example due to a transient offline/quota failure).
            await caches.delete(cacheName);
            throw error;
        }
        // Do not call skipWaiting automatically: a live telemetry/recording
        // session must not reload when a new PWA version is published.
    })());
});

self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names
            .filter(name => name.startsWith(cachePrefix) && name !== cacheName)
            .map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener("message", event => {
    if (event.data?.type === "DRIVELINK_ACTIVATE_UPDATE") {
        event.waitUntil(self.skipWaiting());
    }
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

    if (request.mode === "navigate") {
        event.respondWith((async () => {
            const cached = await caches.match(new URL("index.html", scope), {cacheName});
            return cached || fetch(request);
        })());
        return;
    }

    if (!offlinePaths.has(url.pathname)) return;
    event.respondWith((async () => {
        const cached = await caches.match(request, {cacheName});
        return cached || fetch(request);
    })());
});
