import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db, nouvelId, maintenant } from "@/lib/db";
import type { Contexte } from "@/lib/auth";
import { prochainNumero, echeancesDuBail } from "@/lib/domain/imputation";
import { rendrePdf } from "@/lib/pdf/rendu";
import { specDepuisDonnees, type DonneesFigees } from "@/lib/pdf/documents";
import { parametresDe, bailParId, nomLogement } from "@/lib/requetes";
import { aujourdhui, MODES_PAIEMENT } from "@/lib/format";
import { tracer } from "@/lib/audit";

const DOSSIER_PDF = path.join(process.env.LALOC_DONNEES ?? path.join(process.cwd(), "donnees"), "documents");

/** Coordonnées du bailleur, telles qu'elles figureront sur le document. */
export function enTeteBailleur(proprietaireId: string) {
  const p = parametresDe(proprietaireId);
  const profil = db().prepare(`SELECT nom, telephone, email FROM profils WHERE id = ?`).get(proprietaireId) as any;
  return {
    nom: p.raison_sociale || profil?.nom || "Bailleur",
    telephone: p.telephone || profil?.telephone || null,
    email: p.email || profil?.email || null,
    adresse: [p.quartier, p.ville].filter(Boolean).join(", ") || null,
    contribuable: p.numero_contribuable || null,
  };
}

export function adresseLogement(bail: any): string {
  return [bail.bien_quartier, bail.bien_ville].filter(Boolean).join(", ");
}

/**
 * Émission d'un document.
 *
 * Les données sont figées maintenant, dans donnees_json, et le PDF est fabriqué à
 * partir de cet instantané. Une quittance de janvier ne bougera donc jamais, même si
 * le loyer change en mars. L'empreinte du fichier est conservée pour pouvoir prouver
 * plus tard qu'il n'a pas été retouché.
 */
export async function emettreDocument(
  ctx: Contexte,
  type: string,
  donnees: Omit<DonneesFigees, "numero" | "type" | "date" | "mention_legale">,
  liens: { bailId?: string; locataireId?: string; bienId?: string; echeanceIds?: string[] } = {},
): Promise<string> {
  const base = db();
  const p = parametresDe(ctx.proprietaireActif);
  const numero = prochainNumero(ctx.proprietaireActif, type);

  const figees: DonneesFigees = {
    ...donnees,
    type,
    numero,
    date: donnees.lieu !== undefined && (donnees as any).date ? (donnees as any).date : aujourdhui(),
    lieu: donnees.lieu ?? p.ville ?? null,
    mention_legale:
      p.mention_legale_documents ||
      "Modèle indicatif. À faire valider par un conseil juridique avant usage.",
  };

  const id = nouvelId();
  const pdf = await rendrePdf(specDepuisDonnees(figees));
  fs.mkdirSync(DOSSIER_PDF, { recursive: true });
  const nomFichier = `${id}.pdf`;
  fs.writeFileSync(path.join(DOSSIER_PDF, nomFichier), pdf);
  const empreinte = crypto.createHash("sha256").update(pdf).digest("hex");

  base.transaction(() => {
    base
      .prepare(
        `INSERT INTO documents_emis (id, proprietaire_id, type, numero, annee, bail_id,
          locataire_id, bien_id, donnees_json, chemin_pdf, hash, emis_le, emis_par, statut)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'emis')`,
      )
      .run(
        id,
        ctx.proprietaireActif,
        type,
        numero,
        new Date().getFullYear(),
        liens.bailId ?? null,
        liens.locataireId ?? null,
        liens.bienId ?? null,
        JSON.stringify(figees),
        nomFichier,
        empreinte,
        maintenant(),
        ctx.profil.id,
      );
    for (const e of liens.echeanceIds ?? []) {
      base
        .prepare(`INSERT INTO documents_echeances (document_id, echeance_id) VALUES (?, ?)`)
        .run(id, e);
    }
    tracer(ctx, "creation", "documents_emis", id, `${numero} émis`);
  })();

  return id;
}

