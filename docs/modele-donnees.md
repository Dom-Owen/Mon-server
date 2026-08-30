# Modèle de données — plateforme de gestion locative (Cameroun)

Version 1 — proposition soumise à validation. Aucun SQL ici : c'est volontaire,
on décrit **ce que l'on stocke**, pas encore **comment**.

---

## Conventions valables pour toutes les tables

Ces règles sont ennuyeuses mais ce sont elles qui évitent de tout refaire dans six mois.

- **Identifiant** : chaque ligne a un identifiant unique (UUID) **généré par le téléphone**,
  pas par la base de données. C'est la condition pour pouvoir saisir hors ligne :
  le téléphone doit pouvoir créer un paiement sans demander la permission au serveur.
- **Cloisonnement** : chaque ligne porte l'identifiant de son organisation. C'est ce qui
  permet à la règle de sécurité de la base (RLS) de dire simplement « tu ne vois que
  les lignes de ton organisation ». Sans ce champ répété partout, les règles deviennent
  lentes et fragiles.
- **Traçabilité** : créé le / créé par / modifié le / modifié par / archivé le.
- **On n'efface jamais** : on archive. Une donnée effacée est une preuve perdue.
- **Montants** : nombres entiers, en francs CFA. Pas de virgule, jamais. 150000 s'affiche
  « 150 000 FCFA ».
- **Dates métier** (échéance, encaissement) : type date simple, sans heure — sinon on se
  retrouve avec un loyer daté du 31 juillet 23h qui s'affiche 1er août.
- **Horodatages techniques** : stockés en temps universel, affichés en heure de Douala.
- **Téléphones** : stockés au format international `+2376XXXXXXXX`, affichés `+237 6XX XX XX XX`.

---

## 1. Le compte et les personnes

### ORGANISATIONS
Le compte du propriétaire. Tout appartient à une organisation.
Nom, forme (particulier ou société), ville, téléphone, WhatsApp, email, logo,
adresse à faire figurer sur les quittances, numéro de contribuable (NIU), RCCM si société,
image de la signature scannée du bailleur, plan d'abonnement, nombre d'unités incluses.

> Les deux derniers champs servent à mesurer dès le premier jour ce que coûte et
> ce que rapporte un client. C'est gratuit maintenant, pénible plus tard.

### PARAMETRES_ORGANISATION
Une ligne par organisation. **Tout ce qui touche au droit ou à la fiscalité vit ici**,
jamais dans le code, comme tu l'as demandé.
Langue par défaut, durée de préavis en mois, nombre de mois de caution autorisé,
mentions légales de la quittance, mentions légales du contrat de bail, format des numéros
de quittance et de reçu, taux de retenue fiscale, délai de relance avant échéance,
relances actives ou non.

### PROFILS
La fiche d'un utilisateur connecté : nom, téléphone, WhatsApp, email, langue préférée, photo.

### MEMBRES
Rattache un utilisateur à une organisation.
Rôle (propriétaire, gérant, lecteur), autorisation de voir les totaux financiers globaux
(oui/non, décidé par le propriétaire), statut (invité, actif, révoqué), invité le, invité par.

### MEMBRE_BIENS
Si le propriétaire veut limiter un intendant à un seul immeuble : la liste des biens
qu'il a le droit de voir. Vide = accès à tous les biens.

### INVITATIONS
Organisation, rôle proposé, canal (WhatsApp ou email), destinataire, jeton d'invitation
(stocké chiffré), date d'expiration, date d'utilisation.

---

## 2. Le patrimoine

### BIENS
Un immeuble ou une maison.
Nom usuel, type, ville, quartier, description de l'accès (« après la pharmacie du carrefour »),
coordonnées GPS optionnelles, photo, date d'acquisition, valeur d'acquisition (optionnelle,
sert au calcul de rendement), archivé le.

### UNITES
Le lot effectivement loué.
Bien rattaché, libellé (« Studio A3 »), type (studio, chambre, appartement, duplex,
boutique, magasin, bureau), étage, nombre de pièces, surface approximative,
loyer de référence, charges de référence, statut (libre, occupée, en travaux, réservée),
numéro de compteur électrique, numéro de compteur eau, archivée le.

> Le « loyer de référence » est le prix affiché du bien. Le loyer réellement payé vit
> sur le bail : deux locataires du même studio peuvent payer deux prix différents.

---

## 3. Les locataires et les contrats

### LOCATAIRES
Type (particulier ou entreprise — indispensable puisque tu loues des boutiques et des bureaux).
Pour un particulier : nom complet, profession, employeur.
Pour une entreprise : raison sociale, RCCM, NIU.
Dans les deux cas : téléphone, WhatsApp, email, type et numéro de pièce d'identité,
photo de la pièce, contact d'urgence (nom, téléphone, lien), garant (nom, téléphone,
type et numéro de pièce, photo), notes libres, archivé le.

