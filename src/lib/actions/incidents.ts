"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, nouvelId, maintenant } from "@/lib/db";
import { exigerContexte } from "@/lib/session";
import { profilConnecte } from "@/lib/auth";
import { tracer } from "@/lib/audit";
import { aujourdhui } from "@/lib/format";

const t = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const n = (v: FormDataEntryValue | null) => {
  const x = parseInt(String(v ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(x) ? x : 0;
};

export async function actionCreerIncident(formData: FormData) {
  const ctx = await exigerContexte();
  const bailId = t(formData.get("bail_id"));
  const base = db();
  const bail = base.prepare(`SELECT * FROM baux WHERE id = ?`).get(bailId) as any;
  if (!bail || bail.proprietaire_id !== ctx.proprietaireActif) redirect("/app/incidents");

  const id = nouvelId();
  base
    .prepare(
      `INSERT INTO incidents (id, proprietaire_id, bail_id, unite_id, titre, description,
        priorite, statut, signale_par, cree_le) VALUES (?,?,?,?,?,?,?,'ouvert',?,?)`,
    )
    .run(
      id,
      ctx.proprietaireActif,
      bailId,
      bail.unite_id,
      t(formData.get("titre")),
      t(formData.get("description")) || null,
      t(formData.get("priorite")) || "normale",
      ctx.profil.id,
      maintenant(),
    );

  for (const c of t(formData.get("photos")).split(",").map((x) => x.trim()).filter(Boolean)) {
    base
      .prepare(`INSERT INTO incident_photos (id, incident_id, fichier, cree_le) VALUES (?,?,?,?)`)
      .run(nouvelId(), id, c, maintenant());
  }

  tracer(ctx, "creation", "incidents", id, `Incident signalé : ${t(formData.get("titre"))}`);
  revalidatePath("/app/incidents");
  redirect("/app/incidents");
}

export async function actionMajIncident(formData: FormData) {
  const ctx = await exigerContexte();
  const id = t(formData.get("id"));
  const base = db();
  const inc = base.prepare(`SELECT * FROM incidents WHERE id = ?`).get(id) as any;
  if (!inc || inc.proprietaire_id !== ctx.proprietaireActif) redirect("/app/incidents");

  const statut = t(formData.get("statut")) || inc.statut;
  base
    .prepare(
      `UPDATE incidents SET statut = ?, prestataire = ?, cout = ?, resolu_le = ? WHERE id = ?`,
    )
    .run(
      statut,
      t(formData.get("prestataire")) || null,
      n(formData.get("cout")) || null,
      statut === "resolu" ? aujourdhui() : null,
      id,
    );
  tracer(ctx, "modification", "incidents", id, `Incident « ${inc.titre} » : ${statut}`);
  revalidatePath("/app/incidents");
  redirect("/app/incidents");
}

/** Signalement déposé par le locataire depuis son espace. */
export async function actionSignalerParLocataire(formData: FormData) {
  const profil = await profilConnecte();
  if (!profil) redirect("/connexion");
  const base = db();
  const bailId = t(formData.get("bail_id"));
  const bail = base
    .prepare(
      `SELECT b.* FROM baux b JOIN locataires l ON l.id = b.locataire_id
       WHERE b.id = ? AND l.profil_id = ?`,
    )
    .get(bailId, profil.id) as any;
  if (!bail) redirect("/locataire");

  const id = nouvelId();
  base
    .prepare(
      `INSERT INTO incidents (id, proprietaire_id, bail_id, unite_id, titre, description,
        priorite, statut, signale_par, cree_le) VALUES (?,?,?,?,?,?,?,'ouvert',?,?)`,
    )
    .run(
      id,
      bail.proprietaire_id,
      bailId,
      bail.unite_id,
      t(formData.get("titre")),
      t(formData.get("description")) || null,
      t(formData.get("priorite")) || "normale",
      profil.id,
      maintenant(),
    );
  for (const c of t(formData.get("photos")).split(",").map((x) => x.trim()).filter(Boolean)) {
    base
      .prepare(`INSERT INTO incident_photos (id, incident_id, fichier, cree_le) VALUES (?,?,?,?)`)
      .run(nouvelId(), id, c, maintenant());
  }
  base
    .prepare(
      `INSERT INTO journal_audit (id, proprietaire_id, table_nom, enregistrement_id, action,
        resume, utilisateur_id, utilisateur_nom, cree_le) VALUES (?,?,?,?,'creation',?,?,?,?)`,
    )
    .run(
      nouvelId(),
      bail.proprietaire_id,
      "incidents",
      id,
      `Incident signalé par le locataire : ${t(formData.get("titre"))}`,
      profil.id,
      profil.nom,
      maintenant(),
    );

  redirect("/locataire?incident=1");
}

/** Dépôt d'un préavis par le locataire lui-même. */
export async function actionPreavisLocataire(formData: FormData) {
  const profil = await profilConnecte();
  if (!profil) redirect("/connexion");
  const base = db();
  const bailId = t(formData.get("bail_id"));
  const bail = base
    .prepare(
      `SELECT b.*, p.preavis_locataire_mois FROM baux b
       JOIN locataires l ON l.id = b.locataire_id
       LEFT JOIN parametres p ON p.proprietaire_id = b.proprietaire_id
       WHERE b.id = ? AND l.profil_id = ?`,
    )
    .get(bailId, profil.id) as any;
  if (!bail) redirect("/locataire");

  const id = nouvelId();
  const duree = bail.preavis_locataire_mois ?? 1;
  base
    .prepare(
      `INSERT INTO preavis (id, bail_id, origine, date_depot, date_effet, duree_preavis_mois,
        motif, statut, cree_le) VALUES (?,?,'locataire',?,?,?,?,'depose',?)`,
    )
    .run(
      id,
      bailId,
      aujourdhui(),
      t(formData.get("date_effet")) || aujourdhui(),
      duree,
      t(formData.get("motif")) || null,
      maintenant(),
    );
  base.prepare(`UPDATE baux SET statut = 'preavis' WHERE id = ?`).run(bailId);
  base
    .prepare(
      `INSERT INTO journal_audit (id, proprietaire_id, table_nom, enregistrement_id, action,
        resume, utilisateur_id, utilisateur_nom, cree_le) VALUES (?,?,?,?,'creation',?,?,?,?)`,
    )
    .run(
      nouvelId(),
      bail.proprietaire_id,
      "preavis",
      id,
      `Préavis déposé par le locataire`,
      profil.id,
      profil.nom,
      maintenant(),
    );

  redirect("/locataire?preavis=1");
}
