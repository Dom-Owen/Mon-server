# Ce que ça coûte

Tu as décidé que l'application serait **entièrement gratuite pour ses utilisateurs**.
Aucun abonnement, aucune facturation, aucune limite artificielle : je ne coderai rien de
tel, même en préparation. En contrepartie, tu m'as demandé de garder un œil sur ce que
l'hébergement va te coûter, à toi. Voici les chiffres, vérifiés en septembre 2026.

---

## Les comptes à créer avant de commencer

| Outil | À quoi ça sert | Coût pour démarrer |
|---|---|---|
| **Supabase** | La base de données, les comptes utilisateurs, le stockage des photos et des PDF | Gratuit |
| **Vercel** | L'hébergement du site | Gratuit |
| **GitHub** | La sauvegarde du code (le compte existe déjà) | Gratuit |
| **Nom de domaine** | L'adresse du site | Environ 8 000 FCFA par an en `.com` |

Rien à payer pour construire et tester. Les coûts n'arrivent qu'avec les vrais
utilisateurs.

Sur le nom de domaine : le `.com` coûte une dizaine d'euros par an. Le `.cm` camerounais
est nettement plus cher, souvent plus de 50 euros par an. Je te recommande de prendre le
`.com` d'abord, et le `.cm` seulement si le projet prend.

---

## Les limites de la version gratuite

**Supabase, offre gratuite** : 500 Mo de base de données, **1 Go de stockage de fichiers**,
50 000 utilisateurs actifs par mois, 5 Go de trafic. Deux projets actifs au maximum.

**Un piège à connaître** : un projet gratuit **se met en veille après une semaine sans
activité**. Pendant la phase de construction, si tu ne testes rien pendant sept jours, le
site tombe et il faut le réveiller à la main. Ce n'est pas grave pour développer. C'est
inacceptable dès qu'un vrai bailleur s'en sert.

**Vercel, offre Hobby** : gratuite, mais **réservée à un usage personnel non commercial**.
Une application gratuite, sans publicité et sans revenu, entre plausiblement dans ce cadre.
Mais c'est une zone grise, et c'est Vercel qui tranche. Je préfère que tu le saches
maintenant plutôt que le jour où ils demandent de passer au plan payant.

---

## Le vrai poste de dépense : les photos

C'est là que ça se joue, et de très loin.

Un état des lieux sérieux, c'est cinq pièces et huit photos par pièce. Après compression
dans le navigateur avant l'envoi, comptons 200 Ko par photo.

| Élément | Poids estimé |
|---|---|
| Un état des lieux complet (40 photos) | 8 Mo |
| Entrée + sortie pour un bail | 16 Mo |
| Scan de la pièce d'identité | 0,5 Mo |
| Bail papier photographié | 2 Mo |
| Une année de quittances en PDF | 0,6 Mo |
| **Total pour la vie d'un bail** | **environ 20 Mo** |

Ce que ça donne à l'échelle :

| Nombre de baux gérés | Stockage nécessaire | Ce qu'il faut |
|---|---|---|
| 50 | 1 Go | La limite gratuite est atteinte |
| 500 | 10 Go | Supabase Pro suffit largement |
| 5 000 | 100 Go | Supabase Pro, limite incluse atteinte |
| 25 000 | 500 Go | Pro + environ 5 500 FCFA par mois de dépassement |

Autrement dit : **l'offre gratuite tient le temps d'une quinzaine de bailleurs, pas plus.**
Le stockage supplémentaire, lui, est bon marché : environ 13 FCFA par gigaoctet et par
mois au-delà de ce qui est inclus.

---

## Ce que ça coûtera en vrai

| Étape du projet | Coût mensuel |
|---|---|
| Construction et tests | 0 |
| Les tout premiers bailleurs (moins de 15) | 0, avec le risque de mise en veille |
| Dès que des gens s'en servent pour de bon | Supabase Pro, environ **16 000 FCFA par mois** |
| Si Vercel exige le plan Pro | + environ **13 000 FCFA par mois** |
| Au-delà de 5 000 baux | + le dépassement de stockage, quelques milliers de francs |

**Environ 30 000 FCFA par mois** une fois l'application réellement utilisée, sans aucun
revenu en face puisqu'elle est gratuite. Ce n'est pas énorme, mais ce n'est pas zéro, et
c'est une somme que tu paieras tous les mois indéfiniment. Autant l'avoir en tête
maintenant.

---

## Comment je vais limiter la facture

Ces choix sont techniques, ils ne changent rien pour l'utilisateur, et ils divisent la
dépense par cinq ou dix.

1. **Compresser les photos dans le navigateur avant l'envoi.** Une photo d'un téléphone
   Android récent fait 4 Mo. Redimensionnée à 1600 pixels de large et recompressée, elle
   fait 200 Ko et reste parfaitement lisible pour un état des lieux. C'est un facteur 20.
2. **Créer une miniature de chaque photo.** Les listes et les aperçus affichent la
   miniature de 20 Ko, jamais l'image complète. Ça économise surtout du trafic, qui est
   facturé plus cher que le stockage.
3. **Limiter le nombre et le poids des fichiers par état des lieux**, avec un message
   clair plutôt qu'un refus sec.
4. **Ne jamais stocker deux fois le même fichier**, en comparant leur empreinte numérique.
5. **Ne pas garder les PDF régénérables.** Une quittance déjà émise doit être conservée
   telle quelle, c'est une preuve. Un aperçu temporaire, non.

---

## Une décision qui t'appartient

L'application est gratuite, donc rien ne finance ces 30 000 FCFA mensuels. Trois voies
possibles, et il n'y en a pas de mauvaise :

- **Tu les payes**, comme un projet personnel utile. C'est le plus simple tant que le
  nombre d'utilisateurs reste modeste.
- **Tu cherches un financement** (association, subvention, mécène) si le projet grandit.
- **Tu ajoutes plus tard une contribution volontaire**, sans jamais brider l'application.

Je ne code rien qui prépare une facturation, comme tu l'as demandé. Mais je te signalerai
quand la barre des 15 bailleurs approchera, parce que c'est le moment où le choix devient
concret.

---

## Sources

- [Tarifs Supabase](https://supabase.com/pricing) et [analyse détaillée 2026](https://uibakery.io/blog/supabase-pricing)
- [Plan Vercel Hobby](https://vercel.com/docs/plans/hobby) et [la clause d'usage non commercial](https://justinmckelvey.com/blog/is-vercel-free)
