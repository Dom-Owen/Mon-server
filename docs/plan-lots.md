# Découpage en lots de développement

Proposition soumise à validation. Un lot = une fonctionnalité que tu peux tester
toi-même, de bout en bout, sur ton téléphone. On ne passe au suivant que quand
le précédent marche sous tes yeux.

Ton découpage initial était bon. Je propose **quatre déplacements** et j'explique
chacun.

---

## Lot 0 — Socle technique
Projet Next.js, Tailwind, connexion à Supabase, structure de dossiers, page d'accueil
propre, français par défaut.
**Je te guide clic par clic** pour créer ton compte Supabase et placer les clés.

Ajout par rapport à ta version : dès ce lot, on met en place les identifiants générés
par le téléphone et l'horodatage en heure de Douala. Deux détails invisibles à l'écran,
impossibles à rattraper au lot 8.

**Tu valides quand** : `npm run dev` ouvre une page qui s'affiche sur ton ordinateur,
et la même page s'ouvre sur ton téléphone connecté au même wifi.

---

## Lot 1 — Comptes, sécurité, rôles
Inscription, connexion, déconnexion, mot de passe oublié. À l'inscription, création
automatique de l'organisation, l'utilisateur en devient propriétaire.
Règles de sécurité au niveau de la base (RLS), expliquées une par une en français.
Invitation d'un gérant, retrait de son accès.

**Déplacement n° 1** : la table des paramètres de l'organisation arrive ici, pas au lot 3.
Durée de préavis, nombre de mois de caution, mentions légales : tout est paramétrable
**avant** qu'on écrive le premier PDF. Comme ça, rien de juridique ne se retrouve jamais
figé dans le code, même par accident.

**Déplacement n° 2** : les compteurs d'unités gérées arrivent ici aussi. Si ton modèle
économique est un abonnement par unité (point 10.3 de ton brief), il faut compter dès
le premier jour, sinon tu factureras à l'aveugle.

**Tu valides quand** : tu crées deux comptes, tu vérifies que le compte B ne voit
strictement rien du compte A, et qu'un gérant invité peut se connecter.

---

## Lot 2 — Biens et unités
Création, modification, archivage. Vue liste et vue par immeuble, pensées pour le
téléphone d'abord. Sur la fiche d'un bien : nombre d'unités, combien sont occupées,
loyer théorique du mois, loyer réellement encaissé.
Import depuis un fichier Excel, avec un modèle à télécharger.

**Tu valides quand** : tu ajoutes un immeuble avec 3 studios depuis ton téléphone,
en moins de deux minutes, sans te tromper.

---

## Lot 3 — Locataires et baux
Fiches locataires avec pièce d'identité et garant. Création d'un bail, l'unité bascule
automatiquement en « occupée ». Génération automatique de l'échéancier complet.
Contrat de bail en PDF à partir d'un modèle modifiable.

Rappel de ta consigne, que je respecte : **rien de juridique en dur**. Le modèle de
contrat sera un gabarit vide de mentions inventées, alimenté par les paramètres du
lot 1. Tu le feras valider par un juriste camerounais avant utilisation réelle.

**Tu valides quand** : bail à 60 000 FCFA à partir du 1er du mois → l'échéancier se
génère seul, avec les bons libellés de mois et les bonnes dates.

---

## Lot 4 — Paiements et quittances *(le cœur du produit)*
Enregistrement d'un paiement en trois clics : locataire, montant, moyen de paiement.
Paiements partiels, avances sur plusieurs mois, imputation automatique.
PDF automatique : reçu si partiel, quittance si soldé. Numérotation continue.
Montant en toutes lettres en français. Bouton « Envoyer sur WhatsApp ».
Vue « Impayés » triée par ancienneté, avec le total dû par locataire.

**Déplacement n° 3** : je propose de découper ce lot en deux livraisons, parce que
c'est le lot le plus risqué du projet et le plus important commercialement.
- **4a** : saisie du paiement, imputation, écran des impayés. Testable seul.
- **4b** : génération des PDF, numérotation, envoi WhatsApp.

**Tu valides quand** : le scénario de ta section 8 passe intégralement — 40 000 puis
20 000, un reçu puis une quittance, et le studio passe en « occupé », l'échéance en « soldée ».

---

