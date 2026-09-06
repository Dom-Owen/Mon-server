# Journal de bord du projet

Écrit pour toi, pas pour un développeur. Ce fichier raconte en français simple ce qui a été
fait, ce qui a été décidé et pourquoi. Mis à jour à la fin de chaque étape.

---

## 6 septembre 2026 — Refonte complète après ton nouveau brief

### Ce qui a changé
Ton nouveau brief est nettement plus complet que le précédent et modifie des choses de
fond. J'ai donc repris tous les documents à zéro plutôt que de les rapiécer.

Les changements qui ont le plus d'effet sur la construction :

| Avant | Maintenant |
|---|---|
| Un seul espace, pour le bailleur | Deux espaces : bailleur **et** locataire |
| Connexion par email | **Connexion par numéro de téléphone** |
| Trois rôles | Quatre : bailleur, mandataire, locataire, admin |
| Un utilisateur = un rôle | Un utilisateur peut être bailleur **et** locataire |
| Abonnement par unité envisagé | **Application entièrement gratuite**, rien de facturé |
| Deux ou trois documents | **Quatorze documents** à générer |
| Charges en forfait | **Cinq modes de charges**, dont les relevés de compteurs |
| Pas de signature | **Signature électronique avec dossier de preuve** |

J'ai supprimé du plan tout ce qui touchait à un abonnement ou à un comptage d'unités
facturables. Tu as été explicite : rien de tel, même en préparation.

### Ce que j'ai vérifié avant de te répondre
Un point technique décisif, que je ne voulais pas te donner de mémoire.

**Supabase exige qu'un service d'envoi de SMS soit configuré pour activer la connexion par
téléphone**, même en désactivant la vérification par code. Ta règle « téléphone + mot de
passe, sans SMS » ne peut donc pas être appliquée directement avec l'outil choisi.

La solution retenue est expliquée en détail dans `docs/authentification.md` : l'utilisateur
saisit son numéro et rien d'autre, l'application le transforme en identifiant interne
invisible. Coût : zéro. Et le jour où tu voudras ajouter un code par SMS ou par WhatsApp,
il n'y aura rien à réécrire.

J'ai aussi vérifié les tarifs d'hébergement réels plutôt que de te donner des ordres de
grandeur approximatifs. Ils sont dans `docs/couts.md`, avec le calcul du poids des photos
d'états des lieux, qui est de loin le premier poste de dépense.

### Ce que j'ai produit
Toujours **aucune ligne de code**, comme tu l'as demandé.

- `README.md` — le point d'entrée du projet, en français
- `docs/plan-etapes.md` — dix-huit étapes, avec ce que tu verras marcher à la fin de chacune
- `docs/modele-donnees.md` — tout ce que l'application mémorise, refondu
- `docs/authentification.md` — la connexion par téléphone et le mot de passe oublié
- `docs/couts.md` — les coûts réels, sources à l'appui
- `docs/points-juridiques-a-valider.md` — les questions transversales pour ton juriste
- `contenu-juridique/` — quatorze fichiers vides, un par document, à remplir avec les
  textes validés. **Aucun texte de loi inventé, aucun numéro d'article cité.**

### Les cinq changements que je propose dans ton découpage
Détaillés en bas de `docs/plan-etapes.md`. En résumé :

1. L'espace locataire **après** l'espace bailleur. Aucun locataire n'utilisera
   l'application si son bailleur ne s'en sert pas déjà.
2. Les quatorze documents en deux fois : les trois du quotidien tôt, les onze autres après.
3. La signature électronique après les documents, pas avec.
4. Le pré-remplissage automatique d'un bail scanné : hors version 1. Le téléversement du
   bail papier, lui, reste bien dans le parcours de démarrage.
5. Le mandataire : la structure de données dès le début, l'écran plus tard.

### En attente de ta réponse
Sept questions, posées dans la conversation. Chacune a une recommandation, tu peux
répondre « d'accord pour tes valeurs par défaut ».

### Prochaine étape
Étape 0 — choix du nom et création des comptes, dès que tu valides.

---

## 30 août 2026 — Première étude *(largement remplacée)*

Première analyse, sur la base du brief précédent. Le modèle de données et le découpage
produits ce jour-là ont été refondus le 6 septembre. Trois constats de cette première
étude restent valables et ont été repris tels quels :

1. **Un paiement ne se rattache pas à une échéance.** Un versement peut couvrir douze mois
   et une échéance peut recevoir plusieurs versements. Il faut une table intermédiaire qui
   dit « telle partie de tel paiement paie telle échéance ». C'est encore plus vrai avec ce
   nouveau brief, où l'avance d'un an est présentée comme la norme.
2. **Il faut une protection contre les doublons de paiement.** Quand un téléphone réessaie
   d'envoyer une saisie après une coupure de réseau, rien n'empêche le serveur de
   l'enregistrer deux fois.
3. **Il faut un solde de départ sur les baux.** Les bailleurs arrivent avec des locataires
   déjà en place et souvent des arriérés. Sans ce champ, l'écran des impayés est faux dès
   le premier jour.
