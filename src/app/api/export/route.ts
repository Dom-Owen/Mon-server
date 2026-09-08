import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { profilConnecte, contexteDe } from "@/lib/auth";
import { creerZip, csv } from "@/lib/zip";
import { pdfDuDocument } from "@/lib/documents";
import { aujourdhui, dateLongue, MODES_PAIEMENT } from "@/lib/format";
import { titreDocument } from "@/lib/pdf/documents";

/**
 * « Télécharger toutes mes données ».
 * Une archive contenant les tableaux, tous les PDF émis et tous les fichiers téléversés.
 * Le bailleur récupère son patrimoine documentaire en un clic, sans dépendre de laloc.
 */
export async function GET(requete: Request) {
  const profil = await profilConnecte();
  if (!profil) return new Response("Non autorisé", { status: 401 });

  const ctx = contexteDe(profil);
  const url = new URL(requete.url);
  const bailUnique = url.searchParams.get("bail");
  const base = db();

  const proprio = ctx.proprietaireActif;
  const filtreBail = bailUnique ? ` AND b.id = '${bailUnique.replace(/'/g, "")}'` : "";

  const fichiers: { nom: string; contenu: Buffer | string }[] = [];

  // ------------------------------------------------------------- les tableaux
  const biens = base
    .prepare(`SELECT * FROM biens WHERE proprietaire_id = ? ORDER BY nom`)
    .all(proprio) as any[];
  fichiers.push({
    nom: "tableaux/biens.csv",
    contenu: csv(
      ["Nom", "Type", "Usage", "Ville", "Quartier", "Point de repère", "Mode de charges", "Archivé"],
      biens.map((b) => [b.nom, b.type, b.usage, b.ville, b.quartier, b.point_repere, b.mode_charges, b.archive_le ? "oui" : "non"]),
    ),
  });

  const locataires = base
    .prepare(`SELECT * FROM locataires WHERE proprietaire_id = ? ORDER BY nom`)
    .all(proprio) as any[];
  fichiers.push({
    nom: "tableaux/locataires.csv",
    contenu: csv(
      ["Nom", "Type", "Téléphone", "WhatsApp", "Email", "Profession", "Pièce", "Numéro de pièce", "Garant"],
      locataires.map((l) => [l.nom, l.type, l.telephone, l.whatsapp, l.email, l.profession, l.type_piece, l.numero_piece, l.garant_nom]),
    ),
  });

  const baux = base
    .prepare(
      `SELECT b.*, l.nom AS locataire, bi.nom AS bien, u.libelle AS unite
       FROM baux b JOIN locataires l ON l.id = b.locataire_id
       JOIN unites u ON u.id = b.unite_id JOIN biens bi ON bi.id = u.bien_id
       WHERE b.proprietaire_id = ?${filtreBail} ORDER BY b.date_debut DESC`,
    )
    .all(proprio) as any[];
  fichiers.push({
    nom: "tableaux/baux.csv",
    contenu: csv(
      ["Locataire", "Bien", "Logement", "Début", "Fin prévue", "Loyer", "Charges", "Caution", "Statut", "Origine"],
      baux.map((b) => [b.locataire, b.bien, b.unite, b.date_debut, b.date_fin_prevue, b.loyer_mensuel, b.charges_mensuelles, b.montant_caution, b.statut, b.origine]),
    ),
  });

  const paiements = base
    .prepare(
      `SELECT p.*, l.nom AS locataire, bi.nom AS bien FROM paiements p
       JOIN baux b ON b.id = p.bail_id JOIN locataires l ON l.id = b.locataire_id
       JOIN unites u ON u.id = b.unite_id JOIN biens bi ON bi.id = u.bien_id
       WHERE p.proprietaire_id = ?${filtreBail} ORDER BY p.date_encaissement DESC`,
    )
    .all(proprio) as any[];
  fichiers.push({
    nom: "tableaux/paiements.csv",
    contenu: csv(
      ["Date", "Locataire", "Bien", "Montant FCFA", "Moyen", "Référence", "Statut", "Commentaire"],
      paiements.map((p) => [p.date_encaissement, p.locataire, p.bien, p.montant, MODES_PAIEMENT[p.mode] ?? p.mode, p.reference, p.statut, p.commentaire]),
    ),
  });

  const echeances = base
    .prepare(
      `SELECT e.*, l.nom AS locataire, COALESCE((SELECT SUM(i.montant) FROM imputations i
         JOIN paiements p ON p.id = i.paiement_id AND p.statut='enregistre'
         WHERE i.echeance_id = e.id), 0) AS regle
       FROM echeances e JOIN baux b ON b.id = e.bail_id JOIN locataires l ON l.id = b.locataire_id
       WHERE b.proprietaire_id = ?${filtreBail} ORDER BY e.date_echeance DESC`,
    )
    .all(proprio) as any[];
  fichiers.push({
    nom: "tableaux/echeances.csv",
    contenu: csv(
      ["Échéance", "Locataire", "Période", "Loyer", "Charges", "Total attendu", "Réglé", "Reste"],
      echeances.map((e) => [e.date_echeance, e.locataire, e.libelle, e.montant_loyer, e.montant_charges, e.montant_attendu, e.regle, e.montant_attendu - e.regle]),
    ),
  });

  // --------------------------------------------------------------- les PDF
  const documents = base
    .prepare(
      `SELECT d.*, l.nom AS locataire FROM documents_emis d
       LEFT JOIN locataires l ON l.id = d.locataire_id
       WHERE d.proprietaire_id = ?${bailUnique ? ` AND d.bail_id = '${bailUnique.replace(/'/g, "")}'` : ""}
       ORDER BY d.emis_le DESC`,
    )
    .all(proprio) as any[];

  fichiers.push({
    nom: "tableaux/documents.csv",
    contenu: csv(
      ["Numéro", "Type", "Locataire", "Émis le", "Statut", "Empreinte SHA-256"],
      documents.map((d) => [d.numero, titreDocument(d.type), d.locataire, d.emis_le, d.statut, d.hash]),
    ),
  });

  for (const d of documents) {
    try {
      const pdf = await pdfDuDocument(d.id);
      if (pdf) {
        // On garde les accents : « \w » ne les couvre pas et transformait
        // « État des lieux d'entrée » en « _tat des lieux d_entr_e ».
        const nomSain = `${d.numero}-${titreDocument(d.type)}`
          .replace(/['']/g, " ")
          .replace(/[^\p{L}\p{N}\-. ]/gu, "_")
          .replace(/\s+/g, " ")
          .trim();
        fichiers.push({ nom: `documents/${nomSain}.pdf`, contenu: pdf });
      }
    } catch {
      // Un document illisible ne doit pas faire échouer tout l'export.
    }
  }

  // --------------------------------------------------- les fichiers téléversés
  const chemins = new Set<string>();
  for (const l of locataires) if (l.scan_piece) chemins.add(l.scan_piece);
  for (const b of biens) if (b.photo) chemins.add(b.photo);
  for (const b of baux) if (b.document_bail) for (const c of String(b.document_bail).split(",")) chemins.add(c.trim());
  for (const p of paiements) if (p.photo_recu) chemins.add(p.photo_recu);
  const photosEdl = base
    .prepare(
      `SELECT ph.fichier FROM edl_photos ph JOIN etats_des_lieux ed ON ed.id = ph.edl_id
       WHERE ed.proprietaire_id = ?`,
    )
    .all(proprio) as any[];
  for (const p of photosEdl) chemins.add(p.fichier);

  for (const c of chemins) {
    if (!c || !c.startsWith("/televerse/")) continue;
    const chemin = path.join(process.cwd(), "public", c);
    try {
      if (fs.existsSync(chemin)) {
        fichiers.push({ nom: `fichiers/${path.basename(c)}`, contenu: fs.readFileSync(chemin) });
      }
    } catch {
      // idem : un fichier manquant ne bloque pas l'archive
    }
  }

  fichiers.push({
    nom: "LISEZ-MOI.txt",
    contenu:
      `Export de vos données laloc\n` +
      `Généré le ${dateLongue(aujourdhui())}\n\n` +
      `Ce dossier contient :\n` +
      `  tableaux/    vos biens, locataires, baux, paiements et échéances au format CSV,\n` +
      `               ouvrables dans Excel ou LibreOffice.\n` +
      `  documents/   tous les PDF que vous avez émis, tels qu'ils ont été remis.\n` +
      `  fichiers/    les photos et scans que vous avez téléversés.\n\n` +
      `Ces fichiers vous appartiennent. Ils s'ouvrent sans laloc et sans internet.\n`,
  });

  const zip = creerZip(fichiers);
  const nomArchive = `laloc-${bailUnique ? "bail-" : "donnees-"}${aujourdhui()}.zip`;

  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nomArchive}"`,
    },
  });
}
