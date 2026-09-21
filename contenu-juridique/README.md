# Contenu juridique

**Ce dossier ne contient aucun texte de loi inventé.** Chaque fichier est un squelette
vide qui attend le texte que tu me fourniras, validé par un juriste camerounais.

## Pourquoi ce dossier existe séparément du code

Les clauses d'un contrat, les mentions obligatoires d'une quittance et les délais de
préavis ne sont pas des choix techniques. Ils changent avec la loi et avec l'avis d'un
conseil. Les mettre dans des fichiers à part permet de les corriger sans toucher au
fonctionnement de l'application, et permet à un juriste de les relire sans lire une seule
ligne de code.

## Comment remplir un fichier

Chaque fichier suit la même structure :

1. **Statut** — passe de « en attente » à « validé » quand ton juriste a relu.
2. **Paramètres** — les valeurs qui doivent rester réglables, jamais figées dans le code.
3. **Clauses** — le texte lui-même, article par article. C'est là que tu colles.
4. **Questions au juriste** — ce que je ne peux pas trancher seul.

Tu peux me donner les textes par morceaux. Rien ne bloque le développement : tant qu'un
fichier est vide, le document se génère avec un texte de remplacement visible qui dit
« clause à fournir », de sorte qu'on ne puisse jamais l'utiliser par erreur.

## Règle affichée sur tous les documents générés

> Modèle indicatif. À faire valider par un conseil juridique avant usage.

Cette mention reste jusqu'à ce que tu me dises explicitement, document par document,
que le texte a été validé.

## Ce que je ne ferai jamais

- Inventer un numéro de loi, d'article ou de décret.
- Reprendre un automatisme du droit locatif français (préavis de trois mois, encadrement
  des loyers, diagnostics obligatoires, loi ALUR). L'application vise le droit camerounais.
- Coder en dur un délai, un plafond de caution ou un nombre de mois d'avance.
