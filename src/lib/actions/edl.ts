"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, nouvelId, maintenant } from "@/lib/db";
import { exigerContexte } from "@/lib/session";
import { aLeDroit } from "@/lib/auth";
import { tracer } from "@/lib/audit";
import { PIECES_TYPE } from "@/lib/edl-modele";
import { bailParId, nomLogement } from "@/lib/requetes";
import { adresseLogement, emettreDocument, enTeteBailleur } from "@/lib/documents";
import { aujourdhui, ETATS_ELEMENT, horodatageDouala } from "@/lib/format";

const t = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export async function actionCreerEdl(formData: FormData) {
  const ctx = await exigerContexte();
  if (!aLeDroit(ctx, "etat_des_lieux")) {
    redirect("/app/etats-des-lieux?e=" + encodeURIComponent("Droit non délégué."));
  }
  const bailId = t(formData.get("bail_id"));
  const type = t(formData.get("type")) === "sortie" ? "sortie" : "entree";
  const bail = bailParId(bailId);
  if (!bail || bail.proprietaire_id !== ctx.proprietaireActif) redirect("/app/etats-des-lieux");

  const base = db();
  const id = nouvelId();
  const entree =
    type === "sortie"
      ? (base
          .prepare(
            `SELECT id FROM etats_des_lieux WHERE bail_id = ? AND type = 'entree'
             ORDER BY date DESC LIMIT 1`,
          )
          .get(bailId) as any)
      : null;

  const nbChambres = Math.max(0, Math.min(6, parseInt(t(formData.get("nb_chambres")) || "1", 10)));

  base.transaction(() => {
    base
      .prepare(
        `INSERT INTO etats_des_lieux (id, proprietaire_id, bail_id, type, date, statut,
          edl_entree_id, cree_le) VALUES (?,?,?,?,?,'brouillon',?,?)`,
      )
      .run(id, ctx.proprietaireActif, bailId, type, t(formData.get("date")) || aujourdhui(), entree?.id ?? null, maintenant());

    let ordre = 0;
    for (const modele of PIECES_TYPE) {
      const repetitions = modele.nom === "Chambre" ? nbChambres : 1;
      for (let k = 0; k < repetitions; k++) {
        const pieceId = nouvelId();
        base
          .prepare(`INSERT INTO edl_pieces (id, edl_id, nom, ordre) VALUES (?,?,?,?)`)
          .run(
            pieceId,
            id,
            repetitions > 1 ? `${modele.nom} ${k + 1}` : modele.nom,
            ordre++,
          );
        let o = 0;
        for (const el of modele.elements) {
          base
            .prepare(`INSERT INTO edl_elements (id, piece_id, libelle, ordre) VALUES (?,?,?,?)`)
            .run(nouvelId(), pieceId, el, o++);
        }
      }
    }
    tracer(ctx, "creation", "etats_des_lieux", id, `État des lieux d'${type} créé`);
  })();

  redirect(`/app/etats-des-lieux/${id}`);
}

export async function actionEnregistrerEdl(formData: FormData) {
  const ctx = await exigerContexte();
  const id = t(formData.get("id"));
  const base = db();
  const edl = base.prepare(`SELECT * FROM etats_des_lieux WHERE id = ?`).get(id) as any;
  if (!edl || edl.proprietaire_id !== ctx.proprietaireActif) redirect("/app/etats-des-lieux");
  if (edl.statut === "signe") {
    redirect(`/app/etats-des-lieux/${id}?e=` + encodeURIComponent("Ce document est signé : il ne peut plus être modifié."));
  }

  const elements = base
    .prepare(
      `SELECT e.id FROM edl_elements e JOIN edl_pieces p ON p.id = e.piece_id WHERE p.edl_id = ?`,
    )
    .all(id) as any[];

  base.transaction(() => {
    for (const el of elements) {
      const etat = t(formData.get(`etat_${el.id}`));
      const commentaire = t(formData.get(`com_${el.id}`));
      base
        .prepare(`UPDATE edl_elements SET etat = ?, commentaire = ? WHERE id = ?`)
        .run(etat || null, commentaire || null, el.id);
    }
    base
      .prepare(
        `UPDATE etats_des_lieux SET releve_electricite = ?, releve_eau = ?, observations = ? WHERE id = ?`,
      )
      .run(
        t(formData.get("releve_electricite")) || null,
        t(formData.get("releve_eau")) || null,
        t(formData.get("observations")) || null,
        id,
      );

    // Photos : une liste de chemins séparés par des virgules, par pièce.
    const pieces = base.prepare(`SELECT id FROM edl_pieces WHERE edl_id = ?`).all(id) as any[];
    for (const p of pieces) {
      const chemins = t(formData.get(`photos_${p.id}`))
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      base.prepare(`DELETE FROM edl_photos WHERE piece_id = ?`).run(p.id);
      for (const c of chemins) {
        base
          .prepare(`INSERT INTO edl_photos (id, edl_id, piece_id, fichier, cree_le) VALUES (?,?,?,?,?)`)
          .run(nouvelId(), id, p.id, c, maintenant());
      }
    }
  })();

  revalidatePath(`/app/etats-des-lieux/${id}`);
  redirect(`/app/etats-des-lieux/${id}?ok=1`);
}

