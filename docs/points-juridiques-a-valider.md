# Points juridiques à faire valider

Document à emmener chez ton juriste. Il ne contient **aucune réponse inventée**.

Les questions propres à chaque document sont dans `contenu-juridique/`, un fichier par
document. Ce fichier-ci rassemble les questions **transversales**, celles qui touchent
plusieurs écrans à la fois et que je dois trancher pour coder correctement.

---

## 1. Les valeurs que je dois rendre réglables

Je ne coderai aucune de ces valeurs en dur. Mais il me faut savoir, pour chacune, s'il
existe un plafond légal que l'application doit refuser de dépasser, ou si c'est une simple
valeur par défaut que le bailleur peut changer librement.

| Valeur | Question |
|---|---|
| Nombre de mois de caution | Plafond légal, ou libre ? |
| Nombre de mois de loyer d'avance | Encadré par un texte, ou usage ? |
| Durée du bail d'habitation | Minimum et maximum imposés ? |
| Préavis du locataire | Durée légale ? Cas de réduction ? |
| Préavis du bailleur | Durée légale ? Motifs exigés ? |
| Délai de restitution de la caution | Délai légal ? Pénalité de retard ? |
| Pénalités de retard de loyer | Autorisées ? Plafonnées ? |
| Révision du loyer en cours de bail | Périodicité, plafond, indice de référence ? |

**Ce que je fais en attendant ta réponse** : chaque valeur est un champ réglable, sans
plafond bloquant, avec un avertissement à l'écran disant que la valeur n'a pas encore été
validée juridiquement.

---

## 2. L'enregistrement des baux et la fiscalité

- Le bail doit-il être enregistré auprès de l'administration fiscale ? Dans quel délai ?
- À quel coût, et à la charge de qui ?
- Un timbre fiscal est-il exigé sur le bail ? Sur la quittance ?
- Existe-t-il une retenue à la source sur les revenus locatifs qui devrait apparaître sur
  les documents ?

> Le brief exclut toute comptabilité ou fiscalité automatisée de la version 1. Je ne
> calculerai donc rien. Mais si une mention fiscale est **obligatoire sur le document
> lui-même**, il faut que je le sache pour l'inclure dans le modèle.

---

## 3. La preuve et les canaux de communication

L'application privilégie WhatsApp, qui est le canal réel des gens. Il faut savoir ce que
ça vaut en cas de litige.

- Un message WhatsApp horodaté avec accusé de lecture constitue-t-il un commencement de
  preuve par écrit devant un tribunal camerounais ?
- La mise en demeure exige-t-elle une signification par huissier, ou une lettre
  recommandée, ou un envoi électronique suffit-il ?
- Faut-il que l'application conserve une preuve d'envoi particulière ? Sous quelle forme ?

**Ce que je fais en attendant** : chaque envoi est journalisé (date, canal, destinataire,
texte exact envoyé) et ce journal est exportable. Que ça suffise ou non juridiquement,
ça ne peut pas nuire.

---

## 4. La signature électronique

Tu m'as fourni la référence : article 17 de la loi n°2010/012 du 21 décembre 2010, qui
donne à la signature électronique **avancée** la valeur d'une signature manuscrite, une
signature avancée supposant un certificat délivré par une autorité agréée sous le contrôle
de l'ANTIC. Je reprends ta formulation, je n'y ajoute rien.

Questions restantes :

- La mention que nous affichons est-elle suffisamment claire pour écarter tout risque de
  tromperie ? Texte proposé : *« Signature avec dossier de preuve. Ne vaut pas signature
  électronique avancée au sens de la loi n°2010/012 du 21 décembre 2010. »*
- Un contrat de bail signé de cette manière est-il néanmoins recevable comme
  commencement de preuve, à défaut d'équivalence pleine ?
- Existe-t-il aujourd'hui une autorité de certification effectivement agréée au Cameroun
  auprès de laquelle nous pourrons brancher le niveau 2 ? Laquelle, et à quel coût ?

---

## 5. Les données personnelles — point que je soulève de moi-même

L'application va stocker des **scans de cartes nationales d'identité**, des photographies
de logements et des numéros de téléphone. C'est de la donnée sensible et c'est une
responsabilité réelle, indépendamment du droit locatif.

- Le Cameroun impose-t-il une déclaration ou une autorisation préalable pour un traitement
  de ce type ?
- Une durée de conservation maximale s'applique-t-elle après la fin d'un bail ?
- Le locataire a-t-il un droit d'accès, de rectification ou de suppression de ses données ?
- Faut-il recueillir un consentement écrit du locataire avant de scanner sa pièce
  d'identité ?

**Ce que je fais en attendant** : les scans de pièces d'identité sont rangés dans un
espace de stockage privé, jamais accessible par une adresse publique, avec un lien
temporaire de quelques minutes à chaque consultation. Seuls le bailleur propriétaire du
dossier, un mandataire expressément autorisé et le locataire lui-même peuvent les ouvrir.
L'administrateur de la plateforme n'y a pas accès depuis l'application.

---

## 6. Le statut du bailleur particulier

- Un particulier qui loue un ou plusieurs biens doit-il une immatriculation, un numéro de
  contribuable, ou une inscription quelconque pour délivrer des quittances valables ?
- La réponse change-t-elle à partir d'un certain nombre de biens ou d'un certain revenu ?

Cette question détermine si le formulaire d'inscription doit demander un numéro de
contribuable, et s'il doit être obligatoire ou facultatif.

---

## Comment on travaille en attendant les réponses

Rien de tout cela ne bloque le développement. Chaque point sans réponse devient un
paramètre réglable et un avertissement visible. Le jour où ton juriste répond, on remplace
l'avertissement par la règle, sans rien réécrire.

Ce qui serait dangereux, en revanche, c'est que l'application **prétende** appliquer une
règle que personne n'a vérifiée. C'est pour ça que la mention « modèle indicatif » reste
sur chaque document tant que tu ne me dis pas, document par document, qu'il a été validé.