### BAUX
Le contrat qui lie un ou plusieurs locataires à une unité.
Unité, date de début, durée en mois, date de fin prévue, loyer mensuel, charges mensuelles,
charges forfaitaires ou réelles, jour d'échéance dans le mois, périodicité (mensuelle,
trimestrielle, annuelle), montant de la caution, nombre de mois de caution,
caution effectivement versée, avance versée et nombre de mois d'avance,
mode de paiement habituel, statut (actif, terminé, résilié, en préavis),
document du contrat signé, date et motif de résiliation,
**solde d'ouverture** (voir ci-dessous), archivé le.

> **Solde d'ouverture** : le champ que tout le monde oublie. Tes utilisateurs ont déjà
> des baux en cours au moment où ils installent l'application, souvent avec des arriérés.
> Sans ce champ, la vue « Impayés » est fausse dès le premier jour et l'outil perd sa
> crédibilité en une minute.

**Règles** : une unité n'a qu'un seul bail actif à la fois ; un locataire peut avoir
plusieurs baux successifs et plusieurs baux en parallèle.

### BAIL_LOCATAIRES
Le lien entre un bail et ses locataires, avec un indicateur « titulaire principal ».
Permet la colocation et le bail au nom d'un couple, très fréquents.

### REVISIONS_LOYER
Bail, date d'effet, ancien loyer, nouveau loyer, anciennes et nouvelles charges, motif, document.

> Sans cet historique, augmenter un loyer réécrit le passé et fausse toutes les
> quittances déjà émises.

---

## 4. L'argent — la partie la plus délicate

### ECHEANCES
Une ligne par période due, générée automatiquement à la création du bail.
Bail, début et fin de période, libellé (« Loyer août 2026 »), date d'échéance,
montant du loyer, montant des charges, montant total attendu, montant déjà imputé.

Le **statut** (à venir, due, partiellement payée, soldée, en retard) et le **nombre de
jours de retard** sont *calculés*, pas stockés. Sinon il faut un robot qui repasse
chaque nuit changer les statuts, et le jour où il tombe en panne l'application ment.

### PAIEMENTS
Montant, date effective d'encaissement, moyen (espèces, MTN Mobile Money, Orange Money,
virement, chèque), référence de transaction, encaissé par quel membre, commentaire,
photo du reçu papier, statut (enregistré ou annulé), annulé par et motif.

Un paiement est rattaché **au bail**, pas à une échéance. Et il porte une
**clé d'idempotence** : un identifiant unique fabriqué par le téléphone au moment de la saisie.
Si le réseau coupe pendant l'envoi et que le téléphone réessaie, le serveur reconnaît
la clé et n'enregistre pas le paiement deux fois. Sans ce champ, la synchronisation
hors ligne crée des doublons d'argent — le pire bug possible pour ce produit.

### IMPUTATIONS
**La table qui règle ton point le plus important.** Chaque ligne dit : « telle partie de
tel paiement paie telle échéance ». Paiement, échéance, montant.

- Un paiement de 360 000 pour six mois de loyer produit six lignes d'imputation.
- Une échéance de 60 000 payée en 40 000 puis 20 000 reçoit deux lignes.
- Ce qui reste d'un paiement non imputé devient le **solde créditeur** du bail,
  automatiquement appliqué à la prochaine échéance.

Ta version du modèle mettait « échéance concernée » directement sur le paiement.
Ça marche pour le cas simple et ça casse dès la première avance de six mois.

### DOCUMENTS_EMIS — reçus et quittances
Type (reçu ou quittance), numéro, année, bail, échéances couvertes, paiements inclus,
montant total, montant en toutes lettres, période couverte,
**données figées** (identité du locataire, adresse de l'unité, coordonnées du bailleur,
détail loyer et charges, tels qu'ils étaient au moment de l'émission),
fichier PDF, empreinte numérique du fichier, émis le, émis par,
statut (émise ou annulée), lien vers le document d'annulation.

> Deux principes : **on ne régénère jamais** un document déjà remis à un locataire
> (si le loyer change en mars, la quittance de janvier ne doit pas bouger), et
> **on n'efface jamais** une quittance — on émet une annulation. C'est ce que ferait
> un comptable, et c'est ce qui tient devant un juge.

Distinction juridique respectée : **reçu** pour un paiement partiel, **quittance de loyer**
uniquement quand la période est intégralement soldée.

### COMPTEURS_NUMEROTATION
Organisation, type de document, année, dernier numéro attribué.
Le numéro est attribué en verrouillant la ligne, pour que deux gérants qui encaissent
au même moment n'obtiennent jamais le même numéro de quittance.

