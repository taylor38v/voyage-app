/* Voyageo : service worker du carnet de voyage (pages /share/...).
   Objectif : un voyage déjà ouvert une fois reste consultable sans réseau
   (page, voyage, photos, polices et zones de carte déjà affichées). */
const VERSION = "v2";
const APP = `voyageo-app-${VERSION}`;
const DONNEES = `voyageo-donnees-${VERSION}`;
const MEDIAS = `voyageo-medias-${VERSION}`;
const MAX_MEDIAS = 600;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP).then((c) => c.addAll(["/", "/favicon.png", "/manifest.webmanifest"])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((k) => ![APP, DONNEES, MEDIAS].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function reseauPuisCache(requete, cache) {
  try {
    const rep = await fetch(requete);
    if (rep.ok) (await caches.open(cache)).put(requete, rep.clone());
    return rep;
  } catch (e) {
    const enCache = await caches.match(requete);
    if (enCache) return enCache;
    throw e;
  }
}

async function cachePuisReseau(requete, cache, limiter) {
  const enCache = await caches.match(requete);
  if (enCache) return enCache;
  const rep = await fetch(requete);
  if (rep.ok || rep.type === "opaque") {
    const c = await caches.open(cache);
    await c.put(requete, rep.clone());
    if (limiter) {
      const cles = await c.keys();
      if (cles.length > MAX_MEDIAS) await Promise.all(cles.slice(0, cles.length - MAX_MEDIAS).map((k) => c.delete(k)));
    }
  }
  return rep;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Pages : réseau d'abord, sinon la coquille de l'app en cache (le routeur affiche le voyage)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((rep) => {
          if (rep.ok) caches.open(APP).then((c) => c.put("/", rep.clone()));
          return rep;
        })
        .catch(async () => (await caches.match("/")) || Response.error()),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/assets/")) return event.respondWith(cachePuisReseau(req, APP, false)); // fichiers versionnés
    if (url.pathname.startsWith("/api/trips/share/")) return event.respondWith(reseauPuisCache(req, DONNEES));
    if (url.pathname.startsWith("/api/weather")) return event.respondWith(reseauPuisCache(req, DONNEES));
    return; // reste de l'API et de l'admin : jamais en cache
  }

  // Tuiles de carte, photos Wikimedia, polices
  if (/(^|\.)tile\.openstreetmap\.org$/.test(url.hostname) || url.hostname.endsWith(".wikimedia.org")) {
    return event.respondWith(cachePuisReseau(req, MEDIAS, true));
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    return event.respondWith(cachePuisReseau(req, APP, false));
  }
});
