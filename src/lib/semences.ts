import { db, nouvelId, maintenant } from "@/lib/db";
import { hacher } from "@/lib/auth";
import { genererEcheancier } from "@/lib/domain/echeancier";
import { imputerPaiement } from "@/lib/domain/imputation";
import { ajouterMois, aujourdhui } from "@/lib/format";
import { MESSAGES_DEFAUT } from "@/lib/pdf/modeles-defaut";

export const DEMO_TELEPHONE = "+237691234567";
export const DEMO_MOT_DE_PASSE = "demo1234";
/** Un locataire de démonstration, pour pouvoir visiter aussi l'espace locataire. */
export const DEMO_LOCATAIRE_TELEPHONE = "+237677445566";

/**
 * Jeu de démonstration.
 *
 * Volontairement réaliste : un bailleur camerounais avec un petit immeuble, une maison,
 * une boutique, et des situations qu'on rencontre vraiment — un locataire qui a payé
 * un an d'avance, un qui paie en deux fois, un en retard depuis deux mois, un logement
 * libre. C'est sur ces cas-là qu'on juge si l'outil tient debout.
 */
export async function semerDemonstration(): Promise<string> {
  const base = db();
  const existant = base
    .prepare(`SELECT id FROM profils WHERE telephone = ?`)
    .get(DEMO_TELEPHONE) as any;
  if (existant) return existant.id;

  const bailleurId = nouvelId();
  const mdp = await hacher(DEMO_MOT_DE_PASSE);
  const now = maintenant();
  const today = aujourdhui();

  base
    .prepare(
      `INSERT INTO profils (id, telephone, email, nom, mot_de_passe, langue, est_admin, cree_le)
       VALUES (?,?,?,?,?,'fr',0,?)`,
    )
    .run(bailleurId, DEMO_TELEPHONE, "achille.mbarga@example.cm", "Achille Mbarga", mdp, now);

  base
    .prepare(
      `INSERT INTO parametres (proprietaire_id, raison_sociale, ville, quartier, telephone, email,
        numero_contribuable, preavis_locataire_mois, preavis_bailleur_mois, mois_caution_defaut,
        mois_avance_defaut, mention_legale_documents, maj_le)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      bailleurId,
      "Achille Mbarga",
      "Douala",
      "Makepe",
      DEMO_TELEPHONE,
      "achille.mbarga@example.cm",
      "P0123456789A",
      1,
      3,
      2,
      6,
      "Modèle indicatif. À faire valider par un conseil juridique avant usage.",
      now,
    );

  for (const m of MESSAGES_DEFAUT) {
    base
      .prepare(
        `INSERT INTO modeles_message (id, proprietaire_id, code, langue, objet, corps, cree_le)
         VALUES (?,?,?,?,?,?,?)`,
      )
      .run(nouvelId(), bailleurId, m.code, m.langue, m.objet, m.corps, now);
  }

  // ---------------------------------------------------------------- les biens
  const immeubleId = nouvelId();
  base
    .prepare(
      `INSERT INTO biens (id, proprietaire_id, nom, type, usage, ville, quartier, point_repere,
        precisions_acces, date_acquisition, mode_charges, charges_forfait, cree_le)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      immeubleId,
      bailleurId,
      "Immeuble Makepe",
      "immeuble",
      "habitation",
      "Douala",
      "Makepe",
      "Carrefour Makepe Missoké, après la pharmacie",
      "Portail vert, montée à droite",
      "2019-03-15",
      "forfait",
      5000,
      now,
    );

  const maisonId = nouvelId();
  base
    .prepare(
      `INSERT INTO biens (id, proprietaire_id, nom, type, usage, ville, quartier, point_repere,
        date_acquisition, mode_charges, charges_forfait, cree_le)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      maisonId,
      bailleurId,
      "Maison Bonamoussadi",
      "maison",
      "habitation",
      "Douala",
      "Bonamoussadi",
      "Descente Total Bonamoussadi, deuxième rue",
      "2021-08-01",
      "compteur_individuel",
      0,
      now,
    );

  const boutiqueId = nouvelId();
  base
    .prepare(
      `INSERT INTO biens (id, proprietaire_id, nom, type, usage, ville, quartier, point_repere,
        mode_charges, charges_forfait, cree_le)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      boutiqueId,
      bailleurId,
      "Boutique Akwa",
      "boutique",
      "commercial",
      "Douala",
      "Akwa",
      "Rue Joss, en face de la boulangerie",
      "charge_directe",
      0,
      now,
    );

  const unite = (bienId: string, libelle: string, loyer: number, caution: number, unique = 0) => {
    const id = nouvelId();
    base
      .prepare(
        `INSERT INTO unites (id, bien_id, libelle, nb_pieces, superficie, meuble,
          loyer_reference, caution_reference, statut, unique_du_bien, cree_le)
         VALUES (?,?,?,?,?,0,?,?,'libre',?,?)`,
      )
      .run(id, bienId, libelle, 2, 35, loyer, caution, unique, now);
    return id;
  };

  const studioA1 = unite(immeubleId, "Studio A1", 60000, 120000);
  const studioA2 = unite(immeubleId, "Studio A2", 60000, 120000);
  const studioA3 = unite(immeubleId, "Studio A3", 65000, 130000);
  const maisonUnite = unite(maisonId, "Maison Bonamoussadi", 150000, 300000, 1);
  const boutiqueUnite = unite(boutiqueId, "Boutique Akwa", 200000, 400000, 1);

  // Compteur individuel sur la maison
  const compteurId = nouvelId();
  base
    .prepare(
      `INSERT INTO compteurs (id, proprietaire_id, bien_id, unite_id, type, numero, portee,
        unite_mesure, tarif_unitaire, actif, cree_le)
       VALUES (?,?,?,?,'electricite',?,'individuel','kWh',?,1,?)`,
    )
    .run(compteurId, bailleurId, maisonId, maisonUnite, "ENEO-4471203", 99, now);

  // ----------------------------------------------------------- les locataires
  const locataire = (
    nom: string,
    tel: string,
    profession: string,
    type = "particulier",
    extra: Record<string, string> = {},
  ) => {
    const id = nouvelId();
    base
      .prepare(
        `INSERT INTO locataires (id, proprietaire_id, type, nom, raison_sociale, rccm, telephone,
          whatsapp, email, profession, employeur, type_piece, numero_piece, garant_nom,
          garant_telephone, cree_le)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id,
        bailleurId,
        type,
        nom,
        extra.raison_sociale ?? null,
        extra.rccm ?? null,
        tel,
        tel,
        extra.email ?? null,
        profession,
        extra.employeur ?? null,
        "Carte nationale d'identité",
        extra.piece ?? null,
        extra.garant_nom ?? null,
        extra.garant_telephone ?? null,
        now,
      );
    return id;
  };

  const marie = locataire("Marie Ngo Bell", "+237677445566", "Enseignante", "particulier", {
    piece: "110234567",
    employeur: "Lycée de Makepe",
    garant_nom: "Paul Ngo Bell",
    garant_telephone: "+237699887766",
  });
  const jean = locataire("Jean-Pierre Fotso", "+237655112233", "Commerçant", "particulier", {
    piece: "108765432",
  });
  const aicha = locataire("Aïcha Bouba", "+237694556677", "Infirmière", "particulier", {
    piece: "112233445",
    employeur: "Hôpital Laquintinie",
  });
  const sarl = locataire("Ets Nkolo & Frères", "+237233421100", "Commerce général", "entreprise", {
    raison_sociale: "Ets Nkolo & Frères SARL",
    rccm: "RC/DLA/2020/B/1234",
    email: "contact@nkolo.example.cm",
  });

  // ------------------------------------------------------------------ les baux
  const creerBail = (opts: {
    uniteId: string;
    locataireId: string;
    debut: string;
    duree: number;
    loyer: number;
    charges: number;
    caution: number;
    cautionVersee: number;
    moisAvance: number;
    usage?: string;
    origine?: string;
    soldeOuverture?: number;
  }) => {
    const id = nouvelId();
    base
      .prepare(
        `INSERT INTO baux (id, proprietaire_id, unite_id, locataire_id, date_debut, duree_mois,
          date_fin_prevue, usage, loyer_mensuel, charges_mensuelles, jour_echeance, periodicite,
          montant_caution, caution_versee, mois_avance, mode_paiement, statut, origine,
          solde_ouverture, cree_le)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,'mensuelle',?,?,?,?,'actif',?,?,?)`,
      )
      .run(
        id,
        bailleurId,
        opts.uniteId,
        opts.locataireId,
        opts.debut,
        opts.duree,
        ajouterMois(opts.debut, opts.duree),
        opts.usage ?? "habitation",
        opts.loyer,
        opts.charges,
        Number(opts.debut.slice(8, 10)),
        opts.caution,
        opts.cautionVersee,
        opts.moisAvance,
        "mtn_momo",
        opts.origine ?? "application",
        opts.soldeOuverture ?? 0,
        now,
      );
    base
      .prepare(`INSERT INTO bail_locataires (bail_id, locataire_id, titulaire_principal) VALUES (?,?,1)`)
      .run(id, opts.locataireId);

    for (const l of genererEcheancier({
      date_debut: opts.debut,
      duree_mois: opts.duree,
      loyer_mensuel: opts.loyer,
      charges_mensuelles: opts.charges,
      jour_echeance: Number(opts.debut.slice(8, 10)),
      periodicite: "mensuelle",
    })) {
      base
        .prepare(
          `INSERT INTO echeances (id, bail_id, periode_debut, periode_fin, libelle, date_echeance,
            montant_loyer, montant_charges, montant_attendu, cree_le)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          nouvelId(),
          id,
          l.periode_debut,
          l.periode_fin,
          l.libelle,
          l.date_echeance,
          l.montant_loyer,
          l.montant_charges,
          l.montant_attendu,
          now,
        );
    }
    base.prepare(`UPDATE unites SET statut = 'occupee' WHERE id = ?`).run(opts.uniteId);
    return id;
  };

  const payer = (bailId: string, montant: number, date: string, mode: string, commentaire?: string) => {
    const id = nouvelId();
    base
      .prepare(
        `INSERT INTO paiements (id, proprietaire_id, bail_id, montant, date_encaissement, mode,
          reference, encaisse_par, commentaire, cle_idempotence, statut, cree_le)
         VALUES (?,?,?,?,?,?,?,?,?,?,'enregistre',?)`,
      )
      .run(
        id,
        bailleurId,
        bailId,
        montant,
        date,
        mode,
        mode === "mtn_momo" ? "MP" + Math.floor(Math.random() * 1e9) : null,
        bailleurId,
        commentaire ?? null,
        nouvelId(),
        now,
      );
    imputerPaiement(id, bailId, montant);
    return id;
  };

  const ilYA = (mois: number) => ajouterMois(today.slice(0, 8) + "01", -mois);

  // Marie : a payé un an d'avance à l'entrée. Le cas le plus courant au Cameroun.
  const bailMarie = creerBail({
    uniteId: studioA1,
    locataireId: marie,
    debut: ilYA(4),
    duree: 24,
    loyer: 60000,
    charges: 5000,
    caution: 120000,
    cautionVersee: 120000,
    moisAvance: 12,
  });
  payer(bailMarie, 780000, ilYA(4), "mtn_momo", "12 mois payés d'avance à l'entrée");

  // Jean-Pierre : paie en deux fois chaque mois, et il est en retard de deux mois.
  const bailJean = creerBail({
    uniteId: studioA2,
    locataireId: jean,
    debut: ilYA(8),
    duree: 12,
    loyer: 60000,
    charges: 5000,
    caution: 120000,
    cautionVersee: 60000,
    moisAvance: 0,
    origine: "papier_importe",
    soldeOuverture: 0,
  });
  for (let i = 8; i >= 3; i--) payer(bailJean, 65000, ilYA(i), "especes");
  payer(bailJean, 40000, ilYA(2), "especes", "Paiement partiel, solde promis");

  // Aïcha : à jour, paiements réguliers par Orange Money.
  const bailAicha = creerBail({
    uniteId: maisonUnite,
    locataireId: aicha,
    debut: ilYA(6),
    duree: 12,
    loyer: 150000,
    charges: 0,
    caution: 300000,
    cautionVersee: 300000,
    moisAvance: 3,
  });
  payer(bailAicha, 450000, ilYA(6), "orange_money", "3 mois d'avance à l'entrée");
  for (let i = 3; i >= 0; i--) payer(bailAicha, 150000, ilYA(i), "orange_money");

  // La boutique : bail commercial, trimestriel dans les faits, à jour.
  const bailBoutique = creerBail({
    uniteId: boutiqueUnite,
    locataireId: sarl,
    debut: ilYA(5),
    duree: 36,
    loyer: 200000,
    charges: 0,
    caution: 400000,
    cautionVersee: 400000,
    moisAvance: 6,
    usage: "commercial",
  });
  payer(bailBoutique, 1200000, ilYA(5), "virement", "6 mois d'avance");

  // Le studio A3 reste libre : il faut aussi voir un logement vide dans la démonstration.
  void studioA3;

  // Un relevé de compteur sur la maison
  base
    .prepare(
      `INSERT INTO releves (id, compteur_id, bail_id, date_releve, index_releve, index_precedent,
        consommation, tarif_applique, montant, releve_par, cree_le)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(nouvelId(), compteurId, bailAicha, ilYA(1), 4820, 4655, 165, 99, 16335, bailleurId, now);

  // Marie a activé son accès : on peut donc visiter aussi l'espace locataire.
  const profilMarieId = nouvelId();
  base
    .prepare(
      `INSERT INTO profils (id, telephone, nom, mot_de_passe, langue, est_admin, cree_le)
       VALUES (?,?,?,?,'fr',0,?)`,
    )
    .run(profilMarieId, DEMO_LOCATAIRE_TELEPHONE, "Marie Ngo Bell", mdp, now);
  base.prepare(`UPDATE locataires SET profil_id = ? WHERE id = ?`).run(profilMarieId, marie);

  // Un incident signalé
  base
    .prepare(
      `INSERT INTO incidents (id, proprietaire_id, bail_id, unite_id, titre, description,
        priorite, statut, signale_par, cree_le)
       VALUES (?,?,?,?,?,?,'haute','ouvert',?,?)`,
    )
    .run(
      nouvelId(),
      bailleurId,
      bailJean,
      studioA2,
      "Fuite d'eau dans la douche",
      "Le robinet de la douche fuit depuis trois jours, il y a de l'eau au sol.",
      bailleurId,
      now,
    );

  return bailleurId;
}
