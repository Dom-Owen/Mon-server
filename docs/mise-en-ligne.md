# Mettre laloc en ligne

Objectif : une vraie adresse web que tu ouvres sur ton téléphone et que tu montres à
quelqu'un. **Aucune commande à taper.** Tout se fait avec des clics, dans le navigateur.

Compte environ dix minutes la première fois.

---

## Avant de commencer : ce que tu obtiens, et ce que tu n'obtiens pas

| | |
|---|---|
| Une adresse web publique | ✅ |
| L'application installable sur l'écran d'accueil du téléphone | ✅ |
| Les PDF, WhatsApp, états des lieux, export : tout fonctionne | ✅ |
| **Les données conservées durablement** | ❌ **pas encore** |

**Le point important.** laloc range ses données dans un fichier. Un hébergeur comme
Vercel ne garde pas les fichiers entre deux redémarrages : tes saisies disparaîtront au
bout de quelques heures, ou plus tôt s'il y a du monde. Un bandeau noir en haut du site
le dit à qui l'utilise.

C'est parfait pour montrer l'application. Ce n'est pas encore un outil où mettre de vrais
loyers. Pour ça il faut l'étape suivante, la base Supabase, qui est un autre chantier.

---

## Étape 1 — Fusionner la branche

Le code vit aujourd'hui sur une branche à part. Il faut le ramener sur la branche
principale pour que l'hébergeur le trouve tout seul.

1. Ouvre la demande de fusion : https://github.com/Dom-Owen/Mon-server/pull/1
2. Clique sur le bouton vert **« Merge pull request »**, puis **« Confirm merge »**.

C'est tout. Si tu préfères ne pas fusionner, saute à la section « Si tu ne veux pas
fusionner » tout en bas.

---

## Étape 2 — Créer le compte Vercel

1. Va sur https://vercel.com
2. Clique **« Sign Up »** en haut à droite.
3. Choisis **« Continue with GitHub »**. C'est le plus simple : Vercel et GitHub se
   parlent directement, tu n'as rien à recopier.
4. Autorise Vercel quand GitHub te le demande.

Tu peux rester sur l'offre gratuite. Elle suffit largement pour montrer l'application.

---

## Étape 3 — Importer le projet

1. Sur ton tableau de bord Vercel, clique **« Add New… »** puis **« Project »**.
2. Dans la liste des dépôts, trouve **Mon-server** et clique **« Import »**.
   Si tu ne le vois pas, clique **« Adjust GitHub App Permissions »** et donne à Vercel
   l'accès à ce dépôt.
3. Vercel reconnaît Next.js tout seul. Ne touche à rien dans « Framework Preset » ni
   dans « Build Command ».

---

## Étape 4 — Ajouter la clé de sécurité

Avant de cliquer sur Deploy, déplie **« Environment Variables »** et ajoute une ligne :

| Champ | Ce que tu mets |
|---|---|
| Name (ou Key) | `LALOC_SECRET` |
| Value | une longue suite de caractères au hasard, par exemple 40 caractères que tu tapes toi-même |

À quoi ça sert : cette clé sert à signer les sessions. Sans elle, laloc utilise une clé
par défaut qui est publique, et n'importe qui pourrait se faire passer pour toi. Tu n'as
pas besoin de la retenir ni de la noter.

---

## Étape 5 — Déployer

Clique **« Deploy »** et attends. La première construction prend deux à trois minutes.

Quand c'est fini, Vercel affiche une adresse du type
`https://mon-server-xxxx.vercel.app`. Clique dessus.

**Tu dois voir** la page de connexion de laloc, avec le bandeau noir de démonstration en
haut. Clique sur « Ouvrir la démonstration » et tu retrouves Achille Mbarga et ses biens.

---

## Étape 6 — L'installer sur ton téléphone

1. Ouvre l'adresse dans Chrome sur ton téléphone Android.
2. Menu (les trois points) → **« Ajouter à l'écran d'accueil »**.
3. L'icône laloc apparaît à côté de tes autres applications. Elle s'ouvre en plein écran,
   sans barre de navigateur.

Sur iPhone, c'est dans Safari : bouton Partager → « Sur l'écran d'accueil ».

---

## Ensuite : à chaque modification

Une fois branché, tu n'as plus rien à faire. Dès que le code change sur la branche
principale, Vercel reconstruit et met le site à jour tout seul, en deux minutes.

---

## Brancher un nom de domaine

Quand tu auras choisi et acheté un domaine :

1. Dans Vercel, ouvre le projet → **Settings** → **Domains**.
2. Tape ton domaine et clique **« Add »**.
3. Vercel affiche deux lignes à recopier chez le vendeur du domaine, dans la zone DNS.
4. Compte quelques minutes à quelques heures avant que ça marche.

Le `.com` coûte une dizaine d'euros par an. Le `.cm` camerounais est nettement plus cher.

---

## Si ça ne marche pas

**La construction échoue avec « No Next.js version detected ».**
La branche principale ne contient pas encore le code : l'étape 1 n'a pas été faite, ou
pas terminée. Retourne sur la demande de fusion et vérifie qu'elle est bien marquée
« Merged ».

**La page s'affiche mais « Ouvrir la démonstration » tourne dans le vide.**
Regarde dans Vercel → le projet → **Logs**. L'erreur y sera écrite en clair. Copie-la
moi telle quelle.

**Le site était rempli et il s'est vidé.**
C'est normal, c'est expliqué en haut de cette page. Les données ne sont pas conservées
tant que la base Supabase n'est pas branchée.

---

## Si tu ne veux pas fusionner la branche

Tu peux garder la branche séparée, mais il faut le dire à Vercel après l'import :

1. Projet → **Settings** → **Git**.
2. Dans **Production Branch**, remplace `main` par
   `claude/gestion-locative-cameroun-4z69lo`.
3. Clique **Save**.
4. Onglet **Deployments** → sur la ligne la plus récente, menu **⋯** → **Redeploy**.
