import type { SpecDocument, Bloc } from "./rendu";
import { MODELES_DEFAUT, A_FOURNIR } from "./modeles-defaut";
import { fcfa, dateLongue, afficherTelephone, entier } from "@/lib/format";
import { montantEnLettres } from "@/lib/domain/lettres";

/**
 * Construction du document à partir des DONNÉES FIGÉES au moment de l'émission.
 *
 * Rien n'est relu dans la base ici : tout vient de l'instantané enregistré. C'est ce
 * qui garantit qu'une quittance de janvier reste identique même si le loyer change
 * en mars, et qu'un document remis à un locataire ne bouge plus jamais.
 */

export type DonneesFigees = {
  type: string;
  numero: string;
  bailleur: {
    nom: string;
    telephone?: string | null;
    email?: string | null;
    adresse?: string | null;
    contribuable?: string | null;
  };
  locataire?: {
    nom: string;
    telephone?: string | null;
    piece?: string | null;
  };
  logement?: {
    designation: string;
    adresse: string;
    type?: string | null;
    pieces?: number | null;
    superficie?: number | null;
    meuble?: boolean;
  };
  bail?: {
    date_debut: string;
    date_fin_prevue?: string | null;
    duree_mois: number;
    loyer: number;
    charges: number;
    jour_echeance: number;
    periodicite: string;
    caution: number;
    mois_avance: number;
    usage: string;
  };
  lignes?: { libelle: string; loyer: number; charges: number; total: number }[];
  periode?: string;
  montant?: number;
  montant_paye?: number;
  reste?: number;
  mode_paiement?: string;
  date_paiement?: string;
  jours_retard?: number;
  date_echeance?: string;
  date_effet?: string;
  duree_preavis_mois?: number;
  motif?: string | null;
  retenues?: { libelle: string; montant: number }[];
  restitution?: number;
  pieces_edl?: {
    nom: string;
    elements: { libelle: string; etat: string; commentaire?: string | null }[];
  }[];
  comparaison?: {
    piece: string;
    element: string;
    entree: string;
    sortie: string;
  }[];
  releves?: { type: string; valeur: string }[];
  observations?: string | null;
  articles?: { titre: string; texte: string }[];
  lieu?: string | null;
  date: string;
  mention_legale?: string | null;
  journal_signature?: string[];
};

const TITRES: Record<string, string> = {
  quittance: "Quittance de loyer",
  recu: "Reçu de paiement",
  recu_caution: "Reçu de versement de caution",
  avis_echeance: "Avis d'échéance",
  relance: "Lettre de relance pour loyer impayé",
  mise_en_demeure: "Mise en demeure",
  preavis: "Préavis de départ",
  conge: "Congé donné par le bailleur",
  bail_habitation: "Contrat de bail à usage d'habitation",
  bail_commercial: "Contrat de bail à usage commercial",
  edl_entree: "État des lieux d'entrée",
  edl_sortie: "État des lieux de sortie",
  decompte_caution: "Décompte de restitution de caution",
  attestation: "Attestation de résidence",
  avenant: "Avenant au contrat de bail",
};

export function titreDocument(type: string): string {
  return TITRES[type] ?? "Document";
}

export function specDepuisDonnees(d: DonneesFigees): SpecDocument {
  const base: SpecDocument = {
    numero: d.numero,
    titre: titreDocument(d.type),
    bailleur: d.bailleur,
    destinataire: d.locataire
      ? {
          nom: d.locataire.nom,
          telephone: d.locataire.telephone ? afficherTelephone(d.locataire.telephone) : null,
          adresse: d.logement?.adresse ?? null,
        }
      : undefined,
    blocs: [],
    mentionLegale: d.mention_legale ?? null,
    lieu: d.lieu ?? null,
    date: dateLongue(d.date),
    journalSignature: d.journal_signature,
  };

  switch (d.type) {
    case "quittance":
    case "recu":
      base.sousTitre = d.periode ? `Période : ${d.periode}` : undefined;
      base.blocs = blocsQuittance(d);
      break;
    case "recu_caution":
      base.blocs = blocsRecuCaution(d);
      break;
    case "avis_echeance":
      base.blocs = blocsAvis(d);
      break;
    case "relance":
    case "mise_en_demeure":
      base.blocs = blocsRelance(d);
      break;
    case "bail_habitation":
    case "bail_commercial":
      base.blocs = blocsBail(d);
      break;
    case "preavis":
    case "conge":
      base.blocs = blocsPreavis(d);
      break;
    case "edl_entree":
    case "edl_sortie":
      base.blocs = blocsEtatDesLieux(d);
      break;
    case "decompte_caution":
      base.blocs = blocsDecompte(d);
      break;
    case "attestation":
    case "avenant":
      base.blocs = blocsArticles(d);
      break;
    default:
      base.blocs = [{ genre: "paragraphe", texte: "Document sans contenu." }];
  }
  return base;
}