## Lot 5 — États des lieux
Parcours guidé pièce par pièce, photos prises depuis l'appareil avec compression
automatique, notation de chaque élément, signature au doigt des deux parties.
PDF figé, non modifiable après signature. Vue comparative entrée/sortie côte à côte
et calcul des retenues sur la caution.

**Déplacement n° 4, le plus important** : tu demandes que ce formulaire fonctionne
hors ligne. C'est légitime — mais le hors ligne est de loin la partie la plus difficile
du projet, plus difficile que les quittances. Le mettre au lot 5 alors que la machinerie
hors ligne est prévue au lot 8, c'est se condamner à écrire deux fois le même écran.

Je propose donc de **remonter la machinerie hors ligne juste avant ce lot** (elle devient
le lot 5, l'état des lieux devient le lot 6). Concrètement : file d'attente locale,
rejeu automatique au retour du réseau, indicateur de synchronisation. Une fois ce socle
posé, l'état des lieux hors ligne devient simple, et tous les écrans déjà construits
en bénéficient gratuitement.

**Tu valides quand** : tu fais un état des lieux avec 5 photos en mode avion, tu
rallumes le réseau, tout part tout seul, et rien n'est envoyé en double.

---

## Lot 7 — Documents et tableau de bord
Espace documentaire : téléversement, classement, prévisualisation, recherche,
compression à l'envoi. Tableau de bord : taux d'occupation, encaissements du mois
contre attendu, top 5 des impayés, baux finissant sous 90 jours, dépenses du mois,
rendement par bien. Export Excel des encaissements sur une période.

---

## Lot 8 — Relances et automatisations
Notification 3 jours avant échéance, alerte dès le retard, alerte 90 jours avant la
fin d'un bail. Modèles de messages personnalisables en français et en anglais,
envoi WhatsApp en un clic. Journal des relances, utilisable comme preuve de mise en demeure.

---

## Lot 9 — Installation sur téléphone et mise en ligne
Application installable sur l'écran d'accueil (PWA). Optimisation du poids des pages,
cible sous 200 Ko au premier chargement, test en 3G simulée.
Déploiement sur Vercel expliqué étape par étape, branchement d'un nom de domaine,
et mise en place d'une base de test séparée de la base réelle.

La partie hors ligne, elle, aura déjà été livrée au lot 5.

---

## Lot 10 — Anglais
Passage complet en bilingue français/anglais.

**Pourquoi un lot dédié et pas « dès le début »** : tu as raison de dire que le bilingue
se rajoute très mal après coup. La bonne réponse n'est pas de tout traduire tout de suite,
c'est de **n'écrire aucun texte en dur dans le code dès le lot 0**. Chaque phrase visible
passe par un fichier de traduction, dont seule la version française est remplie au départ.
Ajouter l'anglais devient alors un travail de traduction, pas de reprise du code.

---

## Lot 11 — Portail locataire
Lien unique reçu par WhatsApp, sans mot de passe : historique des quittances, solde
du compte, signalement d'incident avec photo.

---

## Phase 2, après les premiers utilisateurs payants
Suivi fin des charges par bien, gestion complète de la restitution de caution,
export comptable et fiscal (à faire valider par un comptable, taux paramétrables),
rapprochement Mobile Money via les API MTN et Orange, mode diaspora, scoring locataire,
copropriété familiale avec répartition entre héritiers, annuaire de prestataires.

---

## Trois avertissements honnêtes avant de commencer

1. **Le hors ligne coûtera plus cher que tu ne le penses.** Consulter hors ligne est
   facile. Saisir hors ligne et synchroniser sans doublon ni conflit est un vrai sujet
   d'ingénierie. C'est la raison du déplacement n° 4.

2. **Les hébergements gratuits ne conviennent pas à une activité commerciale.**
   Un projet Supabase gratuit se met en veille après quelques jours sans activité, et
   l'offre gratuite de Vercel n'est pas prévue pour un usage commercial. Compte environ
   45 USD par mois d'infrastructure dès que tu as de vrais clients qui paient. À intégrer
   dans ton modèle économique, pas à découvrir au lancement.

3. **Je ne suis pas juriste ni comptable.** Les mentions légales des contrats et des
   quittances, ainsi que les règles de retenue fiscale, seront des paramètres vides que
   tu feras remplir par un professionnel camerounais. Je ne les inventerai pas.
