/*
 * Service worker de laloc.
 *
 * Deux objectifs, dans cet ordre :
 *  1. que l'application reste consultable quand le réseau saute,
 *  2. qu'elle consomme le moins de data possible, parce qu'au Cameroun elle se paie
 *     souvent au mégaoctet.
 */
const VERSION = "laloc-v1";
const HORS_LIGNE = "/hors-ligne";

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll([HORS_LIGNE, "/icone-192.png", "/manifest.webmanifest"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (ev) => {
  const requete = ev.request;
  if (requete.method !== "GET") return;

  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;

  // Les fichiers de l'application et les images téléversées ne changent jamais :
  // on les sert depuis le cache, sans jamais redemander le réseau.
  const immuable =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/televerse/") ||
    url.pathname.startsWith("/icone-");

  if (immuable) {
    ev.respondWith(
      caches.match(requete).then(
        (c) =>
          c ||
          fetch(requete).then((r) => {
            const copie = r.clone();
            caches.open(VERSION).then((cache) => cache.put(requete, copie));
            return r;
          }),
      ),
    );
    return;
  }

  // Les pages : on tente le réseau, on garde une copie, et on ressert la dernière
  // version connue si la connexion est coupée.
  ev.respondWith(
    fetch(requete)
      .then((r) => {
        if (r.ok && r.headers.get("content-type")?.includes("text/html")) {
          const copie = r.clone();
          caches.open(VERSION).then((cache) => cache.put(requete, copie));
        }
        return r;
      })
      .catch(() =>
        caches.match(requete).then((c) => c || caches.match(HORS_LIGNE)),
      ),
  );
});
