/** Mise en forme : francs CFA, numéros camerounais, dates en heure de Douala. */

const ESPACE_INSECABLE = " ";

/** 150000 → « 150 000 FCFA ». Entiers uniquement, jamais de centime. */
export function fcfa(montant: number): string {
  return `${entier(montant)}${ESPACE_INSECABLE}FCFA`;
}

export function entier(montant: number): string {
  const n = Math.round(montant || 0);
  const signe = n < 0 ? "-" : "";
  return (
    signe +
    Math.abs(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_INSECABLE)
  );
}

/**
 * Normalise un numéro camerounais vers le format international E.164.
 * Accepte « 691234567 », « 6 91 23 45 67 », « +237 691 23 45 67 », « 00237691234567 ».
 */
export function normaliserTelephone(saisie: string, indicatif = "237"): string | null {
  if (!saisie) return null;
  let n = saisie.replace(/[\s\-().]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  else if (n.startsWith("00")) n = n.slice(2);
  else if (!n.startsWith(indicatif)) n = indicatif + n;
  if (!/^\d{8,15}$/.test(n)) return null;
  if (n.startsWith("237")) {
    const local = n.slice(3);
    // Mobile : 9 chiffres commençant par 6. Fixe : 9 chiffres commençant par 2.
    if (!/^[62]\d{8}$/.test(local)) return null;
  }
  return "+" + n;
}

/** +237691234567 → « +237 6 91 23 45 67 » */
export function afficherTelephone(e164: string | null | undefined): string {
  if (!e164) return "";
  if (!e164.startsWith("+237")) return e164;
  const l = e164.slice(4);
  if (l.length !== 9) return e164;
  return `+237 ${l[0]} ${l.slice(1, 3)} ${l.slice(3, 5)} ${l.slice(5, 7)} ${l.slice(7, 9)}`;
}

export function estMobileCamerounais(e164: string): boolean {
  return /^\+2376\d{8}$/.test(e164);
}

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** Ramène un horodatage universel à la date locale de Douala (UTC+1, sans heure d'été). */
export function dateDouala(iso: string | null | undefined): string {
  if (!iso) return "";
  if (iso.length <= 10) return iso;
  return new Date(new Date(iso).getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** '2026-09-07' → « 7 septembre 2026 ». Accepte aussi un horodatage complet. */
export function dateLongue(iso: string | null | undefined): string {
  iso = dateDouala(iso);
  if (!iso) return "";
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  if (!a || !m || !j) return iso;
  return `${j} ${MOIS[m - 1]} ${a}`;
}

/** '2026-09-07' → « 07/09/2026 ». Accepte aussi un horodatage complet. */
export function dateCourte(iso: string | null | undefined): string {
  iso = dateDouala(iso);
  if (!iso) return "";
  const [a, m, j] = iso.slice(0, 10).split("-");
  return `${j}/${m}/${a}`;
}

/** '2026-09' → « septembre 2026 » */
export function moisLong(periode: string): string {
  const [a, m] = periode.slice(0, 7).split("-").map(Number);
  return `${MOIS[m - 1]} ${a}`;
}

export function aujourdhui(): string {
  // Le Cameroun est à UTC+1 toute l'année, sans heure d'été.
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function horodatageDouala(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const dec = new Date(d.getTime() + 60 * 60 * 1000);
  const s = dec.toISOString();
  return `${dateCourte(s.slice(0, 10))} à ${s.slice(11, 16)}`;
}

/** Ajoute n mois à une date, en ramenant au dernier jour du mois si besoin. */
export function ajouterMois(iso: string, n: number): string {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  const total = (a * 12 + (m - 1)) + n;
  const na = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const dernier = new Date(Date.UTC(na, nm, 0)).getUTCDate();
  const nj = Math.min(j, dernier);
  return `${na}-${String(nm).padStart(2, "0")}-${String(nj).padStart(2, "0")}`;
}

export function ajouterJours(iso: string, n: number): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function joursEntre(a: string, b: string): number {
  const da = new Date(a.slice(0, 10) + "T00:00:00Z").getTime();
  const dbb = new Date(b.slice(0, 10) + "T00:00:00Z").getTime();
  return Math.round((dbb - da) / 86400000);
}

export const MODES_PAIEMENT: Record<string, string> = {
  especes: "Espèces",
  mtn_momo: "MTN Mobile Money",
  orange_money: "Orange Money",
  virement: "Virement bancaire",
  cheque: "Chèque",
};

export const ETATS_ELEMENT: Record<string, string> = {
  neuf: "Neuf",
  bon: "Bon",
  moyen: "Moyen",
  mauvais: "Mauvais",
};
