"use client";

import { useEffect, useState } from "react";

/** Installe le service worker et signale visiblement la perte de réseau. */
export function ServiceWorker() {
  const [horsLigne, setHorsLigne] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Un navigateur qui refuse le service worker ne doit pas casser l'application.
      });
    }
    const majEtat = () => setHorsLigne(!navigator.onLine);
    majEtat();
    window.addEventListener("online", majEtat);
    window.addEventListener("offline", majEtat);
    return () => {
      window.removeEventListener("online", majEtat);
      window.removeEventListener("offline", majEtat);
    };
  }, []);

  if (!horsLigne) return null;

  return (
    <div
      role="status"
      className="fixed bottom-[4.5rem] sm:bottom-4 inset-x-3 z-40 rounded-xl bg-encre text-sable-100 px-4 py-3 shadow-pose text-sm font-medium sans-impression"
    >
      <strong>Pas de connexion.</strong> Vous pouvez consulter ce qui est déjà chargé. Les
      saisies seront à refaire au retour du réseau.
    </div>
  );
}
