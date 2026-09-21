import { ajouterMois, moisLong } from "@/lib/format";

export type EcheanceCalculee = {
  periode_debut: string;
  periode_fin: string;
  libelle: string;
  date_echeance: string;
  montant_loyer: number;
  montant_charges: number;
  montant_attendu: number;
};

/**
 * Fabrique l'échéancier complet d'un bail.
 *
 * Une ligne par période due. Le montant est figé sur l'échéance au moment de la
 * génération : une augmentation de loyer plus tard ne réécrit pas le passé.
 */
export function genererEcheancier(bail: {
  date_debut: string;
  duree_mois: number;
  loyer_mensuel: number;
  charges_mensuelles: number;
  jour_echeance: number;
  periodicite: string;
}): EcheanceCalculee[] {
  const pas = bail.periodicite === "trimestrielle" ? 3 : 1;
  const nb = Math.max(1, Math.ceil(bail.duree_mois / pas));
  const lignes: EcheanceCalculee[] = [];

  for (let i = 0; i < nb; i++) {
    const debut = ajouterMois(bail.date_debut, i * pas);
    const finExclusive = ajouterMois(bail.date_debut, (i + 1) * pas);
    const fin = reculerUnJour(finExclusive);

    const loyer = bail.loyer_mensuel * pas;
    const charges = bail.charges_mensuelles * pas;

    lignes.push({
      periode_debut: debut,
      periode_fin: fin,
      libelle:
        pas === 1
          ? `Loyer ${moisLong(debut)}`
          : `Loyer ${moisLong(debut)} à ${moisLong(fin)}`,
      // Une échéance ne peut jamais tomber avant le début de la période qu'elle couvre :
      // un bail qui démarre le 15 ne peut pas avoir son premier loyer dû le 5.
      date_echeance: plusTardDes(jourDuMois(debut, bail.jour_echeance), debut),
      montant_loyer: loyer,
      montant_charges: charges,
      montant_attendu: loyer + charges,
    });
  }
  return lignes;
}

function plusTardDes(a: string, b: string): string {
  return a >= b ? a : b;
}

function reculerUnJour(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Ramène au dernier jour du mois si le jour d'échéance n'existe pas (le 31 en février). */
function jourDuMois(iso: string, jour: number): string {
  const [a, m] = iso.split("-").map(Number);
  const dernier = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const j = Math.min(Math.max(1, jour), dernier);
  return `${a}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
}
