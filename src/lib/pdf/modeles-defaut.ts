/**
 * Modèles de documents fournis par défaut.
 *
 * ATTENTION, POINT IMPORTANT : aucun texte juridique n'est inventé ici.
 * Les clauses sont des emplacements vides, explicitement marqués, que le bailleur
 * remplit avec un texte validé par un juriste camerounais. Les articles portent les
 * données factuelles du contrat (durée, loyer, caution), qui elles ne relèvent pas
 * du droit mais du contrat lui-même.
 *
 * Le texte de remplacement est volontairement voyant : il doit être impossible
 * d'utiliser un document par erreur en croyant qu'il est complet.
 */

export const A_FOURNIR =
  "[ CLAUSE À FOURNIR — texte à faire rédiger ou valider par un conseil juridique, " +
  "puis à saisir dans laloc via Documents > Modèles. ]";

export type ArticleModele = { titre: string; texte: string };

export const MODELES_DEFAUT: Record<string, { titre: string; articles: ArticleModele[] }> = {
  bail_habitation: {
    titre: "Contrat de bail à usage d'habitation",
    articles: [
      { titre: "Article 1 — Désignation des parties", texte: "{{parties}}" },
      { titre: "Article 2 — Désignation du bien loué", texte: "{{bien}}" },
      { titre: "Article 3 — Destination des lieux", texte: A_FOURNIR },
      { titre: "Article 4 — Durée du bail", texte: "{{duree}}" },
      { titre: "Article 5 — Loyer et charges", texte: "{{loyer}}" },
      { titre: "Article 6 — Modalités de paiement", texte: "{{paiement}}" },
      { titre: "Article 7 — Dépôt de garantie", texte: "{{caution}}" },
      { titre: "Article 8 — Obligations du bailleur", texte: A_FOURNIR },
      { titre: "Article 9 — Obligations du locataire", texte: A_FOURNIR },
      { titre: "Article 10 — Réparations et entretien", texte: A_FOURNIR },
      { titre: "Article 11 — État des lieux", texte: A_FOURNIR },
      { titre: "Article 12 — Résiliation et préavis", texte: "{{preavis}}" },
      { titre: "Article 13 — Clause résolutoire", texte: A_FOURNIR },
      { titre: "Article 14 — Élection de domicile et litiges", texte: A_FOURNIR },
    ],
  },
  bail_commercial: {
    titre: "Contrat de bail à usage commercial",
    articles: [
      { titre: "Article 1 — Désignation des parties", texte: "{{parties}}" },
      { titre: "Article 2 — Désignation du local", texte: "{{bien}}" },
      { titre: "Article 3 — Activité autorisée", texte: A_FOURNIR },
      { titre: "Article 4 — Durée et renouvellement", texte: "{{duree}}" },
      { titre: "Article 5 — Loyer et charges", texte: "{{loyer}}" },
      { titre: "Article 6 — Révision du loyer", texte: A_FOURNIR },
      { titre: "Article 7 — Dépôt de garantie", texte: "{{caution}}" },
      { titre: "Article 8 — Cession et sous-location", texte: A_FOURNIR },
      { titre: "Article 9 — Travaux et aménagements", texte: A_FOURNIR },
      { titre: "Article 10 — Obligations des parties", texte: A_FOURNIR },
      { titre: "Article 11 — Résiliation et préavis", texte: "{{preavis}}" },
      { titre: "Article 12 — Élection de domicile et litiges", texte: A_FOURNIR },
    ],
  },
  avenant: {
    titre: "Avenant au contrat de bail",
    articles: [
      { titre: "Article 1 — Rappel du bail initial", texte: "{{rappel}}" },
      { titre: "Article 2 — Objet de la modification", texte: "{{objet}}" },
      { titre: "Article 3 — Date d'effet", texte: "{{effet}}" },
      { titre: "Article 4 — Clauses inchangées", texte: A_FOURNIR },
    ],
  },
  attestation: {
    titre: "Attestation de résidence",
    articles: [
      { titre: "Attestation", texte: "{{corps}}" },
      { titre: "Portée de la présente attestation", texte: A_FOURNIR },
    ],
  },
};

/** Modèles de messages de relance, en français et en anglais. */
export const MESSAGES_DEFAUT: {
  code: string;
  langue: string;
  objet: string;
  corps: string;
}[] = [
  {
    code: "avis_echeance",
    langue: "fr",
    objet: "Avis d'échéance — {{periode}}",
    corps:
      "Bonjour {{locataire}},\n\nVotre loyer pour {{logement}} arrive à échéance le {{date_echeance}}.\n" +
      "Montant : {{montant}}.\n\nMerci de votre ponctualité.\n{{bailleur}}",
  },
  {
    code: "avis_echeance",
    langue: "en",
    objet: "Rent due — {{periode}}",
    corps:
      "Hello {{locataire}},\n\nYour rent for {{logement}} is due on {{date_echeance}}.\n" +
      "Amount: {{montant}}.\n\nThank you.\n{{bailleur}}",
  },
  {
    code: "rappel",
    langue: "fr",
    objet: "Rappel — loyer {{periode}}",
    corps:
      "Bonjour {{locataire}},\n\nPetit rappel amical : votre loyer de {{montant}} pour {{logement}} " +
      "est attendu le {{date_echeance}}.\n\nMerci beaucoup.\n{{bailleur}}",
  },
  {
    code: "rappel",
    langue: "en",
    objet: "Reminder — rent {{periode}}",
    corps:
      "Hello {{locataire}},\n\nA friendly reminder: your rent of {{montant}} for {{logement}} " +
      "is due on {{date_echeance}}.\n\nMany thanks.\n{{bailleur}}",
  },
  {
    code: "relance",
    langue: "fr",
    objet: "Loyer en retard — {{periode}}",
    corps:
      "Bonjour {{locataire}},\n\nSauf erreur de ma part, le loyer de {{logement}} présente un solde " +
      "de {{montant}}, échu depuis le {{date_echeance}} ({{jours}} jours).\n\n" +
      "Merci de régulariser dès que possible, ou de me dire où vous en êtes.\n\n{{bailleur}}",
  },
  {
    code: "relance",
    langue: "en",
    objet: "Overdue rent — {{periode}}",
    corps:
      "Hello {{locataire}},\n\nUnless I am mistaken, the rent for {{logement}} shows an outstanding " +
      "balance of {{montant}}, due since {{date_echeance}} ({{jours}} days).\n\n" +
      "Please settle it as soon as you can, or let me know where things stand.\n\n{{bailleur}}",
  },
  {
    code: "mise_en_demeure",
    langue: "fr",
    objet: "Mise en demeure — loyer impayé",
    corps:
      "Bonjour {{locataire}},\n\nMalgré mes relances, le solde de {{montant}} concernant {{logement}} " +
      "reste impayé depuis le {{date_echeance}}.\n\nJe vous adresse ce jour une mise en demeure écrite. " +
      "Merci de la consulter.\n\n{{bailleur}}",
  },
  {
    code: "fin_bail",
    langue: "fr",
    objet: "Votre bail arrive à échéance",
    corps:
      "Bonjour {{locataire}},\n\nVotre bail concernant {{logement}} arrive à échéance le {{date_fin}}.\n\n" +
      "Souhaitez-vous le renouveler ? Merci de me le faire savoir.\n\n{{bailleur}}",
  },
];
