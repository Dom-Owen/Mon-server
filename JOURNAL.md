# Journal de bord du projet

Ce fichier est écrit pour toi, pas pour un développeur. Il raconte en français simple
ce qui a été fait, ce qui a été décidé, et ce qui reste à faire. Il est mis à jour
à la fin de chaque lot.

---

## 30 août 2026 — Étude préalable

### Ce que j'ai fait
Aucune ligne de code, volontairement. Ton prompt d'amorçage demandait un plan et une
validation avant d'écrire quoi que ce soit. J'ai donc produit trois documents :

- `docs/modele-donnees.md` — la liste complète de ce que l'application va mémoriser
  (les « tables »), en français, sans langage technique de base de données.
- `docs/plan-lots.md` — le découpage du développement en étapes testables une par une.
- ce journal.

Le dépôt était vide au départ (un simple fichier README).

### Ce que j'ai relevé dans ta proposition de modèle
Ton modèle était solide. J'y ai apporté neuf corrections ou ajouts, détaillés en bas
de `docs/modele-donnees.md`. Les trois qui comptent vraiment :

1. **Un paiement ne doit pas être rattaché à une échéance.** Tu écris toi-même qu'un
   paiement peut couvrir six mois et qu'une échéance peut recevoir plusieurs paiements.
   Ces deux phrases sont incompatibles avec un simple champ « échéance concernée ».
   Il faut une table intermédiaire qui dit « telle partie de tel paiement paie telle
   échéance ». C'est la correction la plus structurante du projet.

2. **Il manque une protection contre les doublons de paiement.** Tu veux saisir hors
   réseau. Quand le téléphone réessaie d'envoyer une saisie après une coupure, rien
   n'empêche aujourd'hui le serveur de l'enregistrer deux fois. Sur un outil qui suit
   de l'argent liquide, c'est le pire défaut possible. Solution : chaque saisie porte
   un identifiant unique fabriqué par le téléphone.

3. **Il manque un solde de départ sur les baux.** Tes utilisateurs ont déjà des
   locataires, et souvent déjà des arriérés, le jour où ils installent l'application.
   Sans ce champ, l'écran « Impayés » affiche zéro le premier jour et l'outil perd
   toute crédibilité immédiatement.

### Ce que j'ai changé dans ton découpage en lots
Quatre déplacements, expliqués dans `docs/plan-lots.md`. Le plus important : **la
machinerie du hors ligne remonte avant les états des lieux**, parce que tu demandes
que les états des lieux fonctionnent hors réseau (lot 5) alors que le hors ligne
n'était prévu qu'au lot 8. En l'état, il aurait fallu écrire cet écran deux fois.

### Ce qui n'est pas décidé
La pile technique que tu imposes (Next.js, Supabase, Vercel, next-intl, PWA) est un
bon choix pour un débutant : très documentée, peu de choses à installer, tout se pilote
depuis un navigateur. **Je ne propose pas d'en changer.** J'ajouterai simplement trois
petits outils au moment voulu, et je t'expliquerai chacun :
- de quoi fabriquer les PDF sans installer de navigateur sur le serveur,
- de quoi stocker la file d'attente hors ligne dans le téléphone,
- de quoi vérifier les formulaires avant envoi.

### En attente de ta réponse
Huit questions, posées dans la conversation. Rien ne démarre avant tes réponses.
Tu peux répondre « je prends tes valeurs par défaut » pour toutes, ou ne trancher que
celles qui te parlent.

### Prochaine étape
Lot 0 — socle technique, dès que tu valides.

---

## Les huit questions en attente

Pour chacune, ma recommandation est indiquée. Tu peux te contenter de dire
« d'accord » pour prendre toutes les recommandations.

1. **Comment se connecte-t-on ?** Email + mot de passe (gratuit), ou téléphone + code
   par SMS (chaque SMS est payant et peu fiable au Cameroun) ?
   → *Recommandation : email + mot de passe. Les gérants sont invités par un lien
   envoyé sur WhatsApp, sans avoir besoin d'email.*

2. **Colocation :** un bail peut-il être au nom de plusieurs locataires ?
   → *Recommandation : oui, avec un titulaire principal désigné.*

3. **Locataires entreprises :** faut-il gérer des sociétés (raison sociale, RCCM),
   ou seulement des particuliers ?
   → *Recommandation : oui, puisque tu listes boutiques, magasins et bureaux.*

4. **Périmètre du gérant :** un intendant voit-il tous les immeubles, ou seulement
   ceux qu'on lui attribue ?
   → *Recommandation : seulement ceux qu'on lui attribue, avec « tous » par défaut.*

5. **Les charges :** montant fixe ajouté au loyer, ou variable relevé chaque mois
   (eau, électricité) et refacturé ?
   → *Recommandation : forfait fixe au départ, la refacturation réelle en phase 2.*

6. **Numérotation :** une seule série pour les reçus et les quittances, ou deux séries
   séparées ?
   → *Recommandation : deux séries, `REC-2026-0001` et `QUI-2026-0001`. Ce sont deux
   documents de nature juridique différente.*

7. **Trop-perçu :** quand un locataire paie plus que ce qu'il doit, on impute
   automatiquement sur les mois suivants, ou on garde un crédit à imputer à la main ?
   → *Recommandation : imputation automatique sur les échéances les plus anciennes,
   puis les suivantes ; le reste devient un crédit visible sur la fiche du bail.*

8. **Reprise de l'existant :** au moment de créer un bail déjà en cours, doit-on
   pouvoir saisir la dette antérieure du locataire ?
   → *Recommandation : oui, un champ « solde de départ » sur le bail. Sans lui,
   l'écran des impayés est faux dès le premier jour.*
