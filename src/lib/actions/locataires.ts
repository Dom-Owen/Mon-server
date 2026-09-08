"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, nouvelId, maintenant } from "@/lib/db";
import { exigerContexte } from "@/lib/session";
import { tracer } from "@/lib/audit";
import { normaliserTelephone } from "@/lib/format";
import { aLeDroit, creerInvitation } from "@/lib/auth";

const t = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export async function actionCreerLocataire(formData: FormData) {
  const ctx = await exigerContexte();
  const nom = t(formData.get("nom"));
  const tel = normaliserTelephone(t(formData.get("telephone")), t(formData.get("indicatif")) || "237");

  if (!nom) redirect("/app/locataires/nouveau?e=" + encodeURIComponent("Le nom est obligatoire."));
  if (!tel) {
    redirect(
      "/app/locataires/nouveau?e=" +
        encodeURIComponent("Ce numéro ne semble pas valide. Un mobile a 9 chiffres et commence par 6."),
    );
  }

  const id = nouvelId();
  const whatsapp = normaliserTelephone(t(formData.get("whatsapp"))) ?? tel;

  db()
    .prepare(
      `INSERT INTO locataires (id, proprietaire_id, type, nom, raison_sociale, rccm, telephone,
        whatsapp, email, profession, employeur, type_piece, numero_piece, scan_piece,
        urgence_nom, urgence_telephone, garant_nom, garant_telephone, garant_piece, notes, cree_le)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      id,
      ctx.proprietaireActif,
      t(formData.get("type")) || "particulier",
      nom,
      t(formData.get("raison_sociale")) || null,
      t(formData.get("rccm")) || null,
      tel,
      whatsapp,
      t(formData.get("email")) || null,
      t(formData.get("profession")) || null,
      t(formData.get("employeur")) || null,
      t(formData.get("type_piece")) || null,
      t(formData.get("numero_piece")) || null,
      t(formData.get("scan_piece")) || null,
      t(formData.get("urgence_nom")) || null,
      normaliserTelephone(t(formData.get("urgence_telephone"))) || null,
      t(formData.get("garant_nom")) || null,
      normaliserTelephone(t(formData.get("garant_telephone"))) || null,
      t(formData.get("garant_piece")) || null,
      t(formData.get("notes")) || null,
      maintenant(),
    );

  tracer(ctx, "creation", "locataires", id, `Locataire « ${nom} » ajouté`);
  revalidatePath("/app/locataires");

  const suite = t(formData.get("puis"));
  redirect(suite === "bail" ? `/app/baux/nouveau?locataire=${id}` : `/app/locataires/${id}`);
}

export async function actionModifierLocataire(formData: FormData) {
  const ctx = await exigerContexte();
  const id = t(formData.get("id"));
  const base = db();
  const avant = base.prepare(`SELECT * FROM locataires WHERE id = ?`).get(id) as any;
  if (!avant || avant.proprietaire_id !== ctx.proprietaireActif) redirect("/app/locataires");

  const tel = normaliserTelephone(t(formData.get("telephone")), t(formData.get("indicatif")) || "237");
  base
    .prepare(
      `UPDATE locataires SET type=?, nom=?, raison_sociale=?, rccm=?, telephone=?, whatsapp=?,
        email=?, profession=?, employeur=?, type_piece=?, numero_piece=?, scan_piece=?,
        urgence_nom=?, urgence_telephone=?, garant_nom=?, garant_telephone=?, garant_piece=?, notes=?
       WHERE id = ?`,
    )
    .run(
      t(formData.get("type")) || "particulier",
      t(formData.get("nom")),
      t(formData.get("raison_sociale")) || null,
      t(formData.get("rccm")) || null,
      tel ?? avant.telephone,
      normaliserTelephone(t(formData.get("whatsapp"))) ?? tel ?? avant.telephone,
      t(formData.get("email")) || null,
      t(formData.get("profession")) || null,
      t(formData.get("employeur")) || null,
      t(formData.get("type_piece")) || null,
      t(formData.get("numero_piece")) || null,
      t(formData.get("scan_piece")) || null,
      t(formData.get("urgence_nom")) || null,
      normaliserTelephone(t(formData.get("urgence_telephone"))) || null,
      t(formData.get("garant_nom")) || null,
      normaliserTelephone(t(formData.get("garant_telephone"))) || null,
      t(formData.get("garant_piece")) || null,
      t(formData.get("notes")) || null,
      id,
    );
  tracer(ctx, "modification", "locataires", id, `Fiche de ${t(formData.get("nom"))} modifiée`, { avant });
  revalidatePath(`/app/locataires/${id}`);
  redirect(`/app/locataires/${id}`);
}

/**
 * Le bailleur ne crée jamais le mot de passe du locataire.
 * Il fabrique un lien à usage unique ; le locataire choisit lui-même son mot de passe.
 */
export async function actionInviterLocataire(formData: FormData) {
  const ctx = await exigerContexte();
  if (!aLeDroit(ctx, "inviter_locataire")) {
    redirect("/app/locataires?e=" + encodeURIComponent("Le bailleur ne vous a pas délégué ce droit."));
  }
  const id = t(formData.get("id"));
  const loc = db().prepare(`SELECT * FROM locataires WHERE id = ?`).get(id) as any;
  if (!loc || loc.proprietaire_id !== ctx.proprietaireActif) redirect("/app/locataires");

  const jeton = creerInvitation({
    proprietaireId: ctx.proprietaireActif,
    telephone: loc.whatsapp || loc.telephone,
    role: "locataire",
    cibleId: id,
  });
  tracer(ctx, "creation", "invitations", id, `Lien d'accès créé pour ${loc.nom}`);
  redirect(`/app/locataires/${id}?invite=${jeton}`);
}

export async function actionArchiverLocataire(formData: FormData) {
  const ctx = await exigerContexte();
  const id = t(formData.get("id"));
  const base = db();
  const loc = base.prepare(`SELECT * FROM locataires WHERE id = ?`).get(id) as any;
  if (!loc || loc.proprietaire_id !== ctx.proprietaireActif) redirect("/app/locataires");

  const actifs = base
    .prepare(`SELECT COUNT(*) AS n FROM baux WHERE locataire_id = ? AND statut IN ('actif','preavis')`)
    .get(id) as any;
  if (actifs.n > 0) {
    redirect(
      `/app/locataires/${id}?e=` +
        encodeURIComponent("Ce locataire a encore un bail en cours. Terminez le bail d'abord."),
    );
  }
  base.prepare(`UPDATE locataires SET archive_le = ? WHERE id = ?`).run(maintenant(), id);
  tracer(ctx, "suppression", "locataires", id, `Locataire « ${loc.nom} » archivé`);
  redirect("/app/locataires");
}
