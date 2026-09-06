# Application de gestion locative — Cameroun

Application web pour les bailleurs particuliers et leurs locataires au Cameroun.
Centraliser ses biens, ses locataires, ses loyers et ses documents, et les générer
proprement en PDF.

> **Nom de travail : à choisir.** Il apparaîtra sur les documents, dans l'adresse du site
> et sur l'icône du téléphone. Tant qu'il n'est pas arrêté, le projet s'appelle
> « gestion locative ».

**État du projet : étude préalable. Aucun code écrit à ce jour.**

---

## Par où commencer si tu ouvres ce dossier pour la première fois

Lis dans cet ordre :

| Fichier | Ce qu'il contient |
|---|---|
| `docs/plan-etapes.md` | Le plan de travail, étape par étape, avec ce que tu verras marcher à la fin de chacune |
| `docs/modele-donnees.md` | Tout ce que l'application mémorise, en français, sans jargon |
| `docs/authentification.md` | Comment marche la connexion par numéro de téléphone, et le mot de passe oublié |
| `docs/couts.md` | Ce que ça coûte d'héberger l'application, et ce qui peut devenir cher |
| `docs/points-juridiques-a-valider.md` | Les questions à poser à ton juriste |
| `contenu-juridique/` | Un fichier par document légal, à remplir avec les textes validés |
| `JOURNAL.md` | Ce qui a été fait, quand, et pourquoi |

---

## Lancer le projet sur ton ordinateur

*Cette section sera remplie à l'étape 1, quand le projet existera. Pour l'instant il n'y a
rien à lancer.*

Elle contiendra, une commande à la fois :
1. comment installer les outils nécessaires,
2. comment récupérer le projet,
3. comment le démarrer,
4. ce que tu dois voir à l'écran quand ça marche.

---

## Où sont les fichiers importants

*Sera rempli au fur et à mesure. Chaque fois que je crée un fichier que tu pourrais avoir
besoin de retrouver, je l'ajoute ici avec une phrase expliquant à quoi il sert.*

---

## Les modifications les plus courantes

*Sera rempli au fur et à mesure. On y trouvera par exemple : changer le texte d'une clause,
ajouter une ville à la liste, modifier le délai de préavis par défaut, changer le logo sur
les quittances.*

---

## Deux règles de sécurité qui ne changeront jamais

1. **Aucune clé secrète dans le projet.** Les mots de passe d'accès à la base de données
   vivent dans un fichier `.env.local` qui reste sur ton ordinateur et ne part jamais sur
   internet. Si je te demande une clé, elle va là et nulle part ailleurs.
2. **La sécurité est dans la base, pas dans l'écran.** Cacher un bouton ne protège rien.
   Le refus d'accès aux données d'un autre bailleur vient de la base de données elle-même.
   On le vérifiera ensemble à l'étape 2.

---

## Ce que l'application ne fera pas en version 1

- Pas de paiement Mobile Money automatique (prévu ensuite, l'architecture est prête).
- Pas de signature électronique avec certificat agréé (niveau 2, prévu ensuite).
- **Aucun abonnement, aucune facturation, aucune limite artificielle.** L'application est
  entièrement gratuite pour ses utilisateurs.
- Pas d'application à télécharger sur les magasins : le site s'installe directement sur
  l'écran d'accueil du téléphone.
- Pas de comptabilité ni de fiscalité automatisée.
- Pas de recherche de logement ni de mise en relation. On gère l'existant.
