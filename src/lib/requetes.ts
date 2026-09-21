import { db } from "@/lib/db";
import { situationBail, echeancesDuBail } from "@/lib/domain/imputation";
import { aujourdhui } from "@/lib/format";

export type BailComplet = {
  id: string;
  proprietaire_id: string;
  unite_id: string;
  mode_paiement: string | null;
  charges_forfaitaires?: number;
  locataire_nom: string;
  locataire_id: string;
  locataire_telephone: string;
  locataire_whatsapp: string | null;
  unite_libelle: string;
  unite_unique: number;
  bien_id: string;
  bien_nom: string;
  bien_ville: string;
  bien_quartier: string | null;
  loyer_mensuel: number;
  charges_mensuelles: number;
  statut: string;
  date_debut: string;
  date_fin_prevue: string | null;
  montant_caution: number;
  caution_versee: number;
  solde_ouverture: number;
  origine: string;
  jour_echeance: number;
  periodicite: string;
  duree_mois: number;
  usage: string;
  document_bail: string | null;
};

const SELECT_BAIL = `
  SELECT b.*, l.nom AS locataire_nom, l.telephone AS locataire_telephone,
         l.whatsapp AS locataire_whatsapp,
         u.libelle AS unite_libelle, u.unique_du_bien AS unite_unique,
         bi.id AS bien_id, bi.nom AS bien_nom, bi.ville AS bien_ville,
         bi.quartier AS bien_quartier
  FROM baux b
  JOIN locataires l ON l.id = b.locataire_id
  JOIN unites u ON u.id = b.unite_id
  JOIN biens bi ON bi.id = u.bien_id
`;

export function bauxDuProprietaire(
  proprietaireId: string,
  opts: { statuts?: string[]; bienId?: string } = {},
): BailComplet[] {
  const statuts = opts.statuts ?? ["actif", "preavis"];
  const params: any[] = [proprietaireId, ...statuts];
  let sql = `${SELECT_BAIL} WHERE b.proprietaire_id = ? AND b.statut IN (${statuts
    .map(() => "?")
    .join(",")})`;
  if (opts.bienId) {
    sql += ` AND bi.id = ?`;
    params.push(opts.bienId);
  }
  sql += ` ORDER BY bi.nom, u.libelle`;
  return db().prepare(sql).all(...params) as BailComplet[];
}

export function bailParId(id: string): BailComplet | null {
  return (db().prepare(`${SELECT_BAIL} WHERE b.id = ?`).get(id) as BailComplet) ?? null;
}

/** Libellé lisible d'un logement : on masque l'unité quand le bien n'en a qu'une. */
export function nomLogement(b: {
  bien_nom: string;
  unite_libelle: string;
  unite_unique: number;
}): string {
  return b.unite_unique ? b.bien_nom : `${b.bien_nom} — ${b.unite_libelle}`;
}

export type Impaye = {
  bail: BailComplet;
  du: number;
  jours: number;
  depuis: string | null;
};

/** Les impayés, du plus ancien au plus récent : c'est l'ordre utile au bailleur. */
export function impayes(proprietaireId: string): Impaye[] {
  const liste: Impaye[] = [];
  for (const bail of bauxDuProprietaire(proprietaireId)) {
    const s = situationBail(bail.id);
    if (s.du > 0) {
      liste.push({
        bail,
        du: s.du,
        jours: s.jours_retard,
        depuis: s.plus_ancienne_dette?.date_echeance ?? null,
      });
    }
  }
  return liste.sort((a, b) => b.jours - a.jours || b.du - a.du);
}

export type ResumeMois = {
  attendu: number;
  encaisse: number;
  nb_baux: number;
  nb_unites: number;
  nb_occupees: number;
  taux_occupation: number;
};

export function resumeDuMois(proprietaireId: string, mois?: string): ResumeMois {
  const base = db();
  const m = mois ?? aujourdhui().slice(0, 7);

  const attendu = (base
    .prepare(
      `SELECT COALESCE(SUM(e.montant_attendu), 0) AS t
       FROM echeances e JOIN baux b ON b.id = e.bail_id
       WHERE b.proprietaire_id = ? AND substr(e.date_echeance, 1, 7) = ?
         AND b.statut IN ('actif','preavis')`,
    )
    .get(proprietaireId, m) as any).t as number;

  const encaisse = (base
    .prepare(
      `SELECT COALESCE(SUM(montant), 0) AS t FROM paiements
       WHERE proprietaire_id = ? AND substr(date_encaissement, 1, 7) = ?
         AND statut = 'enregistre'`,
    )
    .get(proprietaireId, m) as any).t as number;

  const unites = base
    .prepare(
      `SELECT COUNT(*) AS n,
              SUM(CASE WHEN u.statut = 'occupee' THEN 1 ELSE 0 END) AS occ
       FROM unites u JOIN biens bi ON bi.id = u.bien_id
       WHERE bi.proprietaire_id = ? AND u.archive_le IS NULL AND bi.archive_le IS NULL`,
    )
    .get(proprietaireId) as any;

  const nbBaux = (base
    .prepare(
      `SELECT COUNT(*) AS n FROM baux WHERE proprietaire_id = ? AND statut IN ('actif','preavis')`,
    )
    .get(proprietaireId) as any).n as number;

  const n = Number(unites.n) || 0;
  const occ = Number(unites.occ) || 0;

  return {
    attendu,
    encaisse,
    nb_baux: nbBaux,
    nb_unites: n,
    nb_occupees: occ,
    taux_occupation: n ? Math.round((occ / n) * 100) : 0,
  };
}

/** Baux qui arrivent à échéance dans les 90 jours. */
export function bauxQuiFinissent(proprietaireId: string, jours = 90): BailComplet[] {
  const limite = new Date(Date.now() + jours * 86400000).toISOString().slice(0, 10);
  return db()
    .prepare(
      `${SELECT_BAIL} WHERE b.proprietaire_id = ? AND b.statut IN ('actif','preavis')
        AND b.date_fin_prevue IS NOT NULL AND b.date_fin_prevue <= ?
        AND b.date_fin_prevue >= ?
       ORDER BY b.date_fin_prevue ASC`,
    )
    .all(proprietaireId, limite, aujourdhui()) as BailComplet[];
}

export function bienParId(id: string) {
  return db().prepare(`SELECT * FROM biens WHERE id = ?`).get(id) as any;
}

export function unitesDuBien(bienId: string) {
  return db()
    .prepare(
      `SELECT u.*, (
         SELECT b.id FROM baux b WHERE b.unite_id = u.id AND b.statut IN ('actif','preavis') LIMIT 1
       ) AS bail_id
       FROM unites u WHERE u.bien_id = ? AND u.archive_le IS NULL ORDER BY u.libelle`,
    )
    .all(bienId) as any[];
}

export function parametresDe(proprietaireId: string) {
  const base = db();
  let p = base.prepare(`SELECT * FROM parametres WHERE proprietaire_id = ?`).get(proprietaireId) as any;
  if (!p) {
    base
      .prepare(`INSERT INTO parametres (proprietaire_id, maj_le) VALUES (?, datetime('now'))`)
      .run(proprietaireId);
    p = base.prepare(`SELECT * FROM parametres WHERE proprietaire_id = ?`).get(proprietaireId);
  }
  return p;
}

export { situationBail, echeancesDuBail };
