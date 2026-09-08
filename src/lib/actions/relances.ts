"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, nouvelId, maintenant } from "@/lib/db";
import { exigerContexte } from "@/lib/session";
import { tracer } from "@/lib/audit";
import { aujourdhui } from "@/lib/format";

const t = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export async function actionMarquerRelanceEnvoyee(formData: FormData) {
  const ctx = await exigerContexte();
  const base = db();
  const id = nouvelId();
  base
    .prepare(
      `INSERT INTO relances (id, proprietaire_id, bail_id, echeance_id, nature, canal, message,
        date_preparation, date_envoi, statut, envoye_par, cree_le)
       VALUES (?,?,?,?,?,?,?,?,?,'envoyee',?,?)`,
    )
    .run(
      id,
      ctx.proprietaireActif,
      t(formData.get("bail_id")),
      t(formData.get("echeance_id")) || null,
      t(formData.get("nature")),
      t(formData.get("canal")) || "whatsapp",
      t(formData.get("message")),
      aujourdhui(),
      aujourdhui(),
      ctx.profil.id,
      maintenant(),
    );
  tracer(ctx, "creation", "relances", id, `Relance ${t(formData.get("nature"))} envoyée`);
  revalidatePath("/app/relances");
  redirect("/app/relances?ok=1");
}

export async function actionEnregistrerModeleMessage(formData: FormData) {
  const ctx = await exigerContexte();
  const base = db();
  const code = t(formData.get("code"));
  const langue = t(formData.get("langue")) || "fr";
  const existant = base
    .prepare(`SELECT id FROM modeles_message WHERE proprietaire_id = ? AND code = ? AND langue = ?`)
    .get(ctx.proprietaireActif, code, langue) as any;

  if (existant) {
    base
      .prepare(`UPDATE modeles_message SET objet = ?, corps = ? WHERE id = ?`)
      .run(t(formData.get("objet")), t(formData.get("corps")), existant.id);
  } else {
    base
      .prepare(
        `INSERT INTO modeles_message (id, proprietaire_id, code, langue, objet, corps, cree_le)
         VALUES (?,?,?,?,?,?,?)`,
      )
      .run(nouvelId(), ctx.proprietaireActif, code, langue, t(formData.get("objet")), t(formData.get("corps")), maintenant());
  }
  tracer(ctx, "modification", "modeles_message", code, `Modèle de message « ${code} » (${langue}) modifié`);
  revalidatePath("/app/relances");
  redirect("/app/relances?ok=1#modeles");
}