// ------------------------------------------------------------------ quittance

function blocsQuittance(d: DonneesFigees): Bloc[] {
  const total = d.montant ?? 0;
  const estQuittance = d.type === "quittance";
  const lignes = d.lignes ?? [];

  const blocs: Bloc[] = [
    {
      genre: "champs",
      titre: "Logement concerné",
      lignes: [
        ["Désignation", d.logement?.designation ?? "—"],
        ["Adresse", d.logement?.adresse ?? "—"],
      ],
    },
    {
      genre: "tableau",
      titre: "Détail",
      entetes: ["Période", "Loyer", "Charges", "Total"],
      lignes: lignes.map((l) => [l.libelle, entier(l.loyer), entier(l.charges), entier(l.total)]),
      total: [estQuittance ? "Total acquitté" : "Total versé", fcfa(total)],
    },
    { genre: "encadre", texte: `Arrêté à la somme de : ${montantEnLettres(total)}.` },
  ];

  if (d.mode_paiement) {
    blocs.push({
      genre: "champs",
      lignes: [
        ["Mode de paiement", d.mode_paiement],
        ["Date de l'encaissement", d.date_paiement ? dateLongue(d.date_paiement) : "—"],
      ],
    });
  }

  if (estQuittance) {
    blocs.push({
      genre: "paragraphe",
      texte:
        `Je soussigné(e) ${d.bailleur.nom}, bailleur, reconnais avoir reçu de ` +
        `${d.locataire?.nom ?? "—"}, locataire, la somme ci-dessus au titre du loyer et des charges ` +
        `de la période indiquée, dont quittance, sous réserve de tous mes droits.`,
    });
  } else {
    blocs.push({
      genre: "paragraphe",
      texte:
        `Je soussigné(e) ${d.bailleur.nom}, bailleur, reconnais avoir reçu de ` +
        `${d.locataire?.nom ?? "—"}, locataire, la somme ci-dessus à valoir sur le loyer et les charges ` +
        `de la période indiquée.`,
    });
    if ((d.reste ?? 0) > 0) {
      blocs.push({
        genre: "encadre",
        texte:
          `Ce versement ne solde pas la période : il reste ${fcfa(d.reste ?? 0)} à régler. ` +
          `Une quittance de loyer sera délivrée dès que la période sera intégralement soldée.`,
      });
    }
  }

  blocs.push({ genre: "signatures", gauche: "Le bailleur", droite: "" });
  return blocs;
}

// --------------------------------------------------------------- reçu caution

function blocsRecuCaution(d: DonneesFigees): Bloc[] {
  return [
    {
      genre: "champs",
      titre: "Logement concerné",
      lignes: [
        ["Désignation", d.logement?.designation ?? "—"],
        ["Adresse", d.logement?.adresse ?? "—"],
      ],
    },
    {
      genre: "champs",
      titre: "Versement",
      lignes: [
        ["Montant de la caution reçue", fcfa(d.montant ?? 0)],
        ["Mode de paiement", d.mode_paiement ?? "—"],
        ["Date", d.date_paiement ? dateLongue(d.date_paiement) : dateLongue(d.date)],
      ],
    },
    { genre: "encadre", texte: `Arrêté à la somme de : ${montantEnLettres(d.montant ?? 0)}.` },
    {
      genre: "paragraphe",
      texte:
        `Je soussigné(e) ${d.bailleur.nom}, bailleur, reconnais avoir reçu de ` +
        `${d.locataire?.nom ?? "—"} la somme ci-dessus à titre de dépôt de garantie pour le logement désigné. ` +
        `Les conditions de restitution de cette somme sont celles prévues au contrat de bail.`,
    },
    { genre: "paragraphe", texte: A_FOURNIR },
    { genre: "signatures", gauche: "Le bailleur", droite: "Le locataire" },
  ];
}