### DEPENSES
Bien ou unité concernée, type (eau, électricité, ordures, gardiennage, réparations,
taxe foncière, commission d'agence), montant, date, fournisseur, justificatif scanné,
refacturable au locataire oui/non, échéance de refacturation si applicable, payée par.

---

## 5. L'état du bien

### ETATS_DES_LIEUX
Bail, type (entrée ou sortie), date, statut (brouillon ou signé),
relevé du compteur électrique, relevé du compteur eau, observations générales,
signature du bailleur et signature du locataire (images capturées au doigt),
date de signature, PDF figé, empreinte numérique du PDF,
lien vers l'état des lieux d'entrée (pour une sortie).

> L'empreinte numérique est ce qui permet de prouver plus tard que le document n'a pas
> été retouché. À faire confirmer par un juriste : une signature au doigt sur écran n'a
> pas la même valeur qu'une signature électronique qualifiée. C'est un excellent élément
> de preuve, ce n'est pas une garantie absolue — ne le vends pas comme telle.

### EDL_PIECES
État des lieux, nom de la pièce, ordre d'affichage.

### EDL_ELEMENTS
Pièce, libellé (murs, sol, plafond, porte, fenêtres, robinetterie, prises…),
état (bon, moyen, mauvais, absent), commentaire.

### EDL_PHOTOS
Élément ou pièce, fichier, date de prise de vue, GPS optionnel, ordre.

### RETENUES_CAUTION
Bail, état des lieux de sortie, libellé de la retenue, montant, justificatif.
Plus, sur le bail : montant restitué, date et moyen de restitution.

> Première source de litige bailleur/locataire. La structure existe dès le début,
> l'écran arrive en phase 2.

### INCIDENTS
Unité, bail éventuel, titre, description, priorité, statut (ouvert, en cours, résolu),
signalé par, prestataire, coût, dépense liée, date de résolution. Plus des photos.

---

## 6. Papiers, communication, preuve

### DOCUMENTS
Fichier rattaché à un bien, une unité, un locataire ou un bail.
Type (titre foncier, contrat signé, pièce d'identité, attestation, correspondance),
nom, chemin de stockage, taille, format, empreinte, téléversé par, téléversé le.
Les images sont compressées **sur le téléphone avant l'envoi**, pas après.

### MODELES_MESSAGE
Organisation, code (rappel avant échéance, retard, fin de bail),
langue, objet, corps avec des variables du type `{locataire}`, `{montant}`, `{periode}`.

### RELANCES
Échéance, bail, canal (WhatsApp, SMS, appel noté à la main), modèle utilisé,
texte réellement envoyé, date, statut, envoyée par.

### JOURNAL_AUDIT
Organisation, table, identifiant de la ligne, action (création, modification, suppression),
état avant, état après, utilisateur, date, adresse IP.

> Écrit automatiquement **par la base de données**, pas par l'application. Un gérant
> qui passerait par un autre chemin serait quand même tracé. En lecture seule pour
> tout le monde, y compris le propriétaire.

---

## 7. Ce qui vit sur le téléphone

### FILE_DE_SYNCHRONISATION
N'existe pas sur le serveur : c'est une file d'attente dans le téléphone.
Chaque saisie faite sans réseau y est déposée avec sa clé d'idempotence, puis rejouée
dans l'ordre au retour de la connexion, avec un indicateur visible de l'état.

---

## Écarts par rapport à ta proposition initiale

| Ton modèle | Ce que je propose | Pourquoi |
|---|---|---|
| Paiement rattaché à une échéance | Paiement rattaché au bail + table IMPUTATIONS | Sans ça, l'avance de 6 mois est impossible |
| — | Clé d'idempotence sur les paiements | Sinon la synchronisation hors ligne crée des doublons d'argent |
| — | Solde d'ouverture sur le bail | Les baux existent déjà avant l'installation |
| — | BAIL_LOCATAIRES | Colocation et baux au nom d'un couple |
| Locataire = personne | Locataire particulier **ou** entreprise | Tu loues des boutiques et des bureaux |
| — | REVISIONS_LOYER | Augmenter un loyer ne doit pas réécrire les quittances passées |
| Statut d'échéance stocké | Statut calculé | Évite un robot nocturne qui peut tomber en panne |
| Quittance regénérée à la demande | Données figées + PDF figé + empreinte | Un document remis ne doit plus jamais bouger |
| Une numérotation | Deux séries : reçus et quittances | Ce sont deux documents de nature juridique différente |
| Caution en phase 2 | Structure dès maintenant, écran en phase 2 | Champ gratuit maintenant, migration pénible plus tard |
