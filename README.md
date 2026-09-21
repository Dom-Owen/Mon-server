# laloc

Application web de gestion locative pour les bailleurs particuliers et leurs locataires
au Cameroun. Centraliser ses biens, ses locataires, ses loyers et ses documents, et les
générer proprement en PDF, depuis un téléphone.

**État : version 1 complète, en démonstration.** Elle tourne sur votre ordinateur avec
des données d'exemple, sans aucun compte à créer.

---

## Voir la démonstration en trois commandes

Ouvrez le terminal dans ce dossier et tapez ces commandes **une par une**, en attendant
que chacune se termine.

**1. Installer ce dont l'application a besoin** (à faire une seule fois) :

```
npm install
```

**2. Démarrer l'application** :

```
npm run dev
```

**3. Ouvrir votre navigateur** à l'adresse :

```
http://localhost:3000
```

Sur la page de connexion, cliquez sur **« Ouvrir la démonstration »**. Vous arrivez dans
le compte d'Achille Mbarga, un bailleur de Douala avec un immeuble, une maison, une
boutique, quatre locataires et leurs paiements.

Pour arrêter l'application, revenez dans le terminal et appuyez sur `Ctrl` + `C`.

### Voir aussi le côté locataire

Déconnectez-vous, puis reconnectez-vous avec :

| Champ | Valeur |
|---|---|
| Numéro | `677 44 55 66` |
| Mot de passe | `demo1234` |

Vous verrez ce que voit Marie Ngo Bell : son bail, ses quittances, son solde, et les
boutons pour signaler un incident ou déposer un préavis.

### Voir sur votre téléphone

Sur le même wifi que l'ordinateur, ouvrez `http://ADRESSE-DE-L-ORDINATEUR:3000`.
Pour connaître cette adresse, tapez `hostname -I` sur Linux, ou `ipconfig` sur Windows.

---

## Ce que fait l'application

**Côté bailleur**

- Tableau de bord : encaissé du mois, impayés, préavis, baux qui finissent
- Biens et logements, avec un adressage camerounais (ville, quartier, point de repère)
- Locataires, particuliers ou entreprises, avec pièce d'identité et garant
- Baux, avec génération automatique de tout l'échéancier
- Paiements en trois gestes, avances sur plusieurs mois, paiements partiels
- Quatorze documents en PDF, numérotés, archivés, figés
- États des lieux pièce par pièce, avec photos et signature au doigt
- Charges : cinq modes, dont relevés de compteurs et répartition d'une facture commune
- Relances préparées automatiquement, envoi WhatsApp en un clic
- Mandataires avec droits délégués et révocables
- Journal de toutes les actions, impossible à modifier
- Export complet de toutes vos données en une archive

**Côté locataire**

Son logement, son bail, ses quittances, son historique de paiement, son solde, ses états
des lieux. Le dépôt d'un préavis et le signalement d'un incident avec photo. Aucune
possibilité de modifier quoi que ce soit.

---

## Où sont les fichiers importants

Vous n'avez pas besoin d'y toucher, mais voici la carte du projet.

| Dossier ou fichier | À quoi il sert |
|---|---|
| `src/app/` | Un dossier par écran de l'application |
| `src/app/app/` | Les écrans du bailleur |
| `src/app/locataire/` | L'espace du locataire |
| `src/components/` | Les morceaux réutilisés partout (boutons, cartes, formulaires) |
| `src/lib/db/schema.ts` | La liste de tout ce que l'application mémorise |
| `src/lib/domain/` | Les calculs : échéancier, imputation des paiements, montants en lettres |
| `src/lib/pdf/` | La fabrication des documents PDF |
| `src/lib/actions/` | Ce qui se passe quand vous validez un formulaire |
| `contenu-juridique/` | **Un fichier par document légal, à remplir avec vos textes validés** |
| `docs/` | Le modèle de données, le plan, les coûts, les questions juridiques |
| `donnees/` | La base de données de la démonstration (créée au premier lancement) |

---

## Les modifications les plus courantes

**Changer les délais de préavis, la caution, l'avance par défaut**
Dans l'application : *Plus → Réglages*. Rien n'est écrit en dur dans le code.

**Écrire les clauses de vos contrats**
Dans l'application : *Plus → Modèles de documents*. Les clauses vides sont marquées
« clause à fournir ». Le texte de référence se range aussi dans `contenu-juridique/`.

**Changer le texte des relances**
Dans l'application : *Plus → Relances*, en bas de page, en français et en anglais.

**Repartir de zéro**
Arrêtez l'application, supprimez le dossier `donnees/`, redémarrez. Tout est effacé et
vous pouvez recréer la démonstration.

**Changer les couleurs**
Dans `tailwind.config.ts`. La charte actuelle est beige avec un accent terre cuite.

---

## Deux règles de sécurité qui ne changeront jamais

1. **Aucune clé secrète dans le projet.** Elles vivent dans un fichier `.env.local` qui
   reste sur votre ordinateur et ne part jamais sur internet.
2. **La sécurité est dans les données, pas dans l'écran.** Cacher un bouton ne protège
   rien. Un mandataire à qui vous n'avez pas délégué la résiliation se voit refuser
   l'action côté serveur, pas seulement masquer le bouton.

---

## Mettre le site en ligne

Tout est prêt. La marche à suivre, clic par clic et sans aucune commande à taper, est
dans `docs/mise-en-ligne.md`.

Un point à connaître avant de commencer : en ligne, les données ne sont pas encore
conservées durablement. L'application fonctionne entièrement, mais les saisies
disparaissent au bout de quelques heures et un bandeau le dit à qui l'utilise. C'est
fait pour montrer le produit, pas encore pour y mettre de vrais loyers. La persistance
arrive avec la base Supabase, qui est l'étape suivante.

---

## Ce qui reste à faire avant une vraie mise en service

Ces points sont documentés en détail dans `docs/`.

1. **Faire valider les textes juridiques** par un juriste camerounais, et les saisir.
   Tant que ce n'est pas fait, chaque document porte la mention « modèle indicatif ».
2. **Passer de la base de démonstration à Supabase**, pour que les données vivent en
   ligne et non dans un fichier sur votre ordinateur. Toute la couche base est isolée
   dans `src/lib/db/` pour que ce changement ne touche rien d'autre.
3. **Mettre en ligne sur Vercel** et brancher un nom de domaine.
4. **La file d'attente hors ligne** : aujourd'hui l'application se consulte sans réseau,
   mais les saisies faites hors connexion ne sont pas encore mises en attente.

---

## Ce que l'application ne fait pas, volontairement

- Pas de paiement Mobile Money automatique. L'architecture est prête à l'accueillir :
  toute la logique d'encaissement passe par une seule interface.
- Pas de signature électronique avec certificat agréé. Le niveau 1 est en place, avec
  son dossier de preuve, et l'interface dit honnêtement ce qu'il vaut.
- **Aucun abonnement, aucune facturation, aucune limite par nombre de biens.**
  L'application est gratuite pour ses utilisateurs, et rien n'a été codé pour préparer
  le contraire.
- Pas d'application à télécharger : le site s'installe sur l'écran d'accueil du téléphone.
- Pas de comptabilité ni de fiscalité automatisée.
- Pas de recherche de logement. On gère l'existant, on ne fait pas une place de marché.
