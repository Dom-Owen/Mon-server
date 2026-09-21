import fs from "node:fs";
import path from "node:path";
import { profilConnecte } from "@/lib/auth";
import { DOSSIER_FICHIERS } from "@/lib/stockage";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

/**
 * Sert une photo ou un scan téléversé.
 *
 * Réservé aux personnes connectées : un scan de carte d'identité ne doit jamais être
 * accessible à qui devine son adresse. C'est la raison pour laquelle ces fichiers ne
 * sont pas déposés dans le dossier public du site.
 */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ nom: string }> },
) {
  const profil = await profilConnecte();
  if (!profil) return new Response("Non autorisé", { status: 401 });

  const { nom } = await params;
  // On n'accepte qu'un nom de fichier simple : pas de remontée de dossier possible.
  if (!/^[A-Za-z0-9]+\.(jpg|png|webp|pdf)$/.test(nom)) {
    return new Response("Nom de fichier invalide", { status: 400 });
  }

  const chemin = path.join(DOSSIER_FICHIERS, nom);
  if (!fs.existsSync(chemin)) return new Response("Fichier introuvable", { status: 404 });

  const extension = nom.split(".").pop()!;
  return new Response(new Uint8Array(fs.readFileSync(chemin)), {
    headers: {
      "Content-Type": TYPES[extension] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
