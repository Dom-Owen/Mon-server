"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, nouvelId, maintenant } from "@/lib/db";
import { exigerContexte } from "@/lib/session";
import { tracer } from "@/lib/audit";
import { aLeDroit } from "@/lib/auth";
import { genererEcheancier } from "@/lib/domain/echeancier";
import { imputerPaiement, reimputerBail } from "@/lib/domain/imputation";
import { ajouterMois, aujourdhui, dateLongue } from "@/lib/format";
import { parametresDe } from "@/lib/requetes";

const t = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const n = (v: FormDataEntryValue | null) => {
  const x = parseInt(String(v ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(x) ? x : 0;
};

export async function actionCreerBail(formData: FormData) {
  const ctx = await exigerContexte();
  if (!aLeDroit(ctx, "creer_bail")) {
    redirect("/app?e=" + encodeURIComponent("Le bailleur ne vous a pas délégué la création de baux."));
  }
  const base = db();

  const uniteId = t(formData.get("unite_id"));
  const locataireId = t(formData.get("locataire_id"));
  const dateDebut = t(formData.get("date_debut")) || aujourdhui();
  const dureeMois = Math.max(1, n(formData.get("duree_mois")) || 12);
  const loyer = n(formData.get("loyer_mensuel"));
  const charges = n(formData.get("charges_mensuelles"));

  const echec = (m: string) =>
    redirect(`/app/baux/nouveau?unite=${uniteId}&locataire=${locataireId}&e=${encodeURIComponent(m)}`);

  if (!uniteId || !locataireId) echec("Choisissez un logement et un locataire.");
  if (loyer <= 0) echec("Indiquez un loyer mensuel supérieur à zéro.");

  const unite = base
    .prepare(`SELECT u.*, bi.proprietaire_id FROM unites u JOIN biens bi ON bi.id = u.bien_id WHERE u.id = ?`)
    .get(uniteId) as any;
  if (!unite || unite.proprietaire_id !== ctx.proprietaireActif) echec("Ce logement est introuvable.");

  // Une unité ne peut avoir qu'un seul bail actif à la fois.
  const dejaLoue = base
    .prepare(`SELECT id FROM baux WHERE unite_id = ? AND statut IN ('actif','preavis')`)
    .get(uniteId);
  if (dejaLoue) echec("Ce logement a déjà un bail en cours. Terminez-le avant d'en créer un autre.");

  const bailId = nouvelId();
  // Par défaut le loyer est dû le jour du mois où le bail commence : c'est ce qui
  // évite qu'une échéance tombe avant le début de la période qu'elle couvre.
  const jourEcheance = n(formData.get("jour_echeance")) || Number(dateDebut.slice(8, 10));
  const periodicite = t(formData.get("periodicite")) || "mensuelle";
  const caution = n(formData.get("montant_caution"));
  const cautionVersee = n(formData.get("caution_versee"));
  const moisAvance = n(formData.get("mois_avance"));
  const avanceVersee = n(formData.get("avance_versee"));
  const origine = t(formData.get("origine")) || "application";

  base.transaction(() => {
    base
      .prepare(
        `INSERT INTO baux (id, proprietaire_id, unite_id, locataire_id, date_debut, duree_mois,
          date_fin_prevue, usage, loyer_mensuel, charges_mensuelles, jour_echeance, periodicite,
          montant_caution, caution_versee, mois_avance, mode_paiement, statut, origine,
          solde_ouverture, document_bail, cree_le)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'actif',?,?,?,?)`,
      )
      .run(
        bailId,
        ctx.proprietaireActif,
        uniteId,
        locataireId,
        dateDebut,
        dureeMois,
        ajouterMois(dateDebut, dureeMois),
        t(formData.get("usage")) || "habitation",
        loyer,
        charges,
        jourEcheance,
        periodicite,
        caution,
        cautionVersee,
        moisAvance,
        t(formData.get("mode_paiement")) || "especes",
        origine,
        n(formData.get("solde_ouverture")),
        t(formData.get("document_bail")) || null,
        maintenant(),
      );

    base
      .prepare(
        `INSERT INTO bail_locataires (bail_id, locataire_id, titulaire_principal) VALUES (?, ?, 1)`,
      )
      .run(bailId, locataireId);

    // L'échéancier complet est généré tout de suite.
    const lignes = genererEcheancier({
      date_debut: dateDebut,
      duree_mois: dureeMois,
      loyer_mensuel: loyer,
      charges_mensuelles: charges,
      jour_echeance: jourEcheance,
      periodicite,
    });
    const ins = base.prepare(
      `INSERT INTO echeances (id, bail_id, periode_debut, periode_fin, libelle, date_echeance,
        montant_loyer, montant_charges, montant_attendu, cree_le)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    );
    for (const l of lignes) {
      ins.run(
        nouvelId(),
        bailId,
        l.periode_debut,
        l.periode_fin,
        l.libelle,
        l.date_echeance,
        l.montant_loyer,
        l.montant_charges,
        l.montant_attendu,
        maintenant(),
      );
    }

    base.prepare(`UPDATE unites SET statut = 'occupee' WHERE id = ?`).run(uniteId);

    // L'avance versée à l'entrée est un vrai paiement : elle se répartit sur les
    // premiers mois, exactement comme n'importe quel encaissement.
    if (avanceVersee > 0) {
      const paiementId = nouvelId();
      base
        .prepare(
          `INSERT INTO paiements (id, proprietaire_id, bail_id, montant, date_encaissement, mode,
            reference, encaisse_par, commentaire, cle_idempotence, statut, cree_le)
           VALUES (?,?,?,?,?,?,?,?,?,?,'enregistre',?)`,
        )
        .run(
          paiementId,
          ctx.proprietaireActif,
          bailId,
          avanceVersee,
          dateDebut,
          t(formData.get("mode_paiement")) || "especes",
          null,
          ctx.profil.id,
          moisAvance > 0 ? `Avance de ${moisAvance} mois versée à l'entrée` : "Versement à l'entrée",
          nouvelId(),
          maintenant(),
        );
      imputerPaiement(paiementId, bailId, avanceVersee);
    }

    tracer(ctx, "creation", "baux", bailId, `Bail créé à partir du ${dateLongue(dateDebut)}`);
  })();

  revalidatePath("/app");
  redirect(`/app/baux/${bailId}?nouveau=1`);
}

export async function actionDeposerPreavis(formData: FormData) {
  const ctx = await exigerContexte();
  const bailId = t(formData.get("bail_id"));
  const base = db();
  const bail = base.prepare(`SELECT * FROM baux WHERE id = ?`).get(bailId) as any;
  if (!bail || bail.proprietaire_id !== ctx.proprietaireActif) redirect("/app");

  const p = parametresDe(ctx.proprietaireActif);
  const origine = t(formData.get("origine")) || "locataire";
  const duree =
    n(formData.get("duree_preavis_mois")) ||
    (origine === "locataire" ? p.preavis_locataire_mois : p.preavis_bailleur_mois);
  const dateDepot = t(formData.get("date_depot")) || aujourdhui();

  const id = nouvelId();
  base
    .prepare(
      `INSERT INTO preavis (id, bail_id, origine, date_depot, date_effet, duree_preavis_mois,
        motif, statut, cree_le) VALUES (?,?,?,?,?,?,?,'depose',?)`,
    )
    .run(
      id,
      bailId,
      origine,
      dateDepot,
      t(formData.get("date_effet")) || ajouterMois(dateDepot, duree),
      duree,
      t(formData.get("motif")) || null,
      maintenant(),
    );
  base.prepare(`UPDATE baux SET statut = 'preavis' WHERE id = ?`).run(bailId);
  tracer(ctx, "creation", "preavis", id, `Préavis déposé (${origine})`);
  revalidatePath(`/app/baux/${bailId}`);
  redirect(`/app/baux/${bailId}`);
}

export async function actionTerminerBail(formData: FormData) {
  const ctx = await exigerContexte();
  if (!aLeDroit(ctx, "resilier_bail")) {
    redirect(
      `/app/baux/${t(formData.get("bail_id"))}?e=` +
        encodeURIComponent("Le bailleur ne vous a pas délégué la résiliation des baux."),
    );
  }
  const bailId = t(formData.get("bail_id"));
  const base = db();
  const bail = base.prepare(`SELECT * FROM baux WHERE id = ?`).get(bailId) as any;
  if (!bail || bail.proprietaire_id !== ctx.proprietaireActif) redirect("/app");

  base.transaction(() => {
    base
      .prepare(`UPDATE baux SET statut = ?, date_fin_reelle = ?, motif_fin = ? WHERE id = ?`)
      .run(
        t(formData.get("statut")) || "termine",
        t(formData.get("date_fin_reelle")) || aujourdhui(),
        t(formData.get("motif")) || null,
        bailId,
      );
    base.prepare(`UPDATE unites SET statut = 'libre' WHERE id = ?`).run(bail.unite_id);
    tracer(ctx, "modification", "baux", bailId, "Bail terminé");
  })();

  revalidatePath("/app");
  redirect(`/app/baux/${bailId}`);
}

export async function actionReviserLoyer(formData: FormData) {
  const ctx = await exigerContexte();
  const bailId = t(formData.get("bail_id"));
  const base = db();
  const bail = base.prepare(`SELECT * FROM baux WHERE id = ?`).get(bailId) as any;
  if (!bail || bail.proprietaire_id !== ctx.proprietaireActif) redirect("/app");

  const nouveau = n(formData.get("nouveau_loyer"));
  const dateEffet = t(formData.get("date_effet")) || aujourdhui();
  if (nouveau <= 0) redirect(`/app/baux/${bailId}?e=` + encodeURIComponent("Indiquez le nouveau loyer."));

  base.transaction(() => {
    base
      .prepare(
        `INSERT INTO revisions_loyer (id, bail_id, date_effet, ancien_loyer, nouveau_loyer, motif, cree_le)
         VALUES (?,?,?,?,?,?,?)`,
      )
      .run(nouvelId(), bailId, dateEffet, bail.loyer_mensuel, nouveau, t(formData.get("motif")) || null, maintenant());

    base.prepare(`UPDATE baux SET loyer_mensuel = ? WHERE id = ?`).run(nouveau, bailId);

    // Seules les échéances futures changent. Les quittances déjà remises ne bougent pas.
    base
      .prepare(
        `UPDATE echeances SET montant_loyer = ?, montant_attendu = ? + montant_charges
         WHERE bail_id = ? AND periode_debut >= ?`,
      )
      .run(nouveau, nouveau, bailId, dateEffet);

    reimputerBail(bailId);
    tracer(ctx, "modification", "baux", bailId, `Loyer révisé à partir du ${dateLongue(dateEffet)}`);
  })();

  revalidatePath(`/app/baux/${bailId}`);
  redirect(`/app/baux/${bailId}`);
}