// ------------------------------------------------------------------ avis

function blocsAvis(d: DonneesFigees): Bloc[] {
  return [
    {
      genre: "paragraphe",
      texte:
        `Madame, Monsieur,\n\nJe vous informe que le loyer du logement désigné ci-dessous ` +
        `arrive à échéance le ${dateLongue(d.date_echeance ?? d.date)}.`,
    },
    {
      genre: "champs",
      titre: "Logement",
      lignes: [
        ["Désignation", d.logement?.designation ?? "—"],
        ["Adresse", d.logement?.adresse ?? "—"],
      ],
    },
    {
      genre: "tableau",
      titre: "Somme attendue",
      entetes: ["Période", "Loyer", "Charges", "Total"],
      lignes: (d.lignes ?? []).map((l) => [
        l.libelle,
        entier(l.loyer),
        entier(l.charges),
        entier(l.total),
      ]),
      total: ["Total à régler", fcfa(d.montant ?? 0)],
    },
    { genre: "encadre", texte: `Soit : ${montantEnLettres(d.montant ?? 0)}.` },
    { genre: "paragraphe", texte: "Je vous remercie de votre ponctualité." },
    { genre: "signatures", gauche: "Le bailleur", droite: "" },
  ];
}

// --------------------------------------------------------------- relance

function blocsRelance(d: DonneesFigees): Bloc[] {
  const grave = d.type === "mise_en_demeure";
  const blocs: Bloc[] = [
    {
      genre: "paragraphe",
      texte:
        `Madame, Monsieur,\n\n` +
        (grave
          ? `Malgré mes précédentes démarches, le loyer du logement désigné ci-dessous demeure impayé.`
          : `Sauf erreur de ma part, le loyer du logement désigné ci-dessous n'a pas été réglé à son échéance.`),
    },
    {
      genre: "champs",
      titre: "Logement",
      lignes: [
        ["Désignation", d.logement?.designation ?? "—"],
        ["Adresse", d.logement?.adresse ?? "—"],
      ],
    },
    {
      genre: "tableau",
      titre: "Somme restant due",
      entetes: ["Période", "Loyer", "Charges", "Reste dû"],
      lignes: (d.lignes ?? []).map((l) => [
        l.libelle,
        entier(l.loyer),
        entier(l.charges),
        entier(l.total),
      ]),
      total: ["Total dû", fcfa(d.montant ?? 0)],
    },
    {
      genre: "encadre",
      texte:
        `Soit ${montantEnLettres(d.montant ?? 0)}` +
        (d.jours_retard ? `, en retard depuis ${d.jours_retard} jour(s).` : "."),
    },
  ];

  if (grave) {
    blocs.push({
      genre: "paragraphe",
      texte:
        "La présente vaut mise en demeure de régler la somme ci-dessus. " +
        "Le délai accordé pour régulariser et les suites données à défaut de règlement sont " +
        "précisés ci-après.",
    });
    blocs.push({ genre: "paragraphe", texte: A_FOURNIR });
  } else {
    blocs.push({
      genre: "paragraphe",
      texte:
        "Je vous remercie de bien vouloir régulariser cette situation dans les meilleurs délais, " +
        "ou de me faire connaître vos difficultés éventuelles afin que nous trouvions une solution.",
    });
  }

  blocs.push({ genre: "signatures", gauche: "Le bailleur", droite: "" });
  return blocs;
}

// ------------------------------------------------------------------- bail

