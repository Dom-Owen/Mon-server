/** Trame par défaut d'un état des lieux, pièce par pièce. Le bailleur peut tout modifier. */
export const PIECES_TYPE: { nom: string; elements: string[] }[] = [
  {
    nom: "Salon",
    elements: ["Murs", "Sol", "Plafond", "Porte", "Fenêtres", "Prises et interrupteurs", "Éclairage"],
  },
  {
    nom: "Chambre",
    elements: ["Murs", "Sol", "Plafond", "Porte", "Fenêtres", "Placard", "Prises et interrupteurs"],
  },
  {
    nom: "Cuisine",
    elements: ["Murs", "Sol", "Plafond", "Évier", "Robinetterie", "Plan de travail", "Prises"],
  },
  {
    nom: "Douche et WC",
    elements: ["Murs", "Sol", "Douche", "Robinetterie", "WC", "Lavabo", "Évacuation"],
  },
  {
    nom: "Extérieur et parties communes",
    elements: ["Portail", "Cour", "Compteur électrique", "Compteur eau", "Toiture visible"],
  },
];

export const ETATS = [
  { code: "neuf", libelle: "Neuf" },
  { code: "bon", libelle: "Bon" },
  { code: "moyen", libelle: "Moyen" },
  { code: "mauvais", libelle: "Mauvais" },
];