/**
 * Lien de partage d'un document.
 *
 * WhatsApp ne permet pas de joindre un fichier depuis un lien wa.me : on envoie donc
 * un lien signé vers le PDF. La signature est calculée avec la clé du site, elle est
 * impossible à deviner et ne donne accès qu'à ce document précis.
 */
export function signatureDocument(documentId: string): string {
  return crypto
    .createHmac("sha256", process.env.LALOC_SECRET ?? "cle-de-demonstration-a-remplacer-en-production")
    .update("document:" + documentId)
    .digest("base64url")
    .slice(0, 32);
}

export function signatureValide(documentId: string, signature: string): boolean {
  const attendue = signatureDocument(documentId);
  if (!signature || signature.length !== attendue.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(attendue));
}

export function cheminPdf(nomFichier: string): string {
  return path.join(DOSSIER_PDF, nomFichier);
}

/** Reconstruit le PDF à l'identique depuis l'instantané, si le fichier a disparu. */
export async function pdfDuDocument(documentId: string): Promise<Buffer | null> {
  const doc = db().prepare(`SELECT * FROM documents_emis WHERE id = ?`).get(documentId) as any;
  if (!doc) return null;
  const chemin = doc.chemin_pdf ? cheminPdf(doc.chemin_pdf) : null;
  if (chemin && fs.existsSync(chemin)) return fs.readFileSync(chemin);
  const figees = JSON.parse(doc.donnees_json) as DonneesFigees;
  return rendrePdf(specDepuisDonnees(figees));
}

/**
 * Choisit le bon document après un encaissement.
 * Un REÇU pour un paiement partiel, une QUITTANCE seulement quand la période est
 * intégralement soldée : c'est une distinction juridique, pas un détail d'affichage.
 */
export async function documentPourPaiement(ctx: Contexte, paiementId: string): Promise<string> {
  const base = db();
  const paiement = base.prepare(`SELECT * FROM paiements WHERE id = ?`).get(paiementId) as any;
  const bail = bailParId(paiement.bail_id)!;
  const etats = echeancesDuBail(bail.id);

  const touchees = base
    .prepare(`SELECT echeance_id, montant FROM imputations WHERE paiement_id = ?`)
    .all(paiementId) as any[];

  const concernees = touchees
    .map((i) => etats.find((e) => e.id === i.echeance_id))
    .filter(Boolean) as typeof etats;

  const toutSolde = concernees.length > 0 && concernees.every((e) => e.reste === 0);
  const type = toutSolde ? "quittance" : "recu";

  const lignes = concernees.map((e) => ({
    libelle: e.libelle,
    loyer: e.montant_loyer,
    charges: e.montant_charges,
    total: toutSolde ? e.montant_attendu : touchees.find((i) => i.echeance_id === e.id)!.montant,
  }));

  // Un versement peut n'être imputé sur rien du tout : c'est une avance pure.
  if (lignes.length === 0) {
    lignes.push({
      libelle: "Avance sur loyers à venir",
      loyer: paiement.montant,
      charges: 0,
      total: paiement.montant,
    });
  }

  const reste = concernees.reduce((s, e) => s + e.reste, 0);

  return emettreDocument(
    ctx,
    type,
    {
      bailleur: enTeteBailleur(ctx.proprietaireActif),
      locataire: { nom: bail.locataire_nom, telephone: bail.locataire_telephone },
      logement: { designation: nomLogement(bail), adresse: adresseLogement(bail) },
      lignes,
      periode: concernees.length ? concernees.map((e) => e.libelle).join(", ") : undefined,
      montant: lignes.reduce((s, l) => s + l.total, 0),
      reste,
      mode_paiement: MODES_PAIEMENT[paiement.mode] ?? paiement.mode,
      date_paiement: paiement.date_encaissement,
      date: paiement.date_encaissement,
    } as any,
    {
      bailId: bail.id,
      locataireId: bail.locataire_id,
      echeanceIds: concernees.map((e) => e.id),
    },
  );
}