function blocsBail(d: DonneesFigees): Bloc[] {
  const modele = MODELES_DEFAUT[d.type];
  const b = d.bail;
  const remplacements: Record<string, string> = {
    "{{parties}}":
      `Entre les soussignés :\n\n` +
      `LE BAILLEUR : ${d.bailleur.nom}` +
      (d.bailleur.telephone ? `, téléphone ${afficherTelephone(d.bailleur.telephone)}` : "") +
      (d.bailleur.adresse ? `, demeurant à ${d.bailleur.adresse}` : "") +
      `.\n\n` +
      `LE LOCATAIRE : ${d.locataire?.nom ?? "—"}` +
      (d.locataire?.telephone ? `, téléphone ${afficherTelephone(d.locataire.telephone)}` : "") +
      (d.locataire?.piece ? `, ${d.locataire.piece}` : "") +
      `.`,
    "{{bien}}":
      `${d.logement?.designation ?? "—"}, situé ${d.logement?.adresse ?? "—"}` +
      (d.logement?.pieces ? `, comprenant ${d.logement.pieces} pièce(s)` : "") +
      (d.logement?.superficie ? `, d'une superficie approximative de ${d.logement.superficie} m²` : "") +
      (d.logement?.meuble ? ", loué meublé" : ", loué non meublé") +
      `.`,
    "{{duree}}": b
      ? `Le présent bail est consenti pour une durée de ${b.duree_mois} mois, ` +
        `à compter du ${dateLongue(b.date_debut)}` +
        (b.date_fin_prevue ? ` et jusqu'au ${dateLongue(b.date_fin_prevue)}` : "") +
        `.\n\n${A_FOURNIR}`
      : A_FOURNIR,
    "{{loyer}}": b
      ? `Le loyer est fixé à ${fcfa(b.loyer)} par mois` +
        (b.charges > 0 ? `, auquel s'ajoutent ${fcfa(b.charges)} de charges mensuelles` : "") +
        `, soit ${fcfa(b.loyer + b.charges)} au total.\n` +
        `Soit en toutes lettres : ${montantEnLettres(b.loyer + b.charges)}.`
      : A_FOURNIR,
    "{{paiement}}": b
      ? `Le loyer est payable ${b.periodicite === "trimestrielle" ? "par trimestre" : "mensuellement"}, ` +
        `le ${b.jour_echeance} de chaque période` +
        (b.mois_avance > 0 ? `, ${b.mois_avance} mois ayant été versés d'avance à l'entrée` : "") +
        `.\n\n${A_FOURNIR}`
      : A_FOURNIR,
    "{{caution}}": b
      ? (b.caution > 0
          ? `Un dépôt de garantie de ${fcfa(b.caution)} est versé par le locataire, ` +
            `soit ${montantEnLettres(b.caution)}.`
          : `Aucun dépôt de garantie n'est demandé.`) + `\n\n${A_FOURNIR}`
      : A_FOURNIR,
    "{{preavis}}": A_FOURNIR,
  };

  const articles = (d.articles ?? modele?.articles ?? []).map((a) => ({
    titre: a.titre,
    texte: remplacements[a.texte.trim()] ?? a.texte,
  }));

  return [
    { genre: "articles", articles },
    { genre: "espace", hauteur: 1 },
    {
      genre: "paragraphe",
      texte: `Fait en deux exemplaires originaux, un pour chaque partie.`,
    },
    { genre: "signatures", gauche: "Le bailleur", droite: "Le locataire" },
  ];
}

// ---------------------------------------------------------------- préavis

function blocsPreavis(d: DonneesFigees): Bloc[] {
  const parLocataire = d.type === "preavis";
  return [
    {
      genre: "paragraphe",
      texte: parLocataire
        ? `Madame, Monsieur,\n\nJe vous informe de ma décision de quitter le logement désigné ci-dessous.`
        : `Madame, Monsieur,\n\nJe vous notifie par la présente congé du logement désigné ci-dessous.`,
    },
    {
      genre: "champs",
      titre: "Logement",
      lignes: [
        ["Désignation", d.logement?.designation ?? "—"],
        ["Adresse", d.logement?.adresse ?? "—"],
        ["Bail en cours depuis le", d.bail ? dateLongue(d.bail.date_debut) : "—"],
      ],
    },
    {
      genre: "champs",
      titre: "Préavis",
      lignes: [
        ["Date de la notification", dateLongue(d.date)],
        ["Durée de préavis appliquée", `${d.duree_preavis_mois ?? "—"} mois`],
        ["Date de départ prévue", d.date_effet ? dateLongue(d.date_effet) : "—"],
      ],
    },
    ...(d.motif ? [{ genre: "paragraphe" as const, texte: `Motif : ${d.motif}` }] : []),
    { genre: "paragraphe", texte: A_FOURNIR },
    {
      genre: "signatures",
      gauche: parLocataire ? "Le locataire" : "Le bailleur",
      droite: parLocataire ? "Reçu par le bailleur, le" : "Reçu par le locataire, le",
    },
  ];
}

