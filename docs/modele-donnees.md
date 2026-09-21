# Modèle de données

Version 2 — refonte complète après le brief du 6 septembre 2026.
Aucun SQL ici : on décrit **ce que l'application mémorise**, pas encore comment.

> Un mot de vocabulaire, une seule fois : ce que j'appelle une **table** est simplement
> une liste. La table « biens » est la liste de tes biens, la table « paiements » la liste
> des paiements. Chaque ligne de la liste a des **champs**, c'est-à-dire des cases à remplir.

---

## Conventions valables partout

- **Identifiant** : chaque ligne a un identifiant unique généré par le téléphone, pas par
  le serveur. C'est la condition pour pouvoir saisir un état des lieux sans réseau.
- **Montants** : nombres entiers en francs CFA. Jamais de virgule. 150000 s'affiche « 150 000 FCFA ».
- **Dates métier** (échéance, encaissement, signature) : date simple sans heure.
- **Téléphones** : stockés au format international `+237691234567`, affichés `+237 6 91 23 45 67`.
- **Traçabilité** : créé le, créé par, modifié le, modifié par, archivé le.
- **On n'efface jamais** : on archive. Une donnée effacée est une preuve perdue.
- **Bilingue** : aucun texte visible n'est écrit en dur dans le code. Tout passe par des
  fichiers de traduction français et anglais, dès la première ligne.

---

## 1. Les personnes et les rôles

Point central de ton brief : **un même compte doit pouvoir être bailleur d'un bien et
locataire d'un autre**. La conséquence technique est qu'on ne stocke jamais « rôle = bailleur »
sur un utilisateur. Le rôle se déduit du lien entre la personne et le bien.

