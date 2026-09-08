# Les recettes

Deux scénarios qui déroulent l'application de bout en bout dans un vrai navigateur,
exactement comme vous le feriez à la main. Ils servent à vérifier qu'une modification
n'a rien cassé ailleurs.

## Comment les lancer

L'application doit tourner (`npm run dev` dans un autre terminal). Puis, une commande
à la fois :

```
node tests/recette-1-parcours-complet.mjs
```

```
node tests/recette-2-locataire-et-documents.mjs
```

Chaque ligne affiche `✓` si l'étape passe, `✗` avec l'explication sinon.

## Ce que vérifie la recette 1

C'est le scénario complet du cahier des charges, du début à la fin.

1. Créer un compte avec un numéro de téléphone
2. Recevoir un code de récupération
3. Ajouter un immeuble avec 3 studios
4. Ajouter un locataire avec sa pièce d'identité
5. Créer un bail à 60 000 FCFA
6. Vérifier que l'échéancier se génère tout seul
7. Enregistrer un paiement partiel de 40 000 et obtenir un **reçu**
8. Enregistrer le solde de 20 000 et obtenir une **quittance**
9. Vérifier que le PDF s'ouvre vraiment
10. Vérifier que le bouton WhatsApp porte le bon numéro et le lien du document
11. Vérifier que le studio passe en « occupé » et l'échéance en « soldée »
12. Couper la connexion et vérifier que la liste des locataires reste consultable

## Ce que vérifie la recette 2

Le reste : espace locataire, état des lieux, export, cloisonnement des données.

1. Le tableau de bord affiche impayés et taux d'occupation
2. La fiche d'un bien affiche son loyer théorique
3. Un état des lieux se crée avec sa trame pièce par pièce
4. Les états des éléments s'enregistrent
5. Les deux parties signent au doigt
6. Le document est figé, le PDF généré, et il ne peut plus être modifié
7. Les relances sont préparées automatiquement pour le locataire en retard
8. L'export produit une vraie archive ZIP
9. Le journal trace les actions
10. Le locataire voit son bail, ses quittances et son solde
11. **Le locataire ne voit rien des autres locataires**

Les captures d'écran sont déposées dans `/tmp/captures/`.

## Deux pièges rencontrés en les écrivant

Ils sont notés ici parce qu'ils reviendront.

- **Les espaces des montants.** L'application écrit « 60 000 FCFA » avec des espaces
  insécables. Une comparaison de texte doit les normaliser, sinon elle échoue sans
  raison apparente.
- **Le rendu progressif.** Next envoie la page en plusieurs morceaux : le titre arrive
  avant le reste. Il faut attendre un élément situé en bas de page avant de lire son
  contenu, sinon on lit une page à moitié construite.
