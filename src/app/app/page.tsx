import Link from "next/link";
import { Coquille } from "@/components/coquille";
import { Bloc, Chiffre, Ligne, Montant, Statut, Vide } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import {
  bauxDuProprietaire,
  bauxQuiFinissent,
  impayes,
  nomLogement,
  resumeDuMois,
  situationBail,
} from "@/lib/requetes";
import { db } from "@/lib/db";
import { dateLongue, entier, moisLong, aujourdhui } from "@/lib/format";

export default async function TableauDeBord() {
  const ctx = await exigerContexte();
  const proprio = ctx.proprietaireActif;

  const resume = resumeDuMois(proprio);
  const baux = bauxDuProprietaire(proprio);
  const listeImpayes = impayes(proprio).slice(0, 5);
  const finissants = bauxQuiFinissent(proprio);
  const preavis = db()
    .prepare(
      `SELECT p.*, l.nom AS locataire_nom FROM preavis p
       JOIN baux b ON b.id = p.bail_id JOIN locataires l ON l.id = b.locataire_id
       WHERE b.proprietaire_id = ? AND p.statut IN ('depose','accepte')
       ORDER BY p.date_effet ASC`,
    )
    .all(proprio) as any[];

  const mois = moisLong(aujourdhui());
  const reste = Math.max(0, resume.attendu - resume.encaisse);

  if (resume.nb_unites === 0) {
    return (
      <Coquille ctx={ctx} actif="/app" titre={`Bonjour ${ctx.profil.nom.split(" ")[0]}`}>
        <Vide
          titre="Commençons par votre premier bien"
          texte="Ajoutez une maison, un studio ou un immeuble. Vous pourrez ensuite y installer vos locataires, même ceux qui sont déjà en place depuis des années."
          action={{ href: "/app/biens/nouveau", libelle: "Ajouter un bien" }}
        />
      </Coquille>
    );
  }

  return (
    <Coquille ctx={ctx} actif="/app" titre={`Bonjour ${ctx.profil.nom.split(" ")[0]}`}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Chiffre
            libelle={`Encaissé en ${mois.split(" ")[0]}`}
            valeur={<Montant valeur={resume.encaisse} taille="grand" ton="positif" />}
            detail={`sur ${entier(resume.attendu)} attendus`}
          />
          <Chiffre
            libelle="Reste à encaisser"
            valeur={<Montant valeur={reste} taille="grand" ton={reste > 0 ? "negatif" : "positif"} />}
            detail={reste === 0 ? "Tout est à jour" : `${listeImpayes.length} locataire(s)`}
          />
          <Chiffre
            libelle="Occupation"
            valeur={`${resume.taux_occupation} %`}
            detail={`${resume.nb_occupees} logement(s) occupé(s) sur ${resume.nb_unites}`}
          />
          <Chiffre
            libelle="Baux actifs"
            valeur={resume.nb_baux}
            detail={finissants.length ? `${finissants.length} finissent sous 90 jours` : "Aucun ne finit bientôt"}
          />
        </div>

        <Link href="/app/paiements/nouveau" className="bouton-principal w-full text-base py-4">
          Enregistrer un paiement
        </Link>

        {listeImpayes.length > 0 && (
          <Bloc
            titre="Impayés"
            action={
              <Link href="/app/impayes" className="lien text-sm font-semibold">
                Tout voir
              </Link>
            }
          >
            <div className="space-y-2.5">
              {listeImpayes.map((i) => (
                <Ligne
                  key={i.bail.id}
                  href={`/app/baux/${i.bail.id}`}
                  titre={i.bail.locataire_nom}
                  sousTitre={nomLogement(i.bail)}
                  droite={
                    <>
                      <Montant valeur={i.du} ton="negatif" />
                      <div className="text-xs text-encre-doux mt-0.5">
                        {i.jours > 0 ? `${i.jours} jour(s) de retard` : "Échue aujourd'hui"}
                      </div>
                    </>
                  }
                />
              ))}
            </div>
          </Bloc>
        )}

        {preavis.length > 0 && (
          <Bloc titre="Préavis en cours">
            <div className="space-y-2.5">
              {preavis.map((p) => (
                <Ligne
                  key={p.id}
                  href={`/app/baux/${p.bail_id}`}
                  titre={p.locataire_nom}
                  sousTitre={`Départ prévu le ${dateLongue(p.date_effet)}`}
                  droite={<Statut valeur={p.statut === "depose" ? "en_cours" : "resolu"} />}
                />
              ))}
            </div>
          </Bloc>
        )}

        {finissants.length > 0 && (
          <Bloc titre="Baux qui arrivent à échéance">
            <div className="space-y-2.5">
              {finissants.map((b) => (
                <Ligne
                  key={b.id}
                  href={`/app/baux/${b.id}`}
                  titre={b.locataire_nom}
                  sousTitre={nomLogement(b)}
                  droite={
                    <div className="text-sm font-semibold text-ocre">
                      {dateLongue(b.date_fin_prevue)}
                    </div>
                  }
                />
              ))}
            </div>
          </Bloc>
        )}

        <Bloc
          titre="Vos locations"
          action={
            <Link href="/app/biens" className="lien text-sm font-semibold">
              Mes biens
            </Link>
          }
        >
          {baux.length === 0 ? (
            <Vide
              titre="Aucun bail pour l'instant"
              texte="Ajoutez un locataire, puis créez son bail. Si le bail existe déjà sur papier, vous pourrez simplement le photographier."
              action={{ href: "/app/locataires/nouveau", libelle: "Ajouter un locataire" }}
            />
          ) : (
            <div className="space-y-2.5">
              {baux.map((b) => {
                const s = situationBail(b.id);
                return (
                  <Ligne
                    key={b.id}
                    href={`/app/baux/${b.id}`}
                    titre={b.locataire_nom}
                    sousTitre={nomLogement(b)}
                    droite={
                      s.du > 0 ? (
                        <>
                          <Montant valeur={s.du} ton="negatif" />
                          <div className="text-xs text-encre-doux mt-0.5">à recevoir</div>
                        </>
                      ) : (
                        <>
                          <span className="jeton-vert">À jour</span>
                          {s.a_jour_jusquau && (
                            <div className="text-xs text-encre-doux mt-1">
                              jusqu'au {dateLongue(s.a_jour_jusquau)}
                            </div>
                          )}
                        </>
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </Bloc>
      </div>
    </Coquille>
  );
}
