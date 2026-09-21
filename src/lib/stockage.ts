import fs from "node:fs";
import path from "node:path";

/**
 * Où vivent la base de données et les fichiers téléversés.
 *
 * Sur un ordinateur, tout est rangé dans le dossier du projet et reste là.
 * Sur un hébergement sans disque permanent (Vercel, par exemple), seul un dossier
 * temporaire est accessible en écriture : la démonstration y fonctionne, mais les
 * données ne survivent pas au redémarrage du serveur. C'est l'unique endroit du code
 * qui connaît cette différence.
 */

/** Vrai quand on tourne sur un hébergement sans disque permanent. */
export const SANS_DISQUE_PERMANENT =
  !!process.env.VERCEL || process.env.LALOC_EPHEMERE === "1";

const RACINE =
  process.env.LALOC_DONNEES ??
  (SANS_DISQUE_PERMANENT ? "/tmp/laloc" : path.join(process.cwd(), "donnees"));

export const DOSSIER_BASE = RACINE;
export const DOSSIER_DOCUMENTS = path.join(RACINE, "documents");
export const DOSSIER_FICHIERS = path.join(RACINE, "fichiers");

export function preparerDossiers(): void {
  for (const d of [DOSSIER_BASE, DOSSIER_DOCUMENTS, DOSSIER_FICHIERS]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

/**
 * Adresse publique d'un fichier téléversé.
 * On passe toujours par une adresse servie par l'application, jamais par le dossier
 * public : les scans de pièces d'identité ne doivent pas être accessibles à qui
 * devine leur nom, et le dossier public n'est de toute façon pas inscriptible en ligne.
 */
export function adresseFichier(nom: string): string {
  return `/api/fichier/${nom}`;
}

/** Retrouve le fichier sur le disque à partir de son adresse publique. */
export function cheminDepuisAdresse(adresse: string): string | null {
  const m = /^\/api\/fichier\/([A-Za-z0-9._-]+)$/.exec(adresse.trim());
  if (!m) return null;
  return path.join(DOSSIER_FICHIERS, m[1]);
}
