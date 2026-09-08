"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, maintenant, nouvelId } from "@/lib/db";
import { exigerContexte } from "@/lib/session";
import { aLeDroit } from "@/lib/auth";
import { tracer } from "@/lib/audit";
import {
  adresseLogement,
  documentPourPaiement,
  emettreDocument,
  enTeteBailleur,
} from "@/lib/documents";
import { bailParId, echeancesDuBail, nomLogement, parametresDe, situationBail } from "@/lib/requetes";
import { aujourdhui, MODES_PAIEMENT } from "@/lib/format";
import { MODELES_DEFAUT } from "@/lib/pdf/modeles-defaut";

const t = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const n = (v: FormDataEntryValue | null) => {
  const x = parseInt(String(v ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(x) ? x : 0;
};

async function garde() {
  const ctx = await exigerContexte();
  if (!aLeDroit(ctx, "generer_documents")) {
    redirect("/app?e=" + encodeURIComponent("Le bailleur ne vous a pas délégué la génération de documents."));
  }
  return ctx;
}

/** Reçu ou quittance selon que la période est soldée ou non. */
export async function actionDocumentPaiement(formData: FormData) {
  const ctx = await garde();
  const paiementId = t(formData.get("paiement_id"));
  const p = db().prepare(`SELECT * FROM paiements WHERE id = ?`).get(paiementId) as any;
  if (!p || p.proprietaire_id !== ctx.proprietaireActif) redirect("/app/paiements");

  const docId = await documentPourPaiement(ctx, paiementId);
  revalidatePath("/app/documents");
  redirect(`/app/documents/${docId}`);
}

/** Quittance d'une échéance précise, uniquement si elle est intégralement soldée. */
export async function actionQuittanceEcheance(formData: FormData) {
  const ctx = await garde();
  const echeanceId = t(formData.get("echeance_id"));
  const base = db();
  const ech = base.prepare(`SELECT * FROM echeances WHERE id = ?`).get(echeanceId) as any;
  if (!ech) redirect("/app");
  const bail = bailParId(ech.bail_id)!;
  if (bail.id !== ech.bail_id) redirect("/app");

  const etats = echeancesDuBail(bail.id);
  const etat = etats.find((e) => e.id === echeanceId)!;
  const solde = etat.reste === 0;

  const docId = await emettreDocument(
    ctx,
    solde ? "quittance" : "recu",
    {
      bailleur: enTeteBailleur(ctx.proprietaireActif),
      locataire: { nom: bail.locataire_nom, telephone: bail.locataire_telephone },
      logement: { designation: nomLogement(bail), adresse: adresseLogement(bail) },
      lignes: [
        {
          libelle: etat.libelle,
          loyer: etat.montant_loyer,
          charges: etat.montant_charges,
          total: solde ? etat.montant_attendu : etat.impute,
        },
      ],
      periode: etat.libelle,
      montant: solde ? etat.montant_attendu : etat.impute,
      reste: etat.reste,
      date: aujourdhui(),
    } as any,
    { bailId: bail.id, locataireId: bail.locataire_id, echeanceIds: [echeanceId] },
  );
  revalidatePath("/app/documents");
  redirect(`/app/documents/${docId}`);
}

/** Documents liés à un bail : contrat, avis, relance, mise en demeure, caution, attestation. */
export async function actionGenererDocumentBail(formData: FormData) {
  const ctx = await garde();
  const bailId = t(formData.get("bail_id"));
  const type = t(formData.get("type"));
  const bail = bailParId(bailId);
  if (!bail || bail.proprietaire_id !== ctx.proprietaireActif) redirect("/app");

  const base = db();
  const p = parametresDe(ctx.proprietaireActif);
  const loc = base.prepare(`SELECT * FROM locataires WHERE id = ?`).get(bail.locataire_id) as any;
  const unite = base.prepare(`SELECT * FROM unites WHERE id = ?`).get(bail.unite_id) as any;
  const s = situationBail(bailId);
  const etats = echeancesDuBail(bailId);

  const commun = {
    bailleur: enTeteBailleur(ctx.proprietaireActif),
    locataire: {
      nom: loc.nom,
      telephone: loc.telephone,
      piece: loc.numero_piece ? `${loc.type_piece} n° ${loc.numero_piece}` : null,
    },
    logement: {
      designation: nomLogement(bail),
      adresse: adresseLogement(bail),
      pieces: unite?.nb_pieces ?? null,
      superficie: unite?.superficie ?? null,
      meuble: !!unite?.meuble,
    },
    bail: {
      date_debut: bail.date_debut,
      date_fin_prevue: bail.date_fin_prevue,
      duree_mois: bail.duree_mois,
      loyer: bail.loyer_mensuel,
      charges: bail.charges_mensuelles,
      jour_echeance: bail.jour_echeance,
      periodicite: bail.periodicite,
      caution: bail.montant_caution,
      mois_avance: 0,
      usage: bail.usage,
    },
    date: aujourdhui(),
  };

  let donnees: any = commun;
  let vraiType = type;

  if (type === "bail") {
    vraiType = bail.usage === "commercial" ? "bail_commercial" : "bail_habitation";
    const modele = base
      .prepare(
        `SELECT * FROM modeles_document WHERE proprietaire_id = ? AND type = ? AND actif = 1
         ORDER BY version DESC LIMIT 1`,
      )
      .get(ctx.proprietaireActif, vraiType) as any;
    donnees = {
      ...commun,
      articles: modele ? JSON.parse(modele.contenu_json) : MODELES_DEFAUT[vraiType]?.articles,
    };
  } else if (type === "avis_echeance") {
    const prochaine = s.prochaine_echeance;
    if (!prochaine) redirect(`/app/baux/${bailId}?e=` + encodeURIComponent("Aucune échéance à venir."));
    donnees = {
      ...commun,
      lignes: [
        {
          libelle: prochaine.libelle,
          loyer: prochaine.montant_loyer,
          charges: prochaine.montant_charges,
          total: prochaine.reste,
        },
      ],
      montant: prochaine.reste,
      date_echeance: prochaine.date_echeance,
    };
  } else if (type === "relance" || type === "mise_en_demeure") {
    const dues = etats.filter((e) => e.reste > 0 && e.date_echeance <= aujourdhui());
    if (dues.length === 0) {
      redirect(`/app/baux/${bailId}?e=` + encodeURIComponent("Ce locataire n'a rien en retard."));
    }
    donnees = {
      ...commun,
      lignes: dues.map((e) => ({
        libelle: e.libelle,
        loyer: e.montant_loyer,
        charges: e.montant_charges,
        total: e.reste,
      })),
      montant: s.du,
      jours_retard: s.jours_retard,
      date_echeance: dues[0].date_echeance,
    };
  } else if (type === "recu_caution") {
    if (bail.caution_versee <= 0) {
      redirect(`/app/baux/${bailId}?e=` + encodeURIComponent("Aucune caution n'a été enregistrée."));
    }
    donnees = {
      ...commun,
      montant: bail.caution_versee,
      mode_paiement: MODES_PAIEMENT[bail.mode_paiement ?? "especes"] ?? "Espèces",
      date_paiement: bail.date_debut,
    };
  } else if (type === "attestation") {
    donnees = {
      ...commun,
      articles: [
        {
          titre: "Attestation",
          texte:
            `Je soussigné(e) ${enTeteBailleur(ctx.proprietaireActif).nom}, bailleur, atteste que ` +
            `${loc.nom}${loc.numero_piece ? `, titulaire de la pièce n° ${loc.numero_piece}` : ""}, ` +
            `occupe en qualité de locataire le logement désigné ci-après : ${nomLogement(bail)}, ` +
            `situé ${adresseLogement(bail)}, depuis le ${bail.date_debut}.`,
        },
        ...(MODELES_DEFAUT.attestation?.articles.slice(1) ?? []),
      ],
    };
  } else if (type === "conge" || type === "preavis") {
    const duree = type === "preavis" ? p.preavis_locataire_mois : p.preavis_bailleur_mois;
    const pv = base
      .prepare(`SELECT * FROM preavis WHERE bail_id = ? ORDER BY cree_le DESC LIMIT 1`)
      .get(bailId) as any;
    donnees = {
      ...commun,
      duree_preavis_mois: pv?.duree_preavis_mois ?? duree,
      date_effet: pv?.date_effet ?? null,
      motif: pv?.motif ?? null,
    };
  } else if (type === "avenant") {
    donnees = {
      ...commun,
      articles: MODELES_DEFAUT.avenant.articles.map((a) => ({
        titre: a.titre,
        texte:
          a.texte === "{{rappel}}"
            ? `Le bail conclu le ${bail.date_debut} entre ${enTeteBailleur(ctx.proprietaireActif).nom} ` +
              `et ${loc.nom} portant sur ${nomLogement(bail)}, situé ${adresseLogement(bail)}.`
            : a.texte === "{{objet}}"
              ? t(formData.get("objet")) || "[ Objet de la modification à préciser. ]"
              : a.texte === "{{effet}}"
                ? `Les modifications ci-dessus prennent effet le ${t(formData.get("date_effet")) || aujourdhui()}.`
                : a.texte,
      })),
    };
  }

  const docId = await emettreDocument(ctx, vraiType, donnees, {
    bailId,
    locataireId: bail.locataire_id,
    bienId: bail.bien_id,
  });
  revalidatePath("/app/documents");
  redirect(`/app/documents/${docId}`);
}

/** On n'efface jamais un document remis : on l'annule, et la trace reste. */
export async function actionAnnulerDocument(formData: FormData) {
  const ctx = await exigerContexte();
  const id = t(formData.get("id"));
  const base = db();
  const doc = base.prepare(`SELECT * FROM documents_emis WHERE id = ?`).get(id) as any;
  if (!doc || doc.proprietaire_id !== ctx.proprietaireActif) redirect("/app/documents");

  base
    .prepare(`UPDATE documents_emis SET statut = 'annule', motif_annulation = ? WHERE id = ?`)
    .run(t(formData.get("motif")) || "Annulé par le bailleur", id);
  tracer(ctx, "modification", "documents_emis", id, `${doc.numero} annulé`);
  revalidatePath("/app/documents");
  redirect(`/app/documents/${id}`);
}

/** Enregistre la version personnalisée d'un modèle de document. */
export async function actionEnregistrerModele(formData: FormData) {
  const ctx = await exigerContexte();
  if (!aLeDroit(ctx, "modifier_modeles")) {
    redirect("/app/documents/modeles?e=" + encodeURIComponent("Droit non délégué."));
  }
  const type = t(formData.get("type"));
  const base = db();

  const articles: { titre: string; texte: string }[] = [];
  for (let i = 0; i < 40; i++) {
    const titre = t(formData.get(`titre_${i}`));
    const texte = t(formData.get(`texte_${i}`));
    if (!titre && !texte) continue;
    articles.push({ titre: titre || `Article ${i + 1}`, texte });
  }

  const derniere = base
    .prepare(
      `SELECT MAX(version) AS v FROM modeles_document WHERE proprietaire_id = ? AND type = ?`,
    )
    .get(ctx.proprietaireActif, type) as any;

  base
    .prepare(`UPDATE modeles_document SET actif = 0 WHERE proprietaire_id = ? AND type = ?`)
    .run(ctx.proprietaireActif, type);
  base
    .prepare(
      `INSERT INTO modeles_document (id, proprietaire_id, type, langue, titre, contenu_json,
        version, actif, cree_le) VALUES (?,?,?,'fr',?,?,?,1,?)`,
    )
    .run(
      nouvelId(),
      ctx.proprietaireActif,
      type,
      MODELES_DEFAUT[type]?.titre ?? type,
      JSON.stringify(articles),
      (Number(derniere?.v) || 0) + 1,
      maintenant(),
    );

  tracer(ctx, "modification", "modeles_document", type, `Modèle « ${type} » modifié`);
  revalidatePath("/app/documents/modeles");
  redirect(`/app/documents/modeles?type=${type}&ok=1`);
}
