"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, nouvelId, maintenant } from "@/lib/db";
import { exigerContexte } from "@/lib/session";
import { tracer } from "@/lib/audit";
import { aLeDroit } from "@/lib/auth";
import { imputerPaiement, reimputerBail } from "@/lib/domain/imputation";
import { aujourdhui, fcfa } from "@/lib/format";

const t = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const n = (v: FormDataEntryValue | null) => {
  const x = parseInt(String(v ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(x) ? x : 0;
};

/**
 * Enregistrement d'un encaissement.
 *
 * La clé d'idempotence est fabriquée par le formulaire, pas par le serveur : si le
 * réseau coupe pendant l'envoi et que le téléphone réessaie, la base reconnaît la clé
 * et n'enregistre pas le paiement deux fois. Sur un outil qui suit de l'argent liquide,
 * c'est la protection la plus importante de toute l'application.
 */
export async function actionEnregistrerPaiement(formData: FormData) {
  const ctx = await exigerContexte();
  if (!aLeDroit(ctx, "encaisser")) {
    redirect("/app/paiements?e=" + encodeURIComponent("Le bailleur ne vous a pas délégué l'encaissement."));
  }

  const bailId = t(formData.get("bail_id"));
  const montant = n(formData.get("montant"));
  const cle = t(formData.get("cle_idempotence")) || nouvelId();
  const echec = (m: string) =>
    redirect(`/app/paiements/nouveau?bail=${bailId}&e=${encodeURIComponent(m)}`);

  if (!bailId) echec("Choisissez le locataire qui a payé.");
  if (montant <= 0) echec("Le montant doit être supérieur à zéro.");

  const base = db();
  const bail = base
    .prepare(
      `SELECT b.*, l.nom AS locataire_nom FROM baux b JOIN locataires l ON l.id = b.locataire_id
       WHERE b.id = ?`,
    )
    .get(bailId) as any;
  if (!bail || bail.proprietaire_id !== ctx.proprietaireActif) echec("Ce bail est introuvable.");

  // Le même envoi rejoué ne crée pas un second paiement.
  const deja = base.prepare(`SELECT id FROM paiements WHERE cle_idempotence = ?`).get(cle) as any;
  if (deja) redirect(`/app/paiements/${deja.id}`);

  const paiementId = nouvelId();
  base.transaction(() => {
    base
      .prepare(
        `INSERT INTO paiements (id, proprietaire_id, bail_id, montant, date_encaissement, mode,
          reference, encaisse_par, commentaire, photo_recu, cle_idempotence, statut, cree_le)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,'enregistre',?)`,
      )
      .run(
        paiementId,
        ctx.proprietaireActif,
        bailId,
        montant,
        t(formData.get("date_encaissement")) || aujourdhui(),
        t(formData.get("mode")) || "especes",
        t(formData.get("reference")) || null,
        ctx.profil.id,
        t(formData.get("commentaire")) || null,
        t(formData.get("photo_recu")) || null,
        cle,
        maintenant(),
      );

    // Imputation automatique sur les échéances les plus anciennes.
    imputerPaiement(paiementId, bailId, montant);

    tracer(
      ctx,
      "creation",
      "paiements",
      paiementId,
      `${fcfa(montant)} encaissés de ${bail.locataire_nom}`,
    );
  })();

  revalidatePath("/app");
  redirect(`/app/paiements/${paiementId}?nouveau=1`);
}

/** On n'efface jamais un encaissement : on l'annule, et la trace reste. */
export async function actionAnnulerPaiement(formData: FormData) {
  const ctx = await exigerContexte();
  const id = t(formData.get("id"));
  const base = db();
  const p = base.prepare(`SELECT * FROM paiements WHERE id = ?`).get(id) as any;
  if (!p || p.proprietaire_id !== ctx.proprietaireActif) redirect("/app/paiements");

  base.transaction(() => {
    base
      .prepare(`UPDATE paiements SET statut = 'annule', motif_annulation = ? WHERE id = ?`)
      .run(t(formData.get("motif")) || "Annulé par le bailleur", id);
    // Tout est réimputé : les échéances qu'il couvrait redeviennent dues.
    reimputerBail(p.bail_id);
    tracer(ctx, "modification", "paiements", id, `Paiement de ${fcfa(p.montant)} annulé`);
  })();

  revalidatePath("/app");
  redirect(`/app/baux/${p.bail_id}`);
}
