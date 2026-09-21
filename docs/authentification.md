# La connexion par numéro de téléphone

Ce document explique une contrainte technique que j'ai vérifiée avant de te répondre,
parce qu'elle touche au point le plus structurant de ton brief.

---

## Ce que tu demandes

L'identifiant de connexion est le **numéro de téléphone**, avec un mot de passe.
Pas de code par SMS en version 1, parce que chaque SMS coûte de l'argent. L'email reste
optionnel et ne bloque jamais.

C'est le bon choix. Au Cameroun, le numéro est l'identité réelle des gens ; l'email est
souvent une case qu'on a remplie une fois et qu'on ne consulte plus.

---

## Le problème

Supabase, l'outil que tu as choisi pour la base de données et les comptes, propose bien
une connexion par téléphone. Mais **il exige qu'un service d'envoi de SMS soit configuré
pour activer cette option**, même si on désactive la vérification par code. Il n'accepte
pas de stocker un numéro comme identifiant sans qu'un fournisseur de SMS soit branché.

Autrement dit : la fonction existe, mais on ne peut pas l'utiliser gratuitement.
Ce n'est pas une question de réglage, c'est un verrou du produit.

Source : [discussion officielle Supabase n°35448](https://github.com/orgs/supabase/discussions/35448)
et [documentation « Phone sign-in »](https://supabase.com/docs/guides/auth/phone-login).

---

## Ma solution

On garde ta règle telle quelle du point de vue de l'utilisateur, et on contourne le verrou
techniquement.

**Ce que voit l'utilisateur** : un champ « Numéro de téléphone » avec +237 pré-rempli, un
champ « Mot de passe ». Rien d'autre. Il n'a jamais connaissance d'une adresse email.

**Ce qui se passe derrière** : l'application transforme le numéro en une adresse technique
interne, de la forme `237691234567@comptes.<nom-du-site>`, et s'en sert comme identifiant
auprès de Supabase. Le vrai numéro est stocké normalement dans la fiche de l'utilisateur.
L'adresse technique n'est jamais affichée, jamais envoyée, jamais utilisée pour écrire à
qui que ce soit.

**L'email réel**, quand l'utilisateur en fournit un, est un champ à part dans sa fiche.
Il sert à recevoir des documents et à récupérer un mot de passe perdu. Il ne sert jamais
à se connecter.

**Ce que ça coûte** : rien.

**Ce que ça change plus tard** : le jour où tu voudras brancher un code par SMS ou par
WhatsApp, il suffira d'ajouter cette vérification par-dessus. Toute la logique de connexion
passe par un seul fichier prévu pour ça. Rien à réécrire ailleurs.

---

## Le format des numéros

- Saisie tolérante : `691234567`, `6 91 23 45 67`, `+237 691 23 45 67`, `00237691234567`
  sont tous acceptés et ramenés à la même forme.
- Stockage unique au format international : `+237691234567`.
- Vérification du format camerounais : mobile à neuf chiffres commençant par 6,
  fixe commençant par 2.
- Sélecteur de pays disponible pour la diaspora, avec +237 pré-sélectionné.

---

## Le mot de passe oublié — le vrai point faible

Sans email et sans SMS, il n'existe aucun canal automatique pour prouver qu'une personne
est bien elle-même. C'est la faiblesse structurelle de ce choix, et il faut la traiter de
front plutôt que de la découvrir le jour où un bailleur perd l'accès à ses contrats.

Ma recommandation, en trois niveaux qui se complètent :

### Niveau 1 — Le code de récupération, pour tout le monde
À l'inscription, l'application affiche **une fois** un code de douze caractères et demande
à l'utilisateur de le noter ou d'en faire une capture d'écran, avec une case à cocher
« je l'ai mis en lieu sûr ». Ce code permet de réinitialiser le mot de passe sans aucun
canal externe. C'est le même principe que les codes de secours d'une banque en ligne.

C'est gratuit, immédiat, et ça ne dépend de personne.

### Niveau 2 — Le bailleur réinitialise pour son locataire
Un locataire qui perd son mot de passe s'adresse à son bailleur, qui génère un nouveau lien
d'activation et le lui envoie par WhatsApp. Le locataire choisit alors un nouveau mot de
passe. Le bailleur ne connaît jamais le mot de passe de son locataire.

C'est la hiérarchie naturelle : c'est le bailleur qui a créé l'accès, c'est lui qui le
rétablit. Ça couvre la grande majorité des cas, parce que ce sont les locataires qui se
connecteront le plus rarement et oublieront le plus souvent.

### Niveau 3 — L'email, quand il existe
Si l'utilisateur a renseigné un email, le lien de réinitialisation classique fonctionne.
On l'encourage fortement à l'inscription, sans jamais l'imposer, en expliquant en une
phrase à quoi il sert.

### Ce que je te déconseille
**Les questions de sécurité.** Elles paraissent pratiques et elles sont mauvaises : les
réponses sont souvent devinables par l'entourage (le nom de jeune fille de la mère, le
quartier d'enfance), et les utilisateurs les oublient ou les orthographient différemment
six mois plus tard. Elles donnent une impression de sécurité sans en apporter.

### Une option à considérer quand même
Tu écartes le SMS parce qu'il coûte de l'argent. C'est juste **pour une connexion
quotidienne**. Mais pour la seule réinitialisation de mot de passe d'un bailleur, le volume
est minuscule : quelques envois par mois, même avec des centaines d'utilisateurs. À environ
50 FCFA le SMS, on parle de quelques centaines de francs par mois.

Je ne le mets pas dans la version 1 puisque tu l'as exclu. Mais si le niveau 1 te paraît
fragile, c'est l'option la plus solide pour un coût quasi nul, et l'architecture est
prévue pour l'accueillir sans réécriture.

---

## Le cas du locataire dont le bailleur crée le compte

Le bailleur saisit le numéro du locataire. À cet instant, **aucun compte n'est créé** :
seule une fiche locataire existe, comme une ligne dans un carnet.

Le bailleur clique sur « Donner l'accès », l'application fabrique un lien d'activation à
usage unique et ouvre WhatsApp avec le message prêt. Le locataire ouvre le lien, choisit
**lui-même** son mot de passe, et son compte est créé à ce moment-là.

Conséquence importante : le bailleur ne connaît jamais le mot de passe de son locataire,
et un locataire qui ne veut pas de compte reste parfaitement gérable dans l'application.
