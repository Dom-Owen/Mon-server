import { db, nouvelId, maintenant } from "@/lib/db";
import type { Contexte } from "@/lib/auth";

/**
 * Trace de qui a fait quoi.
 * Indispensable dès qu'un mandataire encaisse à la place du bailleur :
 * c'est ce qui permet au propriétaire vivant à l'étranger de tout voir.
 */
export function tracer(
  ctx: Contexte,
  action: "creation" | "modification" | "suppression",
  table: string,
  enregistrementId: string,
  resume: string,
  details?: { avant?: unknown; apres?: unknown },
): void {
  db()
    .prepare(
      `INSERT INTO journal_audit
       (id, proprietaire_id, table_nom, enregistrement_id, action, resume, avant, apres,
        utilisateur_id, utilisateur_nom, cree_le)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      nouvelId(),
      ctx.proprietaireActif,
      table,
      enregistrementId,
      action,
      resume,
      details?.avant ? JSON.stringify(details.avant) : null,
      details?.apres ? JSON.stringify(details.apres) : null,
      ctx.profil.id,
      ctx.profil.nom,
      maintenant(),
    );
}

export function journalDe(proprietaireId: string, limite = 100) {
  return db()
    .prepare(
      `SELECT * FROM journal_audit WHERE proprietaire_id = ?
       ORDER BY cree_le DESC LIMIT ?`,
    )
    .all(proprietaireId, limite) as any[];
}
