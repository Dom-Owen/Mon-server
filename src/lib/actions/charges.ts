"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, nouvelId, maintenant } from "@/lib/db";
import { exigerContexte } from "@/lib/session";
import { tracer } from "@/lib/audit";
import { aujourdhui, fcfa } from "@/lib/format";

const t = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const n = (v: FormDataEntryValue | null) => {
  const x = parseInt(String(v ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(x) ? x : 0;
};

export async function actionCreerCompteur(formData: FormData) {
  const ctx = await exigerContexte();
  const bienId = t(formData.get("bien_id"));
  const base = db();
  const bien = base.prepare(`SELECT * FROM biens WHERE id = ?`).get(bienId) as any;
  if (!bien || bien.proprietaire_id !== ctx.proprietaireActif) redirect("/app/charges");

  const id = nouvelId();
  base
    .prepare(
      `INSERT INTO compteurs (id, proprietaire_id, bien_id, unite_id, type, numero, portee,
        unite_mesure, tarif_unitaire, actif, cree_le) VALUES (?,?,?,?,?,?,?,?,?,1,?)`,
    )
    .run(
      id,
      ctx.proprietaireActif,
      bienId,
      t(formData.get("unite_id")) || null,
      t(formData.get("type")) || "electricite",
      t(formData.get("numero")) || null,
      t(formData.get("portee")) || "individuel",
      t(formData.get("type")) === "eau" ? "m³" : "kWh",
      n(formData.get("tarif_unitaire")),
      maintenant(),
    );
  tracer(ctx, "creation", "compteurs", id, `Compteur ${t(formData.get("numero"))} ajouté`);
  revalidatePath("/app/charges");
  redirect("/app/charges");
}

/** Relevé d'un compteur individuel : consommation et montant calculés automatiquement. */
export async function actionSaisirReleve(formData: FormData) {
  const ctx = await exigerContexte();
  const compteurId = t(formData.get("compteur_id"));
  const base = db();
  const c = base.prepare(`SELECT * FROM compteurs WHERE id = ?`).get(compteurId) as any;
  if (!c || c.proprietaire_id !== ctx.proprietaireActif) redirect("/app/charges");

  const index = n(formData.get("index_releve"));
  const precedent = base
    .prepare(`SELECT index_releve FROM releves WHERE compteur_id = ? ORDER BY date_releve DESC LIMIT 1`)
    .get(compteurId) as any;
  const indexPrecedent = precedent ? Number(precedent.index_releve) : n(formData.get("index_precedent"));

  if (index < indexPrecedent) {
    redirect(
      "/app/charges?e=" +
        encodeURIComponent(
          `L'index saisi (${index}) est inférieur au relevé précédent (${indexPrecedent}). Vérifiez le chiffre.`,
        ),
    );
  }

  const consommation = index - indexPrecedent;
  const montant = consommation * c.tarif_unitaire;

  const bail = base
    .prepare(
      `SELECT id FROM baux WHERE unite_id = ? AND statut IN ('actif','preavis') LIMIT 1`,
    )
    .get(c.unite_id) as any;

  const id = nouvelId();
  base.transaction(() => {
    base
      .prepare(
        `INSERT INTO releves (id, compteur_id, bail_id, date_releve, index_releve, index_precedent,
          consommation, tarif_applique, montant, photo, releve_par, cree_le)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id,
        compteurId,
        bail?.id ?? null,
        t(formData.get("date_releve")) || aujourdhui(),
        index,
        indexPrecedent,
        consommation,
        c.tarif_unitaire,
        montant,
        t(formData.get("photo")) || null,
        ctx.profil.id,
        maintenant(),
      );

    if (bail?.id) {
      base
        .prepare(
          `INSERT INTO charges_locataire (id, bail_id, periode, montant, origine, detail, cree_le)
           VALUES (?,?,?,?,'releve',?,?)`,
        )
        .run(
          nouvelId(),
          bail.id,
          (t(formData.get("date_releve")) || aujourdhui()).slice(0, 7),
          montant,
          `${consommation} ${c.unite_mesure} à ${c.tarif_unitaire} FCFA`,
          maintenant(),
        );
    }
    tracer(ctx, "creation", "releves", id, `Relevé : ${consommation} ${c.unite_mesure}, ${fcfa(montant)}`);
  })();

  revalidatePath("/app/charges");
  redirect("/app/charges?ok=1");
}

/** Facture d'un compteur commun, répartie entre les logements occupés. */
export async function actionRepartirFacture(formData: FormData) {
  const ctx = await exigerContexte();
  const compteurId = t(formData.get("compteur_id"));
  const base = db();
  const c = base.prepare(`SELECT * FROM compteurs WHERE id = ?`).get(compteurId) as any;
  if (!c || c.proprietaire_id !== ctx.proprietaireActif) redirect("/app/charges");

  const montant = n(formData.get("montant"));
  const cle = t(formData.get("cle_repartition")) || "parts_egales";
  const periode = t(formData.get("periode")) || aujourdhui().slice(0, 7);

  const baux = base
    .prepare(
      `SELECT b.id, b.locataire_id FROM baux b JOIN unites u ON u.id = b.unite_id
       WHERE u.bien_id = ? AND b.statut IN ('actif','preavis')`,
    )
    .all(c.bien_id) as any[];

  if (baux.length === 0) {
    redirect("/app/charges?e=" + encodeURIComponent("Aucun logement occupé sur ce bien : rien à répartir."));
  }

  const parts: number[] = [];
  if (cle === "pourcentages") {
    let total = 0;
    for (const b of baux) {
      const pc = n(formData.get(`pourcentage_${b.id}`));
      parts.push(pc);
      total += pc;
    }
    if (total !== 100) {
      redirect(
        "/app/charges?e=" +
          encodeURIComponent(`Les pourcentages font ${total} % au lieu de 100 %. Corrigez la répartition.`),
      );
    }
  } else if (cle === "nb_occupants") {
    let total = 0;
    for (const b of baux) {
      const occ = Math.max(1, n(formData.get(`occupants_${b.id}`)) || 1);
      parts.push(occ);
      total += occ;
    }
    for (let i = 0; i < parts.length; i++) parts[i] = (parts[i] / total) * 100;
  } else {
    for (let i = 0; i < baux.length; i++) parts.push(100 / baux.length);
  }

  const factureId = nouvelId();
  base.transaction(() => {
    base
      .prepare(
        `INSERT INTO factures_communes (id, compteur_id, periode_debut, periode_fin, montant,
          justificatif, cle_repartition, details_json, cree_le) VALUES (?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        factureId,
        compteurId,
        periode + "-01",
        periode + "-28",
        montant,
        t(formData.get("justificatif")) || null,
        cle,
        JSON.stringify(baux.map((b, i) => ({ bail: b.id, part: parts[i] }))),
        maintenant(),
      );

    // On répartit à l'entier près et on donne le reliquat au premier, pour que la
    // somme des quotes-parts tombe exactement sur le montant de la facture.
    let cumul = 0;
    baux.forEach((b, i) => {
      const part =
        i === baux.length - 1 ? montant - cumul : Math.round((montant * parts[i]) / 100);
      cumul += part;
      base
        .prepare(
          `INSERT INTO charges_locataire (id, bail_id, periode, montant, origine, detail, cree_le)
           VALUES (?,?,?,?,'repartition',?,?)`,
        )
        .run(
          nouvelId(),
          b.id,
          periode,
          part,
          `Quote-part de ${Math.round(parts[i] * 10) / 10} % sur une facture de ${fcfa(montant)}`,
          maintenant(),
        );
    });
    tracer(ctx, "creation", "factures_communes", factureId, `Facture de ${fcfa(montant)} répartie`);
  })();

  revalidatePath("/app/charges");
  redirect("/app/charges?ok=1");
}
