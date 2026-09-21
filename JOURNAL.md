# Journal de bord du projet

Écrit pour toi, pas pour un développeur. Ce fichier raconte en français simple ce qui a
été fait, ce qui a été décidé et pourquoi. Mis à jour à la fin de chaque étape.

---

## 8 septembre 2026 — La version 1 est construite et testée

### Ce qui existe maintenant
Une application complète qui tourne. Le nom retenu est **laloc**, la charte est beige
avec un accent terre cuite. Quarante-deux écrans, deux espaces (bailleur et locataire),
quatorze documents en PDF.

Pour la voir : `npm install`, puis `npm run dev`, puis ouvrir `http://localhost:3000`
et cliquer sur « Ouvrir la démonstration ». Le README explique tout, commande par commande.

### Ce qui a été vérifié, et comment
Deux recettes automatiques déroulent l'application dans un vrai navigateur, comme le
ferait une personne. Elles sont dans `tests/` et tu peux les relancer toi-même.

**Recette 1, le scénario complet de ton cahier des charges : 15 étapes sur 15.**
Création de compte par téléphone, immeuble à 3 studios, locataire avec pièce d'identité,
bail à 60 000 FCFA, échéancier généré tout seul, paiement partiel de 40 000 donnant un
**reçu**, solde de 20 000 donnant une **quittance**, PDF qui s'ouvre, bouton WhatsApp
avec le bon numéro, studio passé en « occupé », et consultation hors connexion.

**Recette 2, le reste : 16 étapes sur 16.**
Tableau de bord, état des lieux pièce par pièce avec signature au doigt, figeage
définitif, relances préparées automatiquement, export ZIP, journal des actions, espace
locataire, et surtout la vérification qu'un locataire ne voit **rien** des autres.

### Quatre vrais défauts trouvés et corrigés pendant les tests
Ils méritent d'être notés, parce que trois d'entre eux étaient invisibles à l'œil nu.

1. **Les montants qui ne sont pas des multiples ronds étaient refusés.** Les champs de
   saisie avaient un « pas » de 5 000, ce qui rendait 62 500 FCFA invalide : le
   navigateur bloquait l'envoi du formulaire **sans afficher le moindre message**. Un
   bailleur avec un loyer inhabituel serait resté coincé sans comprendre. Corrigé
   partout : en francs CFA, tout nombre entier est désormais accepté.

2. **Les espaces des montants sortaient en barres obliques dans les PDF.** J'utilisais
   une espace fine insécable qui n'existe pas dans l'encodage des documents PDF :
   « 150 000 FCFA » s'imprimait « 150 /000 /FCFA ». Corrigé.

3. **Les dates sautaient d'un jour en fin de soirée.** Une quittance émise à 23 h portait
   la date du lendemain à un endroit et celle du jour à un autre. Tous les horodatages
   sont maintenant ramenés à l'heure de Douala avant d'être affichés.

4. **Un locataire pur se voyait proposer « Mes biens ».** Le lien menait à un écran de
   bailleur vide. On n'est désormais bailleur que si l'on possède réellement un bien.

### Le « e » de « cent »
Petit détail qui dit le soin apporté : « 1 500 000 » s'écrit « un million cinq **cent**
mille », sans s, parce que « mille » est un adjectif numéral. Mais « deux **cents**
millions » en prend un, parce que « million » est un nom. Vingt et un cas de test
couvrent cette règle et les autres pièges des nombres en français.

### Ce que je n'ai pas fait, et pourquoi
- **Aucun texte juridique inventé.** Les clauses des contrats sont des emplacements
  vides, marqués en jaune dans l'écran des modèles. Chaque document porte la mention
  « modèle indicatif ». Le dossier `contenu-juridique/` attend tes textes validés.
- **Aucun module d'abonnement ou de facturation**, comme tu l'as demandé, pas même en
  préparation.
- **La saisie hors connexion n'est pas encore mise en file d'attente.** L'application se
  *consulte* sans réseau, mais une saisie faite hors ligne n'est pas encore rejouée au
  retour de la connexion. C'est le dernier chantier, et tu l'avais toi-même mis en
  dernier.
- **Pas de pré-remplissage automatique d'un bail scanné.** Le téléversement du bail
  papier, lui, est bien là.

### Ce qui reste avant une vraie mise en service
1. Faire valider les textes juridiques et les saisir.
2. Passer de la base de démonstration à Supabase. Toute la couche base est isolée dans
   `src/lib/db/` pour que ce changement ne touche rien d'autre.
3. Mettre en ligne sur Vercel et brancher le nom de domaine.
4. La file d'attente hors ligne.

### Prochaine étape
Tu regardes la démonstration et tu me dis ce qui cloche. Il y aura des choses : c'est
normal et c'est le but.

---

## 6 septembre 2026 — Refonte du cadrage

Ton nouveau brief a modifié des choses de fond : deux espaces au lieu d'un, connexion par
numéro de téléphone, quatre rôles cumulables, application entièrement gratuite, quatorze
documents, cinq modes de charges, signature électronique. J'ai repris tous les documents
de cadrage plutôt que de les rapiécer.

**Le point technique vérifié ce jour-là, qui a tenu :** Supabase exige qu'un service
d'envoi de SMS soit branché pour activer la connexion par téléphone, même sans code de
vérification. La solution retenue est expliquée dans `docs/authentification.md`.
Dans la démonstration actuelle, la connexion par numéro fonctionne sans aucun SMS et
sans aucun coût.

**Les cinq changements de découpage proposés** ont tous été suivis : espace locataire
après l'espace bailleur, documents en deux fois, signature après les documents, pas de
lecture automatique des scans, structure du mandataire dès le début.

---

## 30 août 2026 — Première étude

Première analyse sur la base du brief précédent. Trois constats de ce jour-là ont
structuré tout le reste, et se retrouvent dans le code d'aujourd'hui :

1. **Un paiement ne se rattache pas à une échéance** mais au bail, avec une table
   d'imputations. C'est ce qui rend possible l'avance d'un an, qui est la norme au
   Cameroun, et le paiement fractionné.
2. **Une protection contre les doublons de paiement** est indispensable, car un
   téléphone qui réessaie après une coupure enregistrerait l'argent deux fois.
3. **Un solde de départ sur les baux**, parce que les bailleurs arrivent avec des
   locataires déjà en place et souvent des arriérés.
