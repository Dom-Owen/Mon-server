import { db, nouvelId } from "@/lib/db";
import { aujourdhui, joursEntre } from "@/lib/format";

/**
 * Le cœur du produit : répartir les paiements sur les échéances.
 *
 * Un versement se rattache au bail, jamais à une échéance. Cette table charnière dit
 * « telle partie de tel paiement paie telle échéance ». C'est ce qui rend possible
 * l'avance de six mois ou d'un an, qui est la norme au Cameroun, et le paiement partiel.
 */

export type EtatEcheance = {
  id: string;
  bail_id: string;
  libelle: string;
  periode_debut: string;
  periode_fin: string;
  date_echeance: string;
  montant_loyer: number;
  montant_charges: number;
  montant_attendu: number;
  impute: number;
  reste: number;
  statut: "a_venir" | "due" | "partielle" | "soldee" | "en_retard";
  jours_retard: number;
};

export function echeancesDuBail(bailId: string): EtatEcheance[] {
  const lignes = db()
    .prepare(
      `SELECT e.*, COALESCE((
         SELECT SUM(i.montant) FROM imputations i
         JOIN paiements p ON p.id = i.paiement_id AND p.statut = 'enregistre'
         WHERE i.echeance_id = e.id
       ), 0) AS impute
       FROM echeances e WHERE e.bail_id = ? ORDER BY e.date_echeance ASC`,
    )
    .all(bailId) as any[];

  const today = aujourdhui();
  return lignes.map((l) => {
    const impute = Number(l.impute) || 0;
    const reste = Math.max(0, l.montant_attendu - impute);
    let statut: EtatEcheance["statut"];
    let jours = 0;
    if (reste === 0) statut = "soldee";
    else if (l.date_echeance > today) statut = "a_venir";
    else {
      jours = joursEntre(l.date_echeance, today);
      if (impute > 0) statut = "partielle";
      else statut = jours > 0 ? "en_retard" : "due";
      if (impute > 0 && jours > 0) statut = "partielle";
    }
    return { ...l, impute, reste, statut, jours_retard: jours } as EtatEcheance;
  });
}

/**
 * Impute un paiement sur les échéances, de la plus ancienne à la plus récente.
 * Ce qui reste non imputé devient le solde créditeur du bail : c'est l'avance.
 */
export function imputerPaiement(paiementId: string, bailId: string, montant: number): void {
  const base = db();
  const echeances = echeancesDuBail(bailId);
  let reste = montant;

  const inserer = base.prepare(
    `INSERT INTO imputations (id, paiement_id, echeance_id, montant) VALUES (?, ?, ?, ?)`,
  );

  for (const e of echeances) {
    if (reste <= 0) break;
    if (e.reste <= 0) continue;
    const part = Math.min(reste, e.reste);
    inserer.run(nouvelId(), paiementId, e.id, part);
    reste -= part;
  }
  // Le reliquat n'est pas perdu : il apparaît comme solde créditeur du bail.
}

/** Recalcule toutes les imputations d'un bail. Utilisé après une annulation. */
export function reimputerBail(bailId: string): void {
  const base = db();
  base.transaction(() => {
    base
      .prepare(
        `DELETE FROM imputations WHERE paiement_id IN (SELECT id FROM paiements WHERE bail_id = ?)`,
      )
      .run(bailId);
    const paiements = base
      .prepare(
        `SELECT id, montant FROM paiements WHERE bail_id = ? AND statut = 'enregistre'
         ORDER BY date_encaissement ASC, cree_le ASC`,
      )
      .all(bailId) as any[];
    for (const p of paiements) imputerPaiement(p.id, bailId, p.montant);
  })();
}

export type SituationBail = {
  attendu: number;
  encaisse: number;
  impute: number;
  solde_crediteur: number;
  du: number;
  a_jour_jusquau: string | null;
  prochaine_echeance: EtatEcheance | null;
  plus_ancienne_dette: EtatEcheance | null;
  jours_retard: number;
};

/**
 * Les deux chiffres que le bailleur veut vraiment voir :
 * « à jour jusqu'au 28 février 2027 » et « doit 45 000 FCFA depuis 62 jours ».
 */
export function situationBail(bailId: string): SituationBail {
  const base = db();
  const echeances = echeancesDuBail(bailId);
  const bail = base.prepare(`SELECT solde_ouverture FROM baux WHERE id = ?`).get(bailId) as any;

  const encaisse = (base
    .prepare(
      `SELECT COALESCE(SUM(montant), 0) AS t FROM paiements
       WHERE bail_id = ? AND statut = 'enregistre'`,
    )
    .get(bailId) as any).t as number;

  const impute = echeances.reduce((s, e) => s + e.impute, 0);
  const attendu = echeances.reduce((s, e) => s + e.montant_attendu, 0);
  const soldeCrediteur = Math.max(0, encaisse - impute);

  const today = aujourdhui();
  const echues = echeances.filter((e) => e.date_echeance <= today);
  const du =
    echues.reduce((s, e) => s + e.reste, 0) + (Number(bail?.solde_ouverture) || 0);

  // « À jour jusqu'au » : la dernière échéance d'une suite ininterrompue de mois soldés.
  let aJour: string | null = null;
  for (const e of echeances) {
    if (e.reste === 0) aJour = e.periode_fin;
    else break;
  }

  const plusAncienne = echues.find((e) => e.reste > 0) ?? null;
  const prochaine = echeances.find((e) => e.reste > 0) ?? null;

  return {
    attendu,
    encaisse,
    impute,
    solde_crediteur: soldeCrediteur,
    du,
    a_jour_jusquau: aJour,
    prochaine_echeance: prochaine,
    plus_ancienne_dette: plusAncienne,
    jours_retard: plusAncienne ? plusAncienne.jours_retard : 0,
  };
}

/** Numérotation continue par bailleur, par type de document et par année. */
export function prochainNumero(proprietaireId: string, type: string): string {
  const base = db();
  const annee = new Date().getFullYear();
  const prefixes: Record<string, string> = {
    quittance: "QUI",
    recu: "REC",
    recu_caution: "CAU",
    avis_echeance: "AVI",
    bail_habitation: "BAH",
    bail_commercial: "BAC",
    relance: "REL",
    mise_en_demeure: "MED",
    preavis: "PRE",
    conge: "CON",
    edl_entree: "EDE",
    edl_sortie: "EDS",
    decompte_caution: "DEC",
    attestation: "ATT",
    avenant: "AVE",
  };
  const prefixe = prefixes[type] ?? "DOC";

  return base.transaction(() => {
    base
      .prepare(
        `INSERT INTO compteurs_numerotation (proprietaire_id, type, annee, dernier)
         VALUES (?, ?, ?, 0) ON CONFLICT DO NOTHING`,
      )
      .run(proprietaireId, type, annee);
    base
      .prepare(
        `UPDATE compteurs_numerotation SET dernier = dernier + 1
         WHERE proprietaire_id = ? AND type = ? AND annee = ?`,
      )
      .run(proprietaireId, type, annee);
    const { dernier } = base
      .prepare(
        `SELECT dernier FROM compteurs_numerotation
         WHERE proprietaire_id = ? AND type = ? AND annee = ?`,
      )
      .get(proprietaireId, type, annee) as any;
    return `${prefixe}-${annee}-${String(dernier).padStart(4, "0")}`;
  })();
}