// -------------------------------------------------------- états des lieux

function blocsEtatDesLieux(d: DonneesFigees): Bloc[] {
  const blocs: Bloc[] = [
    {
      genre: "champs",
      titre: "Logement",
      lignes: [
        ["Désignation", d.logement?.designation ?? "—"],
        ["Adresse", d.logement?.adresse ?? "—"],
        ["Locataire", d.locataire?.nom ?? "—"],
        ["Date de l'état des lieux", dateLongue(d.date)],
      ],
    },
  ];

  if (d.comparaison && d.comparaison.length > 0) {
    blocs.push({
      genre: "tableau",
      titre: "Comparaison entrée / sortie",
      entetes: ["Pièce et élément", "À l'entrée", "À la sortie"],
      lignes: d.comparaison.map((c) => [`${c.piece} — ${c.element}`, c.entree, c.sortie]),
    });
  }

  for (const piece of d.pieces_edl ?? []) {
    blocs.push({
      genre: "tableau",
      titre: piece.nom,
      entetes: ["Élément", "État", "Observation"],
      lignes: piece.elements.map((e) => [e.libelle, e.etat, e.commentaire ?? ""]),
    });
  }

  if (d.releves && d.releves.length > 0) {
    blocs.push({
      genre: "champs",
      titre: "Relevés de compteurs",
      lignes: d.releves.map((r) => [r.type, r.valeur] as [string, string]),
    });
  }

  if (d.observations) {
    blocs.push({ genre: "paragraphe", texte: `Observations générales : ${d.observations}` });
  }

  blocs.push({ genre: "paragraphe", texte: A_FOURNIR });
  blocs.push({ genre: "signatures", gauche: "Le bailleur", droite: "Le locataire" });
  return blocs;
}

// ------------------------------------------------------ décompte caution

function blocsDecompte(d: DonneesFigees): Bloc[] {
  const retenues = d.retenues ?? [];
  const totalRetenues = retenues.reduce((s, r) => s + r.montant, 0);
  return [
    {
      genre: "champs",
      titre: "Logement",
      lignes: [
        ["Désignation", d.logement?.designation ?? "—"],
        ["Adresse", d.logement?.adresse ?? "—"],
        ["Locataire", d.locataire?.nom ?? "—"],
      ],
    },
    {
      genre: "champs",
      titre: "Dépôt de garantie",
      lignes: [["Caution versée à l'entrée", fcfa(d.montant ?? 0)]],
    },
    {
      genre: "tableau",
      titre: "Retenues",
      entetes: ["Motif de la retenue", "Montant"],
      lignes:
        retenues.length > 0
          ? retenues.map((r) => [r.libelle, entier(r.montant)])
          : [["Aucune retenue", "0"]],
      total: ["Total des retenues", fcfa(totalRetenues)],
    },
    {
      genre: "encadre",
      texte:
        `Somme restituée au locataire : ${fcfa(d.restitution ?? 0)}, ` +
        `soit ${montantEnLettres(d.restitution ?? 0)}.`,
    },
    { genre: "paragraphe", texte: A_FOURNIR },
    { genre: "signatures", gauche: "Le bailleur", droite: "Le locataire" },
  ];
}

// ----------------------------------------------------- articles génériques

function blocsArticles(d: DonneesFigees): Bloc[] {
  const modele = MODELES_DEFAUT[d.type];
  return [
    { genre: "articles", articles: d.articles ?? modele?.articles ?? [] },
    { genre: "signatures", gauche: "Le bailleur", droite: "" },
  ];
}
