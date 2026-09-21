"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, maintenant, nouvelId } from "@/lib/db";
import { exigerContexte } from "@/lib/session";
import { tracer } from "@/lib/audit";
import { choisirProprietaire } from "@/lib/session";
import { normaliserTelephone } from "@/lib/format";
import { creerInvitation, TOUS_LES_DROITS } from "@/lib/auth";

const t = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const n = (v: FormDataEntryValue | null) => {
  const x = parseInt(String(v ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(x) ? x : 0;
};

export async function actionEnregistrerParametres(formData: FormData) {
  const ctx = await exigerContexte();
  db()
    .prepare(
      `UPDATE parametres SET raison_sociale=?, ville=?, quartier=?, telephone=?, email=?,
        numero_contribuable=?, preavis_locataire_mois=?, preavis_bailleur_mois=?,
        mois_caution_defaut=?, mois_avance_defaut=?, delai_restitution_caution_jours=?,
        jours_rappel_avant_echeance=?, jours_avant_relance_retard=?,
        mention_legale_documents=?, langue=?, logo=?, signature_scannee=?, maj_le=?
       WHERE proprietaire_id = ?`,
    )
    .run(
      t(formData.get("raison_sociale")) || null,
      t(formData.get("ville")) || null,
      t(formData.get("quartier")) || null,
      normaliserTelephone(t(formData.get("telephone"))) || null,
      t(formData.get("email")) || null,
      t(formData.get("numero_contribuable")) || null,
      n(formData.get("preavis_locataire_mois")),
      n(formData.get("preavis_bailleur_mois")),
      n(formData.get("mois_caution_defaut")),
      n(formData.get("mois_avance_defaut")),
      n(formData.get("delai_restitution_caution_jours")),
      n(formData.get("jours_rappel_avant_echeance")),
      n(formData.get("jours_avant_relance_retard")),
      t(formData.get("mention_legale_documents")) || null,
      t(formData.get("langue")) || "fr",
      t(formData.get("logo")) || null,
      t(formData.get("signature_scannee")) || null,
      maintenant(),
      ctx.proprietaireActif,
    );
  tracer(ctx, "modification", "parametres", ctx.proprietaireActif, "Réglages modifiés");
  revalidatePath("/app/parametres");
  redirect("/app/parametres?ok=1");
}

export async function actionCreerMandat(formData: FormData) {
  const ctx = await exigerContexte();
  if (ctx.proprietaireActif !== ctx.profil.id) {
    redirect("/app/mandataires?e=" + encodeURIComponent("Un mandataire ne peut pas en désigner un autre."));
  }
  const tel = normaliserTelephone(t(formData.get("telephone")), t(formData.get("indicatif")) || "237");
  if (!tel) redirect("/app/mandataires?e=" + encodeURIComponent("Ce numéro ne semble pas valide."));

  const droits = TOUS_LES_DROITS.map((d) => d.code).filter((c) => formData.get(`droit_${c}`) === "1");
  if (droits.length === 0) {
    redirect("/app/mandataires?e=" + encodeURIComponent("Cochez au moins un droit à déléguer."));
  }

  const base = db();
  const biens = formData.getAll("biens").map(String).filter(Boolean);
  const portee = biens.length > 0 ? "selection" : "tous";

  // Le mandataire n'a pas encore de compte : on crée le mandat en attente, puis
  // l'invitation qui lui permettra de choisir son propre mot de passe.
  const existant = base.prepare(`SELECT id FROM profils WHERE telephone = ?`).get(tel) as any;
  const id = nouvelId();
  base
    .prepare(
      `INSERT INTO mandats (id, bailleur_id, mandataire_id, portee, biens_json, droits_json,
        date_debut, cree_le) VALUES (?,?,?,?,?,?,date('now'),?)`,
    )
    .run(
      id,
      ctx.profil.id,
      existant?.id ?? id, // remplacé à l'activation
      portee,
      JSON.stringify(biens),
      JSON.stringify(droits),
      maintenant(),
    );

  const jeton = creerInvitation({
    proprietaireId: ctx.profil.id,
    telephone: tel,
    role: "mandataire",
    cibleId: id,
  });
  tracer(ctx, "creation", "mandats", id, `Mandat créé pour ${tel}`);
  redirect(`/app/mandataires?invite=${jeton}&tel=${encodeURIComponent(tel)}`);
}

export async function actionRevoquerMandat(formData: FormData) {
  const ctx = await exigerContexte();
  const id = t(formData.get("id"));
  const base = db();
  const m = base.prepare(`SELECT * FROM mandats WHERE id = ?`).get(id) as any;
  if (!m || m.bailleur_id !== ctx.profil.id) redirect("/app/mandataires");
  base.prepare(`UPDATE mandats SET revoque_le = ? WHERE id = ?`).run(maintenant(), id);
  tracer(ctx, "modification", "mandats", id, "Mandat révoqué");
  revalidatePath("/app/mandataires");
  redirect("/app/mandataires");
}

export async function actionChangerDeCompte(formData: FormData) {
  await exigerContexte();
  await choisirProprietaire(t(formData.get("proprietaire_id")));
  redirect("/app");
}