### PROFILS
Une ligne par personne qui peut se connecter.
Téléphone (**l'identifiant de connexion**, unique), email (optionnel, jamais bloquant),
nom complet, photo, langue préférée, est-administrateur-de-la-plateforme (oui/non),
code de récupération (stocké chiffré), date de dernière connexion.

### Comment se déduit le rôle
| Situation | Le rôle en découle |
|---|---|
| La personne est propriétaire d'un bien | Elle est **bailleur** sur ce bien |
| Un mandat actif la désigne sur un bien | Elle est **mandataire** sur ce bien |
| Un bail actif la désigne comme occupant | Elle est **locataire** sur ce bail |
| Le drapeau administrateur est levé | Elle est **admin plateforme** |

Une même personne peut cumuler les quatre. L'écran d'accueil lui propose de basculer
entre ses espaces.

### MANDATS
La délégation à un proche ou une agence, révocable.
Bailleur, mandataire, périmètre (un bien précis, plusieurs biens, ou tous),
**droits délégués** cochés un par un : encaisser un paiement, créer un bail, résilier un bail,
générer des documents, faire un état des lieux, inviter un locataire, modifier les modèles.
Date de début, date de fin éventuelle, révoqué le, révoqué par.

> Le bailleur voit tout ce que fait son mandataire, via le journal d'audit décrit plus bas.
> Un droit non coché est refusé **par la base de données**, pas seulement masqué à l'écran.

### INVITATIONS
Sert à donner un accès à un locataire ou à un mandataire, sans jamais que le bailleur
connaisse le mot de passe de l'autre.
Téléphone destinataire, rôle proposé, périmètre, jeton d'activation à usage unique
(stocké chiffré), date d'expiration, date d'utilisation, créée par.

Le bailleur envoie le lien d'activation par WhatsApp. Le destinataire choisit **lui-même**
son mot de passe. Tant qu'il n'a pas activé, sa fiche existe comme donnée mais aucun
compte n'est ouvert.

---

## 2. Le patrimoine

### BIENS
Nom usuel, type (maison, appartement, studio, chambre, boutique, magasin, bureau, terrain),
usage (habitation ou commercial), nombre de pièces, superficie approximative,
meublé (oui/non), loyer de référence, montant de caution demandé,
**mode de charges** (voir plus bas), photos, date d'acquisition, propriétaire, archivé le.

Un bien peut contenir plusieurs **unités** quand il s'agit d'un immeuble. Pour un bailleur
qui ne loue qu'une maison, l'unité est créée automatiquement et ne lui est jamais montrée :
il ne doit pas avoir à comprendre la distinction.

### UNITES
Bien rattaché, libellé (« Studio A3 »), étage, nombre de pièces, superficie, meublé,
loyer de référence, statut (libre, occupée, en travaux, réservée), archivée le.

### ADRESSES — adaptées au Cameroun
Rattachée au bien. **Aucun champ « numéro » ni « code postal »**, ils n'ont pas de sens ici.
Ville (liste déroulante), quartier (liste déroulante dépendante de la ville),
lieu-dit, **point de repère** en texte libre (« descente Total Mvog-Ada », « derrière l'école
publique »), latitude et longitude optionnelles, précisions d'accès.

### VILLES et QUARTIERS
Listes de référence pré-remplies : Douala, Yaoundé, Bafoussam, Garoua, Bamenda, Buea,
Kribi, Limbé, Ngaoundéré, Maroua, Bertoua, Ebolowa, avec leurs quartiers connus.
Le bailleur peut toujours saisir une ville ou un quartier absent de la liste.

---

## 3. Les locataires et les baux

### LOCATAIRES
**Une fiche locataire existe sans compte.** Le lien vers un compte est optionnel et se fait
au moment de l'activation.
Lien vers un profil (vide tant que le locataire n'a pas activé son accès),
type (particulier ou entreprise), nom complet ou raison sociale, téléphone, WhatsApp,
email optionnel, profession, employeur, type et numéro de pièce d'identité,
scan de la pièce, personne à prévenir en cas d'urgence, garant (nom, téléphone, pièce),
notes libres, archivé le.

### BAUX
Bien ou unité, date de début, durée, date de fin prévue, usage (habitation ou commercial),
loyer mensuel, jour d'échéance, périodicité, montant de caution, caution effectivement versée,
**nombre de mois de loyer payés d'avance**, mode de paiement habituel,
statut (en projet, actif, en préavis, terminé, résilié),
**origine** (créé dans l'application ou **bail papier importé**),
document du bail (généré ou scanné), solde d'ouverture, date et motif de fin, archivé le.

### BAIL_LOCATAIRES
Le lien entre un bail et ses occupants, avec un titulaire principal désigné.
Permet la colocation et le bail au nom d'un couple.

### REVISIONS_LOYER
Bail, date d'effet, ancien et nouveau loyer, motif, avenant lié.
Sans cet historique, augmenter un loyer réécrirait toutes les quittances passées.

### PREAVIS
Bail, origine (déposé par le locataire ou congé donné par le bailleur), date de dépôt,
date d'effet souhaitée, durée de préavis appliquée (paramétrable, jamais codée en dur),
motif, statut (déposé, accepté, contesté, clos), document généré.

---

## 4. L'argent

### ECHEANCES
Une ligne par période due, générée à la création du bail.
Bail, début et fin de période, libellé (« Loyer octobre 2026 »), date d'échéance,
montant du loyer, montant des charges, total attendu, montant déjà imputé.

Le statut (à venir, due, partiellement payée, soldée, en retard) est **calculé**, jamais
stocké. Sinon il faudrait un automate nocturne, et le jour où il tombe en panne
l'application ment sur qui doit de l'argent.

### PAIEMENTS
**Rattaché au bail, pas à une échéance.** C'est ce qui rend possible l'avance de six mois
ou d'un an, qui est la norme au Cameroun.
Montant, date d'encaissement, mode (espèces, MTN Mobile Money, Orange Money, virement,
chèque), référence de transaction, encaissé par qui, commentaire, photo du reçu papier,
clé d'idempotence, statut (enregistré ou annulé), annulé par et motif.

> **Clé d'idempotence** : un identifiant unique fabriqué par le téléphone au moment de la
> saisie. Si le réseau coupe pendant l'envoi et que le téléphone réessaie, le serveur
> reconnaît la clé et n'enregistre pas le paiement deux fois. Sur un outil qui suit de
> l'argent liquide, c'est indispensable.

### IMPUTATIONS
La table charnière. Chaque ligne dit : « telle partie de tel paiement paie telle échéance ».

- Un versement de 720 000 pour douze mois produit douze lignes.
- Une échéance de 60 000 payée en 40 000 puis 20 000 reçoit deux lignes.
- Ce qui reste non imputé devient le **solde créditeur** du bail.

De cette table se déduisent les deux chiffres que le bailleur veut vraiment voir :
**« à jour jusqu'au 28 février 2027 »** et **« doit 45 000 FCFA depuis 62 jours »**.
Tant que l'avance couvre la période, les avis d'échéance et les relances sont suspendus
automatiquement.

### L'architecture des paiements
La logique d'encaissement est isolée derrière une **interface unique**, avec pour l'instant
une seule implémentation : « saisie manuelle par le bailleur ». Brancher plus tard MTN MoMo
ou Orange Money consistera à ajouter une implémentation, sans toucher au reste.

---

## 5. Les charges — cinq modes, aucun codé en dur

À la création du bien, le bailleur choisit son mode. Les charges apparaissent **toujours
séparément du loyer** dans les avis, les quittances et l'historique.

| Mode | Ce que fait l'application |
|---|---|
| **Incluses dans le loyer** | Rien à gérer |
| **Forfait mensuel** | Un montant fixe s'ajoute à chaque échéance |
| **Compteur individuel** | Le bailleur saisit l'index, l'application calcule la consommation depuis le relevé précédent et applique le tarif |
| **Compteur commun réparti** | Le bailleur saisit la facture globale et choisit la clé de répartition |
| **À la charge directe du locataire** | Le bailleur ne suit rien (compteur prépayé) |

### COMPTEURS
Bien ou unité, type (eau, électricité, autre), numéro, portée (individuel ou commun),
unité de mesure (m³ ou kWh), tarif unitaire, actif.

### RELEVES_COMPTEUR
Compteur, date du relevé, index relevé, photo du compteur, relevé par,
consommation calculée depuis le relevé précédent, tarif appliqué, montant.

### FACTURES_COMMUNES
Pour le compteur partagé : compteur, période, montant global, justificatif scanné,
**clé de répartition** (parts égales, au nombre d'occupants, ou pourcentages définis
par le bailleur), et le détail des pourcentages quand ce mode est choisi.

### CHARGES_LOCATAIRE
Bail, période, montant, origine (forfait, relevé individuel, quote-part d'une facture
commune), détail du calcul conservé pour pouvoir l'expliquer au locataire.

---

## 6. Les documents

### MODELES_DOCUMENT
Type (les quatorze types listés dans le brief), propriétaire du modèle
(vide = modèle par défaut fourni par la plateforme, sinon la version personnalisée du bailleur),
langue, titre, **contenu structuré en articles et clauses**, numéro de version, actif.

Le bailleur part du modèle par défaut, le duplique, ajuste ses clauses, en ajoute,
et enregistre sa propre version. Les documents déjà émis ne bougent jamais.

### DOCUMENTS_EMIS
Type, numéro (numérotation continue par bailleur et par année), bail, bien ou locataire
concerné, **données figées** (identités, adresses, montants tels qu'ils étaient au moment
de l'émission), modèle et version utilisés, fichier PDF, empreinte numérique du fichier,
émis le, émis par, statut (émis ou annulé), lien vers le document d'annulation.

> Deux principes de comptable : on ne **régénère** jamais un document déjà remis, et on ne
> l'**efface** jamais. Si le loyer change en mars, la quittance de janvier ne bouge pas.
> Une erreur se corrige par une annulation, pas par une suppression.

### COMPTEURS_NUMEROTATION
Bailleur, type de document, année, dernier numéro attribué, avec verrouillage pour que
deux encaissements simultanés n'obtiennent jamais le même numéro.

---

## 7. La signature électronique — niveau 1

### SIGNATURES
Document concerné, signataire (profil ou identité saisie), qualité (bailleur, mandataire,
locataire, témoin), image de la signature dessinée au doigt ou scannée,
horodatage, adresse IP, appareil et navigateur, téléphone du signataire,
**code de confirmation à usage unique** (stocké chiffré) et date de sa saisie,
empreinte du PDF avant signature, empreinte du PDF après signature, statut.

Un **journal de signature** reprenant tous ces éléments est ajouté en dernière page du PDF.

### La mention affichée, imposée par ton brief
> « Signature avec dossier de preuve. Ne vaut pas signature électronique avancée au sens
> de la loi n°2010/012 du 21 décembre 2010. »

Cette phrase apparaît à l'écran au moment de signer **et** sur le document. L'application
ne doit jamais laisser croire à une équivalence légale qu'elle n'a pas. Le module est isolé
derrière une interface unique pour que le niveau 2, avec certificat d'une autorité agréée,
puisse être branché sans réécriture.

---

## 8. Les états des lieux

### ETATS_DES_LIEUX
Bail, type (entrée ou sortie), date, statut (brouillon, signé),
relevés de compteurs, observations générales, signatures des deux parties,
PDF figé, empreinte du PDF, **lien vers l'état des lieux d'entrée** pour une sortie.

### EDL_PIECES
État des lieux, nom de la pièce, ordre d'affichage.

### EDL_ELEMENTS
Pièce, libellé (murs, sol, plafond, porte, fenêtres, robinetterie, prises, sanitaires…),
état (**neuf, bon, moyen, mauvais**), commentaire.

### EDL_PHOTOS
Élément ou pièce, fichier, date de prise de vue, ordre.

À la sortie, l'écran affiche l'entrée et la sortie **côte à côte**, élément par élément,
avec les photos en vis-à-vis.

### RETENUES_CAUTION
Bail, état des lieux de sortie, libellé de la retenue, montant, justificatif.
Puis sur le bail : montant restitué, date et mode de restitution.
Le décompte de restitution est un document généré comme les autres.

---

## 9. Le reste

### INCIDENTS
Unité, bail, titre, description, photos, priorité, statut (ouvert, en cours, résolu),
signalé par (souvent le locataire), prestataire, coût, date de résolution.

### FICHIERS
Tout fichier téléversé : rattachement (bien, unité, locataire, bail, incident),
type (bail papier scanné, pièce d'identité, quittance ancienne, photo, justificatif),
nom, chemin, taille, format, empreinte, téléversé par et quand,
**et la version compressée générée dans le navigateur avant l'envoi**.

### AVIS_ET_RELANCES
Échéance concernée, nature (avis d'échéance, rappel avant échéance, relance de retard,
mise en demeure), canal (WhatsApp, email, appel noté à la main), modèle utilisé,
texte réellement envoyé, date de préparation, date d'envoi, statut, envoyé par.

Le bailleur voit la liste des envois prêts et déclenche lui-même, ou active l'envoi
automatique s'il préfère. Le canal privilégié est un lien `wa.me` qui ouvre WhatsApp avec
le message déjà rédigé : c'est gratuit, contrairement à l'API WhatsApp Business.

### JOURNAL_AUDIT
Qui a créé, modifié ou supprimé quoi, quand, avec l'état avant et après.
Écrit **par la base de données elle-même**, pas par l'application : un mandataire qui
passerait par un autre chemin serait quand même tracé. En lecture seule pour tout le monde,
y compris le bailleur et l'administrateur.

C'est ce qui permet au propriétaire vivant à l'étranger de voir exactement ce qu'a fait
son mandataire sur place.

---

## 10. Le cloisonnement des données

Chaque table porte l'identifiant du bailleur propriétaire de la donnée. Les règles de
sécurité s'appliquent **dans la base**, pas dans le navigateur :

| Qui | Voit |
|---|---|
| Bailleur | Uniquement ses biens, ses baux, ses locataires, ses documents |
| Mandataire | Uniquement les biens de son mandat, et uniquement les actions qu'on lui a déléguées |
| Locataire | Uniquement les baux où il est occupant, en lecture seule |
| Admin plateforme | Les comptes et les modèles par défaut, pas le contenu des dossiers |

Comment je le vérifierai devant toi, à l'étape 2 : on crée deux comptes bailleurs,
on met des données dans chacun, et on essaie depuis le compte A de lire les données du
compte B en s'adressant directement à la base, sans passer par l'écran. Le refus doit venir
de la base. Si on peut lire quoi que ce soit, la règle est mauvaise et on recommence.
