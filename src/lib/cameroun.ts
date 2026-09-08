/**
 * Villes et quartiers du Cameroun.
 * Au Cameroun l'adressage par rue et numéro est souvent inexistant : on repère un
 * logement par sa ville, son quartier et un point de repère parlant.
 * Le bailleur peut toujours saisir une ville ou un quartier absent de la liste.
 */
export const VILLES: Record<string, string[]> = {
  Douala: [
    "Akwa", "Bonanjo", "Bonapriso", "Bonabéri", "Deïdo", "Bépanda", "Makepe",
    "Ndogbong", "Logbessou", "Kotto", "Bonamoussadi", "Logpom", "PK 8", "PK 12",
    "New Bell", "Nyalla", "Village", "Cité des Palmiers", "Ndokotti", "Bali",
  ],
  Yaoundé: [
    "Bastos", "Mvog-Ada", "Mvog-Mbi", "Nlongkak", "Essos", "Mvan", "Nsam",
    "Biyem-Assi", "Mendong", "Simbock", "Odza", "Emana", "Nkolbisson", "Ekounou",
    "Mimboman", "Ngousso", "Etoa-Meki", "Melen", "Obili", "Damas",
  ],
  Bafoussam: ["Tamdja", "Djeleng", "Kamkop", "Banengo", "Tougang", "Ndiangdam"],
  Garoua: ["Poumpoumré", "Roumdé Adjia", "Djamboutou", "Yelwa", "Lopéré"],
  Bamenda: ["Up Station", "Nkwen", "Mankon", "Bambili", "Ntarikon", "Mile 4"],
  Buea: ["Molyko", "Bonduma", "Great Soppo", "Muea", "Mile 16", "Bokwango"],
  Kribi: ["Dombé", "Mpangou", "Talla", "Afan Mabé", "Mboa Manga"],
  Limbé: ["Mile 1", "Mile 2", "Mile 4", "Bota", "Down Beach", "Isokolo"],
  Ngaoundéré: ["Baladji", "Dang", "Mbideng", "Burkina", "Bamyanga"],
  Maroua: ["Domayo", "Djarengol", "Founangué", "Pitoaré", "Kakataré"],
  Bertoua: ["Nkolbikon", "Mokolo", "Tigaza", "Madagascar"],
  Ebolowa: ["Nko'ovos", "Angalé", "Mvog-Betsi", "Camp Sic"],
};

export const LISTE_VILLES = Object.keys(VILLES);

export const TYPES_BIEN = [
  { code: "maison", libelle: "Maison" },
  { code: "immeuble", libelle: "Immeuble" },
  { code: "appartement", libelle: "Appartement" },
  { code: "studio", libelle: "Studio" },
  { code: "chambre", libelle: "Chambre" },
  { code: "boutique", libelle: "Boutique" },
  { code: "magasin", libelle: "Magasin" },
  { code: "bureau", libelle: "Bureau" },
];

export const MODES_CHARGES = [
  {
    code: "incluses",
    libelle: "Comprises dans le loyer",
    explication: "Rien à suivre. Le loyer couvre tout.",
  },
  {
    code: "forfait",
    libelle: "Forfait mensuel",
    explication: "Un montant fixe s'ajoute au loyer chaque mois.",
  },
  {
    code: "compteur_individuel",
    libelle: "Compteur individuel",
    explication:
      "Vous relevez le compteur du locataire, laloc calcule la consommation et le montant.",
  },
  {
    code: "compteur_commun",
    libelle: "Compteur commun à répartir",
    explication:
      "Un seul compteur pour plusieurs logements. Vous saisissez la facture, laloc répartit.",
  },
  {
    code: "charge_directe",
    libelle: "Le locataire paie directement",
    explication: "Compteur prépayé par exemple. Vous ne suivez rien.",
  },
];

export const TYPES_PIECE = [
  "Carte nationale d'identité",
  "Passeport",
  "Carte de séjour",
  "Récépissé",
  "Permis de conduire",
];
