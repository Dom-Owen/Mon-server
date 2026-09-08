import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * Base de données de la démonstration.
 *
 * On utilise SQLite, un moteur de base contenu dans un simple fichier : l'application
 * démarre sans aucun compte à créer ni service à installer. Tout l'accès aux données
 * passe par ce module, de sorte que le passage à Supabase (PostgreSQL) plus tard ne
 * touchera que ce dossier.
 */

const DOSSIER = process.env.LALOC_DONNEES ?? path.join(process.cwd(), "donnees");
const FICHIER = path.join(DOSSIER, "laloc.db");

let instance: Database.Database | null = null;

export function db(): Database.Database {
  if (instance) return instance;
  fs.mkdirSync(DOSSIER, { recursive: true });
  const base = new Database(FICHIER);
  base.pragma("journal_mode = WAL");
  base.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(
    path.join(process.cwd(), "src/lib/db/schema.sql"),
    "utf-8",
  );
  base.exec(schema);
  instance = base;
  return base;
}

/** Identifiant unique fabriqué côté application, jamais par le serveur de base. */
export function nouvelId(): string {
  return crypto.randomUUID();
}

export function maintenant(): string {
  return new Date().toISOString();
}

/** Exécute plusieurs écritures en une seule transaction : tout passe ou rien ne passe. */
export function transaction<T>(fn: () => T): T {
  return db().transaction(fn)();
}