/** Signature des deux parties, puis figeage définitif et génération du PDF. */
export async function actionSignerEdl(formData: FormData) {
  const ctx = await exigerContexte();
  const id = t(formData.get("id"));
  const base = db();
  const edl = base.prepare(`SELECT * FROM etats_des_lieux WHERE id = ?`).get(id) as any;
  if (!edl || edl.proprietaire_id !== ctx.proprietaireActif) redirect("/app/etats-des-lieux");
  if (edl.statut === "signe") redirect(`/app/etats-des-lieux/${id}`);

  const sigBailleur = t(formData.get("signature_bailleur"));
  const sigLocataire = t(formData.get("signature_locataire"));
  if (!sigBailleur || !sigLocataire) {
    redirect(
      `/app/etats-des-lieux/${id}?e=` +
        encodeURIComponent("Les deux parties doivent signer avant de figer le document."),
    );
  }

  const bail = bailParId(edl.bail_id)!;
  const pieces = base
    .prepare(`SELECT * FROM edl_pieces WHERE edl_id = ? ORDER BY ordre`)
    .all(id) as any[];

  const piecesFigees = pieces.map((p) => ({
    nom: p.nom,
    elements: (
      base.prepare(`SELECT * FROM edl_elements WHERE piece_id = ? ORDER BY ordre`).all(p.id) as any[]
    ).map((e) => ({
      libelle: e.libelle,
      etat: ETATS_ELEMENT[e.etat] ?? "Non renseigné",
      commentaire: e.commentaire,
    })),
  }));

  // Comparaison avec l'entrée, pour un état des lieux de sortie.
  let comparaison: any[] | undefined;
  if (edl.type === "sortie" && edl.edl_entree_id) {
    comparaison = [];
    const piecesEntree = base
      .prepare(`SELECT * FROM edl_pieces WHERE edl_id = ? ORDER BY ordre`)
      .all(edl.edl_entree_id) as any[];
    for (const ps of pieces) {
      const pe = piecesEntree.find((x) => x.nom === ps.nom);
      if (!pe) continue;
      const els = base.prepare(`SELECT * FROM edl_elements WHERE piece_id = ? ORDER BY ordre`).all(ps.id) as any[];
      const ele = base.prepare(`SELECT * FROM edl_elements WHERE piece_id = ? ORDER BY ordre`).all(pe.id) as any[];
      for (const e of els) {
        const avant = ele.find((x) => x.libelle === e.libelle);
        if (!avant) continue;
        if (avant.etat !== e.etat) {
          comparaison.push({
            piece: ps.nom,
            element: e.libelle,
            entree: ETATS_ELEMENT[avant.etat] ?? "Non renseigné",
            sortie: ETATS_ELEMENT[e.etat] ?? "Non renseigné",
          });
        }
      }
    }
  }

  const empreinteSignatures = crypto
    .createHash("sha256")
    .update(sigBailleur + sigLocataire)
    .digest("hex");

  const documentId = await emettreDocument(
    ctx,
    edl.type === "entree" ? "edl_entree" : "edl_sortie",
    {
      bailleur: enTeteBailleur(ctx.proprietaireActif),
      locataire: { nom: bail.locataire_nom, telephone: bail.locataire_telephone },
      logement: { designation: nomLogement(bail), adresse: adresseLogement(bail) },
      pieces_edl: piecesFigees,
      comparaison,
      releves: [
        ...(edl.releve_electricite ? [{ type: "Compteur électrique", valeur: edl.releve_electricite }] : []),
        ...(edl.releve_eau ? [{ type: "Compteur eau", valeur: edl.releve_eau }] : []),
      ],
      observations: edl.observations,
      date: edl.date,
      journal_signature: [
        `Document figé le ${horodatageDouala()} (heure de Douala).`,
        `Signé par le bailleur : ${ctx.profil.nom}.`,
        `Signé par le locataire : ${bail.locataire_nom}, ${bail.locataire_telephone}.`,
        `Empreinte des signatures manuscrites : ${empreinteSignatures}.`,
        `Signature avec dossier de preuve. Ne vaut pas signature électronique avancée au sens de la loi n°2010/012 du 21 décembre 2010.`,
      ],
    } as any,
    { bailId: bail.id, locataireId: bail.locataire_id, bienId: bail.bien_id },
  );

  base
    .prepare(
      `UPDATE etats_des_lieux SET statut = 'signe', signature_bailleur = ?, signature_locataire = ?,
        signe_le = ?, document_id = ? WHERE id = ?`,
    )
    .run(sigBailleur, sigLocataire, maintenant(), documentId, id);

  tracer(ctx, "modification", "etats_des_lieux", id, "État des lieux signé et figé");
  revalidatePath(`/app/etats-des-lieux/${id}`);
  redirect(`/app/documents/${documentId}`);
}
