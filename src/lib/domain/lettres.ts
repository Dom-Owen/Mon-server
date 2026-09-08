/**
 * Écriture d'un montant en toutes lettres, en français.
 * Obligatoire sur une quittance : « cent cinquante mille francs CFA ».
 */

const UNITES = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
];
const DIZAINES = [
  "", "", "vingt", "trente", "quarante", "cinquante",
  "soixante", "soixante", "quatre-vingt", "quatre-vingt",
];

function souscent(n: number): string {
  if (n < 20) return UNITES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  // 70-79 et 90-99 se construisent sur soixante-dix et quatre-vingt-dix
  if (d === 7 || d === 9) {
    const base = DIZAINES[d];
    const reste = UNITES[10 + u];
    if (d === 7 && u === 1) return "soixante et onze";
    return `${base}-${reste}`;
  }
  if (u === 0) return d === 8 ? "quatre-vingts" : DIZAINES[d];
  if (u === 1 && d !== 8) return `${DIZAINES[d]} et un`;
  return `${DIZAINES[d]}-${UNITES[u]}`;
}

/**
 * « cent » prend un s quand il est multiplié et qu'aucun adjectif numéral ne le suit.
 * « mille » est un adjectif numéral : on écrit « deux cent mille », sans s.
 * « million » et « milliard » sont des noms : on écrit « deux cents millions », avec s.
 */
function souscmille(n: number, suiviDeMille = false): string {
  if (n < 100) return souscent(n);
  const c = Math.floor(n / 100);
  const r = n % 100;
  const tete = c === 1 ? "cent" : `${UNITES[c]} cent`;
  if (r === 0) {
    if (c === 1) return "cent";
    return suiviDeMille ? `${UNITES[c]} cent` : `${UNITES[c]} cents`;
  }
  return `${tete} ${souscent(r)}`;
}

/** 150000 → « cent cinquante mille » */
export function enLettres(n: number): string {
  n = Math.round(Math.abs(n || 0));
  if (n === 0) return "zéro";

  const tranches: Array<[number, string, string]> = [
    [1_000_000_000, "milliard", "milliards"],
    [1_000_000, "million", "millions"],
    [1_000, "mille", "mille"], // « mille » est invariable
  ];

  const morceaux: string[] = [];
  let reste = n;

  for (const [valeur, singulier, pluriel] of tranches) {
    const q = Math.floor(reste / valeur);
    if (q > 0) {
      if (valeur === 1_000 && q === 1) morceaux.push("mille");
      else
        morceaux.push(
          `${souscmille(q, valeur === 1_000)} ${q > 1 ? pluriel : singulier}`,
        );
      reste %= valeur;
    }
  }
  if (reste > 0) morceaux.push(souscmille(reste));

  return morceaux.join(" ").replace(/\s+/g, " ").trim();
}

/** Version prête pour un document : « Cent cinquante mille francs CFA » */
export function montantEnLettres(n: number): string {
  const texte = enLettres(n) + " francs CFA";
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
