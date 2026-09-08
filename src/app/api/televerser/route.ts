import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { profilConnecte } from "@/lib/auth";

/**
 * Réception d'un fichier déjà compressé par le navigateur.
 * On refuse tout ce qui dépasse la limite : c'est le stockage des photos qui coûte
 * le plus cher, et une photo d'état des lieux n'a aucun besoin de peser 4 Mo.
 */
const LIMITE_OCTETS = 3 * 1024 * 1024;
const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function POST(requete: Request) {
  const profil = await profilConnecte();
  if (!profil) {
    return NextResponse.json({ erreur: "Vous n'êtes pas connecté." }, { status: 401 });
  }

  const donnees = await requete.formData();
  const fichier = donnees.get("fichier");
  if (!(fichier instanceof File)) {
    return NextResponse.json({ erreur: "Aucun fichier reçu." }, { status: 400 });
  }
  if (fichier.size > LIMITE_OCTETS) {
    return NextResponse.json(
      { erreur: "Ce fichier est trop lourd. Réessayez avec une photo plus petite." },
      { status: 413 },
    );
  }
  if (!TYPES_ACCEPTES.includes(fichier.type)) {
    return NextResponse.json(
      { erreur: "Seules les photos et les fichiers PDF sont acceptés." },
      { status: 415 },
    );
  }

  const octets = Buffer.from(await fichier.arrayBuffer());
  // Deux fois le même fichier ne sera jamais stocké deux fois.
  const empreinte = crypto.createHash("sha256").update(octets).digest("hex");
  const extension =
    fichier.type === "application/pdf"
      ? "pdf"
      : fichier.type === "image/png"
        ? "png"
        : fichier.type === "image/webp"
          ? "webp"
          : "jpg";
  const nom = `${empreinte.slice(0, 24)}.${extension}`;
  const dossier = path.join(process.cwd(), "public", "televerse");
  await fs.mkdir(dossier, { recursive: true });
  await fs.writeFile(path.join(dossier, nom), octets);

  return NextResponse.json({
    chemin: `/televerse/${nom}`,
    taille: octets.length,
    format: extension,
    hash: empreinte,
  });
}
