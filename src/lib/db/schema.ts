/**
 * Schéma de la base de données de laloc.
 *
 * Le SQL est embarqué dans le code plutôt que lu depuis un fichier au démarrage :
 * un hébergement sans disque permanent ne garantit pas la présence des fichiers
 * source à côté du programme.
 *
 * Convention : montants = entiers en francs CFA. Dates métier = 'AAAA-MM-JJ'.
 * Horodatages = ISO complet. Identifiants = UUID fabriqués côté client.
 */
export const SCHEMA = `
-- laloc — schéma de la base de données
-- Convention : montants = entiers en francs CFA. Dates métier = 'AAAA-MM-JJ'.
-- Horodatages = ISO complet. Identifiants = UUID fabriqués côté client.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- PERSONNES

CREATE TABLE IF NOT EXISTS profils (
  id TEXT PRIMARY KEY,
  telephone TEXT NOT NULL UNIQUE,      -- E.164, ex. +237691234567 : l'identifiant de connexion
  email TEXT,                          -- optionnel, jamais bloquant
  nom TEXT NOT NULL,
  mot_de_passe TEXT,                   -- vide tant que l'invitation n'est pas activée
  code_recuperation_hash TEXT,
  langue TEXT NOT NULL DEFAULT 'fr',
  est_admin INTEGER NOT NULL DEFAULT 0,
  cree_le TEXT NOT NULL
);

-- Délégation à un proche ou une agence, révocable.
CREATE TABLE IF NOT EXISTS mandats (
  id TEXT PRIMARY KEY,
  bailleur_id TEXT NOT NULL REFERENCES profils(id),
  mandataire_id TEXT NOT NULL REFERENCES profils(id),
  portee TEXT NOT NULL DEFAULT 'tous',   -- 'tous' | 'selection'
  biens_json TEXT NOT NULL DEFAULT '[]',
  droits_json TEXT NOT NULL DEFAULT '[]',
  date_debut TEXT NOT NULL,
  date_fin TEXT,
  revoque_le TEXT,
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  proprietaire_id TEXT NOT NULL REFERENCES profils(id),
  telephone TEXT NOT NULL,
  role TEXT NOT NULL,                  -- 'locataire' | 'mandataire'
  cible_id TEXT,                       -- locataire.id ou mandat.id
  jeton_hash TEXT NOT NULL,
  expire_le TEXT NOT NULL,
  utilise_le TEXT,
  cree_le TEXT NOT NULL
);

-- --------------------------------------------------------------- PATRIMOINE

CREATE TABLE IF NOT EXISTS biens (
  id TEXT PRIMARY KEY,
  proprietaire_id TEXT NOT NULL REFERENCES profils(id),
  nom TEXT NOT NULL,
  type TEXT NOT NULL,                  -- maison, immeuble, appartement, studio, chambre, boutique, magasin, bureau
  usage TEXT NOT NULL DEFAULT 'habitation',  -- habitation | commercial
  -- Adressage camerounais : ni numéro, ni code postal
  ville TEXT NOT NULL,
  quartier TEXT,
  lieu_dit TEXT,
  point_repere TEXT,
  latitude REAL,
  longitude REAL,
  precisions_acces TEXT,
  date_acquisition TEXT,
  mode_charges TEXT NOT NULL DEFAULT 'incluses',
     -- incluses | forfait | compteur_individuel | compteur_commun | charge_directe
  charges_forfait INTEGER NOT NULL DEFAULT 0,
  photo TEXT,
  archive_le TEXT,
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS unites (
  id TEXT PRIMARY KEY,
  bien_id TEXT NOT NULL REFERENCES biens(id),
  libelle TEXT NOT NULL,
  etage TEXT,
  nb_pieces INTEGER,
  superficie INTEGER,
  meuble INTEGER NOT NULL DEFAULT 0,
  loyer_reference INTEGER NOT NULL DEFAULT 0,
  caution_reference INTEGER NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'libre',   -- libre | occupee | travaux | reservee
  unique_du_bien INTEGER NOT NULL DEFAULT 0, -- 1 = créée automatiquement, jamais montrée
  archive_le TEXT,
  cree_le TEXT NOT NULL
);

-- --------------------------------------------------------- LOCATAIRES, BAUX

CREATE TABLE IF NOT EXISTS locataires (
  id TEXT PRIMARY KEY,
  proprietaire_id TEXT NOT NULL REFERENCES profils(id),
  profil_id TEXT REFERENCES profils(id),   -- vide tant que l'accès n'est pas activé
  type TEXT NOT NULL DEFAULT 'particulier', -- particulier | entreprise
  nom TEXT NOT NULL,
  raison_sociale TEXT,
  rccm TEXT,
  telephone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  profession TEXT,
  employeur TEXT,
  type_piece TEXT,
  numero_piece TEXT,
  scan_piece TEXT,
  urgence_nom TEXT,
  urgence_telephone TEXT,
  garant_nom TEXT,
  garant_telephone TEXT,
  garant_piece TEXT,
  notes TEXT,
  archive_le TEXT,
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS baux (
  id TEXT PRIMARY KEY,
  proprietaire_id TEXT NOT NULL REFERENCES profils(id),
  unite_id TEXT NOT NULL REFERENCES unites(id),
  locataire_id TEXT NOT NULL REFERENCES locataires(id),
  date_debut TEXT NOT NULL,
  duree_mois INTEGER NOT NULL DEFAULT 12,
  date_fin_prevue TEXT,
  usage TEXT NOT NULL DEFAULT 'habitation',
  loyer_mensuel INTEGER NOT NULL,
  charges_mensuelles INTEGER NOT NULL DEFAULT 0,
  jour_echeance INTEGER NOT NULL DEFAULT 1,
  periodicite TEXT NOT NULL DEFAULT 'mensuelle',  -- mensuelle | trimestrielle
  montant_caution INTEGER NOT NULL DEFAULT 0,
  caution_versee INTEGER NOT NULL DEFAULT 0,
  mois_avance INTEGER NOT NULL DEFAULT 0,
  mode_paiement TEXT,
  statut TEXT NOT NULL DEFAULT 'actif',   -- projet | actif | preavis | termine | resilie
  origine TEXT NOT NULL DEFAULT 'application', -- application | papier_importe
  solde_ouverture INTEGER NOT NULL DEFAULT 0,  -- dette antérieure reprise
  document_bail TEXT,
  date_fin_reelle TEXT,
  motif_fin TEXT,
  archive_le TEXT,
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bail_locataires (
  bail_id TEXT NOT NULL REFERENCES baux(id),
  locataire_id TEXT NOT NULL REFERENCES locataires(id),
  titulaire_principal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bail_id, locataire_id)
);

CREATE TABLE IF NOT EXISTS revisions_loyer (
  id TEXT PRIMARY KEY,
  bail_id TEXT NOT NULL REFERENCES baux(id),
  date_effet TEXT NOT NULL,
  ancien_loyer INTEGER NOT NULL,
  nouveau_loyer INTEGER NOT NULL,
  motif TEXT,
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS preavis (
  id TEXT PRIMARY KEY,
  bail_id TEXT NOT NULL REFERENCES baux(id),
  origine TEXT NOT NULL,               -- locataire | bailleur
  date_depot TEXT NOT NULL,
  date_effet TEXT NOT NULL,
  duree_preavis_mois INTEGER NOT NULL,
  motif TEXT,
  statut TEXT NOT NULL DEFAULT 'depose', -- depose | accepte | conteste | clos
  document_id TEXT,
  cree_le TEXT NOT NULL
);

-- ------------------------------------------------------------------ ARGENT

CREATE TABLE IF NOT EXISTS echeances (
  id TEXT PRIMARY KEY,
  bail_id TEXT NOT NULL REFERENCES baux(id),
  periode_debut TEXT NOT NULL,
  periode_fin TEXT NOT NULL,
  libelle TEXT NOT NULL,
  date_echeance TEXT NOT NULL,
  montant_loyer INTEGER NOT NULL,
  montant_charges INTEGER NOT NULL DEFAULT 0,
  montant_attendu INTEGER NOT NULL,
  cree_le TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_echeances_bail ON echeances(bail_id, date_echeance);

-- Un paiement se rattache AU BAIL, jamais à une échéance :
-- c'est ce qui rend possible l'avance de six mois ou d'un an.
CREATE TABLE IF NOT EXISTS paiements (
  id TEXT PRIMARY KEY,
  proprietaire_id TEXT NOT NULL REFERENCES profils(id),
  bail_id TEXT NOT NULL REFERENCES baux(id),
  montant INTEGER NOT NULL,
  date_encaissement TEXT NOT NULL,
  mode TEXT NOT NULL,                  -- especes | mtn_momo | orange_money | virement | cheque
  reference TEXT,
  encaisse_par TEXT NOT NULL REFERENCES profils(id),
  commentaire TEXT,
  photo_recu TEXT,
  cle_idempotence TEXT NOT NULL UNIQUE, -- empêche le doublon quand le réseau coupe
  statut TEXT NOT NULL DEFAULT 'enregistre',
  motif_annulation TEXT,
  cree_le TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_paiements_bail ON paiements(bail_id, date_encaissement);

-- La table charnière : « telle partie de tel paiement paie telle échéance »
CREATE TABLE IF NOT EXISTS imputations (
  id TEXT PRIMARY KEY,
  paiement_id TEXT NOT NULL REFERENCES paiements(id),
  echeance_id TEXT NOT NULL REFERENCES echeances(id),
  montant INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_imputations_echeance ON imputations(echeance_id);
CREATE INDEX IF NOT EXISTS idx_imputations_paiement ON imputations(paiement_id);

-- ----------------------------------------------------------------- CHARGES

CREATE TABLE IF NOT EXISTS compteurs (
  id TEXT PRIMARY KEY,
  proprietaire_id TEXT NOT NULL REFERENCES profils(id),
  bien_id TEXT NOT NULL REFERENCES biens(id),
  unite_id TEXT REFERENCES unites(id),  -- vide = compteur commun au bien
  type TEXT NOT NULL,                   -- eau | electricite | autre
  numero TEXT,
  portee TEXT NOT NULL DEFAULT 'individuel', -- individuel | commun
  unite_mesure TEXT NOT NULL DEFAULT 'kWh',
  tarif_unitaire INTEGER NOT NULL DEFAULT 0,
  actif INTEGER NOT NULL DEFAULT 1,
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS releves (
  id TEXT PRIMARY KEY,
  compteur_id TEXT NOT NULL REFERENCES compteurs(id),
  bail_id TEXT REFERENCES baux(id),
  date_releve TEXT NOT NULL,
  index_releve INTEGER NOT NULL,
  index_precedent INTEGER,
  consommation INTEGER,
  tarif_applique INTEGER,
  montant INTEGER,
  photo TEXT,
  releve_par TEXT REFERENCES profils(id),
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS factures_communes (
  id TEXT PRIMARY KEY,
  compteur_id TEXT NOT NULL REFERENCES compteurs(id),
  periode_debut TEXT NOT NULL,
  periode_fin TEXT NOT NULL,
  montant INTEGER NOT NULL,
  justificatif TEXT,
  cle_repartition TEXT NOT NULL,       -- parts_egales | nb_occupants | pourcentages
  details_json TEXT NOT NULL DEFAULT '{}',
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS charges_locataire (
  id TEXT PRIMARY KEY,
  bail_id TEXT NOT NULL REFERENCES baux(id),
  echeance_id TEXT REFERENCES echeances(id),
  periode TEXT NOT NULL,
  montant INTEGER NOT NULL,
  origine TEXT NOT NULL,               -- forfait | releve | repartition
  detail TEXT,
  cree_le TEXT NOT NULL
);

-- --------------------------------------------------------------- DOCUMENTS

CREATE TABLE IF NOT EXISTS modeles_document (
  id TEXT PRIMARY KEY,
  proprietaire_id TEXT REFERENCES profils(id),  -- vide = modèle par défaut de la plateforme
  type TEXT NOT NULL,
  langue TEXT NOT NULL DEFAULT 'fr',
  titre TEXT NOT NULL,
  contenu_json TEXT NOT NULL,          -- [{ titre, texte }] : articles modifiables un par un
  version INTEGER NOT NULL DEFAULT 1,
  actif INTEGER NOT NULL DEFAULT 1,
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents_emis (
  id TEXT PRIMARY KEY,
  proprietaire_id TEXT NOT NULL REFERENCES profils(id),
  type TEXT NOT NULL,
  numero TEXT NOT NULL,
  annee INTEGER NOT NULL,
  bail_id TEXT REFERENCES baux(id),
  locataire_id TEXT REFERENCES locataires(id),
  bien_id TEXT REFERENCES biens(id),
  donnees_json TEXT NOT NULL,          -- données FIGÉES au moment de l'émission
  modele_id TEXT,
  modele_version INTEGER,
  chemin_pdf TEXT,
  hash TEXT,
  emis_le TEXT NOT NULL,
  emis_par TEXT NOT NULL REFERENCES profils(id),
  statut TEXT NOT NULL DEFAULT 'emis', -- emis | annule
  annule_par_id TEXT,
  motif_annulation TEXT
);
CREATE INDEX IF NOT EXISTS idx_documents_bail ON documents_emis(bail_id);

CREATE TABLE IF NOT EXISTS documents_echeances (
  document_id TEXT NOT NULL REFERENCES documents_emis(id),
  echeance_id TEXT NOT NULL REFERENCES echeances(id),
  PRIMARY KEY (document_id, echeance_id)
);

-- Numérotation continue, par bailleur et par année
CREATE TABLE IF NOT EXISTS compteurs_numerotation (
  proprietaire_id TEXT NOT NULL,
  type TEXT NOT NULL,
  annee INTEGER NOT NULL,
  dernier INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (proprietaire_id, type, annee)
);

CREATE TABLE IF NOT EXISTS signatures (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents_emis(id),
  signataire_nom TEXT NOT NULL,
  signataire_telephone TEXT,
  qualite TEXT NOT NULL,               -- bailleur | mandataire | locataire | temoin
  image TEXT,                          -- signature dessinée au doigt (image encodée)
  horodatage TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  code_hash TEXT,                      -- code de confirmation à usage unique
  code_verifie_le TEXT,
  hash_avant TEXT,
  hash_apres TEXT,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  cree_le TEXT NOT NULL
);

-- ---------------------------------------------------------- ÉTATS DES LIEUX

CREATE TABLE IF NOT EXISTS etats_des_lieux (
  id TEXT PRIMARY KEY,
  proprietaire_id TEXT NOT NULL REFERENCES profils(id),
  bail_id TEXT NOT NULL REFERENCES baux(id),
  type TEXT NOT NULL,                  -- entree | sortie
  date TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'brouillon', -- brouillon | signe
  releve_electricite TEXT,
  releve_eau TEXT,
  observations TEXT,
  signature_bailleur TEXT,
  signature_locataire TEXT,
  signe_le TEXT,
  document_id TEXT REFERENCES documents_emis(id),
  edl_entree_id TEXT REFERENCES etats_des_lieux(id),
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS edl_pieces (
  id TEXT PRIMARY KEY,
  edl_id TEXT NOT NULL REFERENCES etats_des_lieux(id),
  nom TEXT NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS edl_elements (
  id TEXT PRIMARY KEY,
  piece_id TEXT NOT NULL REFERENCES edl_pieces(id),
  libelle TEXT NOT NULL,
  etat TEXT,                           -- neuf | bon | moyen | mauvais
  commentaire TEXT,
  ordre INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS edl_photos (
  id TEXT PRIMARY KEY,
  edl_id TEXT NOT NULL REFERENCES etats_des_lieux(id),
  piece_id TEXT REFERENCES edl_pieces(id),
  element_id TEXT REFERENCES edl_elements(id),
  fichier TEXT NOT NULL,
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS retenues_caution (
  id TEXT PRIMARY KEY,
  bail_id TEXT NOT NULL REFERENCES baux(id),
  edl_id TEXT REFERENCES etats_des_lieux(id),
  libelle TEXT NOT NULL,
  montant INTEGER NOT NULL,
  justificatif TEXT,
  cree_le TEXT NOT NULL
);

-- ------------------------------------------------------------------- DIVERS

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  proprietaire_id TEXT NOT NULL REFERENCES profils(id),
  bail_id TEXT REFERENCES baux(id),
  unite_id TEXT REFERENCES unites(id),
  titre TEXT NOT NULL,
  description TEXT,
  priorite TEXT NOT NULL DEFAULT 'normale',
  statut TEXT NOT NULL DEFAULT 'ouvert',
  signale_par TEXT REFERENCES profils(id),
  prestataire TEXT,
  cout INTEGER,
  resolu_le TEXT,
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS incident_photos (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL REFERENCES incidents(id),
  fichier TEXT NOT NULL,
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fichiers (
  id TEXT PRIMARY KEY,
  proprietaire_id TEXT NOT NULL REFERENCES profils(id),
  rattachement_type TEXT NOT NULL,     -- bien | unite | locataire | bail | incident | edl
  rattachement_id TEXT NOT NULL,
  type TEXT NOT NULL,
  nom TEXT NOT NULL,
  chemin TEXT NOT NULL,
  taille INTEGER,
  format TEXT,
  hash TEXT,
  televerse_par TEXT REFERENCES profils(id),
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS modeles_message (
  id TEXT PRIMARY KEY,
  proprietaire_id TEXT REFERENCES profils(id),
  code TEXT NOT NULL,                  -- avis_echeance | rappel | relance | mise_en_demeure
  langue TEXT NOT NULL DEFAULT 'fr',
  objet TEXT,
  corps TEXT NOT NULL,
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relances (
  id TEXT PRIMARY KEY,
  proprietaire_id TEXT NOT NULL REFERENCES profils(id),
  bail_id TEXT NOT NULL REFERENCES baux(id),
  echeance_id TEXT REFERENCES echeances(id),
  nature TEXT NOT NULL,
  canal TEXT NOT NULL,                 -- whatsapp | email | appel
  message TEXT NOT NULL,
  date_preparation TEXT NOT NULL,
  date_envoi TEXT,
  statut TEXT NOT NULL DEFAULT 'prete', -- prete | envoyee | ignoree
  envoye_par TEXT REFERENCES profils(id),
  cree_le TEXT NOT NULL
);

-- Les paramètres juridiques : JAMAIS de valeur codée en dur dans l'application
CREATE TABLE IF NOT EXISTS parametres (
  proprietaire_id TEXT PRIMARY KEY REFERENCES profils(id),
  raison_sociale TEXT,
  ville TEXT,
  quartier TEXT,
  telephone TEXT,
  email TEXT,
  numero_contribuable TEXT,
  logo TEXT,
  signature_scannee TEXT,
  preavis_locataire_mois INTEGER NOT NULL DEFAULT 1,
  preavis_bailleur_mois INTEGER NOT NULL DEFAULT 3,
  mois_caution_defaut INTEGER NOT NULL DEFAULT 2,
  mois_avance_defaut INTEGER NOT NULL DEFAULT 6,
  delai_restitution_caution_jours INTEGER NOT NULL DEFAULT 60,
  jours_rappel_avant_echeance INTEGER NOT NULL DEFAULT 3,
  jours_avant_relance_retard INTEGER NOT NULL DEFAULT 5,
  mention_legale_documents TEXT,
  langue TEXT NOT NULL DEFAULT 'fr',
  maj_le TEXT
);

-- Trace immuable : indispensable dès qu'un mandataire encaisse à la place du bailleur
CREATE TABLE IF NOT EXISTS journal_audit (
  id TEXT PRIMARY KEY,
  proprietaire_id TEXT,
  table_nom TEXT NOT NULL,
  enregistrement_id TEXT,
  action TEXT NOT NULL,                -- creation | modification | suppression
  resume TEXT,
  avant TEXT,
  apres TEXT,
  utilisateur_id TEXT,
  utilisateur_nom TEXT,
  cree_le TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_proprio ON journal_audit(proprietaire_id, cree_le DESC);
`;
