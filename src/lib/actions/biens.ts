"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, nouvelId, maintenant } from "@/lib/db";
import { exigerContexte } from "@/lib/session";
import { tracer } from "@/lib/audit";

function nombre(v: FormDataEntryValue | null): number {
  const n = parseInt(String(v ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}
function texte(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

export async function actionCreerBien(formData: FormData) {
  const ctx = await exigerContexte();
  const base = db();

  const nom = texte(formData.get("nom"));
  const ville = texte(formData.get("ville")) || texte(formData.get("ville_libre"));
  if (!nom || !ville) {
    redirect("/app/biens/nouveau?e=" + encodeURIComponent("Le nom et la ville sont obligatoires."));
  }

  const bienId = nouvelId();
  const type = texte(formData.get("type")) || "maison";
  const modeCharges = texte(formData.get("mode_charges")) || "incluses";
  const plusieursUnites = formData.get("plusieurs_unites") === "1";
  const nbUnites = plusieursUnites ? Math.max(1, Math.min(60, nombre(formData.get("nb_unites")))) : 1;
  const loyer = nombre(formData.get("loyer_reference"));
  const caution = nombre(formData.get("caution_reference"));

  base.transaction(() => {
    base
      .prepare(
        `INSERT INTO biens (id, proprietaire_id, nom, type, usage, ville, quartier, lieu_dit,
           point_repere, precisions_acces, date_acquisition, mode_charges, charges_forfait, cree_le)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        bienId,
        ctx.proprietaireActif,
        nom,
        type,
        texte(formData.get("usage")) || "habitation",
        ville,
        texte(formData.get("quartier")) || texte(formData.get("quartier_libre")) || null,
        texte(formData.get("lieu_dit")) || null,
        texte(formData.get("point_repere")) || null,
        texte(formData.get("precisions_acces")) || null,
        texte(formData.get("date_acquisition")) || null,
        modeCharges,
        nombre(formData.get("charges_forfait")),
        maintenant(),
      );

    // Un bien à logement unique crée son unité automatiquement : le bailleur
    // qui ne loue qu'une maison ne doit jamais avoir à comprendre cette notion.
    for (let i = 0; i < nbUnites; i++) {
      base
        .prepare(
          `INSERT INTO unites (id, bien_id, libelle, nb_pieces, superficie, meuble,
             loyer_reference, caution_reference, statut, unique_du_bien, cree_le)
           VALUES (?,?,?,?,?,?,?,?,'libre',?,?)`,
        )
        .run(
          nouvelId(),
          bienId,
          plusieursUnites ? `Logement ${i + 1}` : nom,
          nombre(formData.get("nb_pieces")) || null,
          nombre(formData.get("superficie")) || null,
          formData.get("meuble") === "1" ? 1 : 0,
          loyer,
          caution,
          plusieursUnites ? 0 : 1,
          maintenant(),
        );
    }

    tracer(ctx, "creation", "biens", bienId, `Bien « ${nom} » ajouté à ${ville}`);
  })();

  revalidatePath("/app/biens");
  redirect(`/app/biens/${bienId}`);
}

export async function actionModifierBien(formData: FormData) {
  const ctx = await exigerContexte();
  const id = texte(formData.get("id"));
  const base = db();
  const avant = base.prepare(`SELECT * FROM biens WHERE id = ?`).get(id) as any;
  if (!avant || avant.proprietaire_id !== ctx.proprietaireActif) redirect("/app/biens");

  base
    .prepare(
      `UPDATE biens SET nom = ?, type = ?, usage = ?, ville = ?, quartier = ?, lieu_dit = ?,
        point_repere = ?, precisions_acces = ?, mode_charges = ?, charges_forfait = ?
       WHERE id = ?`,
    )
    .run(
      texte(formData.get("nom")),
      texte(formData.get("type")),
      texte(formData.get("usage")),
      texte(formData.get("ville")) || texte(formData.get("ville_libre")),
      texte(formData.get("quartier")) || texte(formData.get("quartier_libre")) || null,
      texte(formData.get("lieu_dit")) || null,
      texte(formData.get("point_repere")) || null,
      texte(formData.get("precisions_acces")) || null,
      texte(formData.get("mode_charges")),
      nombre(formData.get("charges_forfait")),
      id,
    );
  tracer(ctx, "modification", "biens", id, `Bien « ${texte(formData.get("nom"))} » modifié`, {
    avant,
  });
  revalidatePath(`/app/biens/${id}`);
  redirect(`/app/biens/${id}`);
}

export async function actionAjouterUnite(formData: FormData) {
  const ctx = await exigerContexte();
  const bienId = texte(formData.get("bien_id"));
  const base = db();
  const bien = base.prepare(`SELECT * FROM biens WHERE id = ?`).get(bienId) as any;
  if (!bien || bien.proprietaire_id !== ctx.proprietaireActif) redirect("/app/biens");

  const id = nouvelId();
  const libelle = texte(formData.get("libelle")) || "Nouveau logement";
  base
    .prepare(
      `INSERT INTO unites (id, bien_id, libelle, etage, nb_pieces, superficie, meuble,
         loyer_reference, caution_reference, statut, unique_du_bien, cree_le)
       VALUES (?,?,?,?,?,?,?,?,?,'libre',0,?)`,
    )
    .run(
      id,
      bienId,
      libelle,
      texte(formData.get("etage")) || null,
      nombre(formData.get("nb_pieces")) || null,
      nombre(formData.get("superficie")) || null,
      formData.get("meuble") === "1" ? 1 : 0,
      nombre(formData.get("loyer_reference")),
      nombre(formData.get("caution_reference")),
      maintenant(),
    );
  // Le bien n'est plus « à logement unique » dès qu'il en a plusieurs.
  base.prepare(`UPDATE unites SET unique_du_bien = 0 WHERE bien_id = ?`).run(bienId);
  tracer(ctx, "creation", "unites", id, `Logement « ${libelle} » ajouté`);
  revalidatePath(`/app/biens/${bienId}`);
  redirect(`/app/biens/${bienId}`);
}

/** On archive, on n'efface jamais : une donnée effacée est une preuve perdue. */
export async function actionArchiverBien(formData: FormData) {
  const ctx = await exigerContexte();
  const id = texte(formData.get("id"));
  const base = db();
  const bien = base.prepare(`SELECT * FROM biens WHERE id = ?`).get(id) as any;
  if (!bien || bien.proprietaire_id !== ctx.proprietaireActif) redirect("/app/biens");

  const actifs = base
    .prepare(
      `SELECT COUNT(*) AS n FROM baux b JOIN unites u ON u.id = b.unite_id
       WHERE u.bien_id = ? AND b.statut IN ('actif','preavis')`,
    )
    .get(id) as any;
  if (actifs.n > 0) {
    redirect(
      `/app/biens/${id}?e=` +
        encodeURIComponent(
          "Ce bien a encore un bail en cours. Terminez le bail avant de l'archiver.",
        ),
    );
  }

  base.prepare(`UPDATE biens SET archive_le = ? WHERE id = ?`).run(maintenant(), id);
  tracer(ctx, "suppression", "biens", id, `Bien « ${bien.nom} » archivé`);
  revalidatePath("/app/biens");
  redirect("/app/biens");
}
