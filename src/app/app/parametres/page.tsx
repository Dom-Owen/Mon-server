import { Coquille } from "@/components/coquille";
import { Avertissement, Bloc, Succes } from "@/components/ui";
import { Televerseur } from "@/components/televerseur";
import { exigerContexte } from "@/lib/session";
import { parametresDe } from "@/lib/requetes";
import { LISTE_VILLES } from "@/lib/cameroun";
import { afficherTelephone } from "@/lib/format";
import { actionEnregistrerParametres } from "@/lib/actions/parametres";
import { actionDeconnexion } from "@/lib/actions/auth";

export default async function Parametres({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const ctx = await exigerContexte();
  const { ok } = await searchParams;
  const p = parametresDe(ctx.proprietaireActif);

  return (
    <Coquille
      ctx={ctx}
      actif="/app/plus"
      titre="Réglages"
      retour={{ href: "/app/plus", libelle: "Plus" }}
    >
      <form action={actionEnregistrerParametres} className="space-y-5">
        {ok && <Succes>Vos réglages sont enregistrés.</Succes>}

        <Bloc titre="Ce qui figure sur vos documents">
          <div className="space-y-4">
            <div>
              <label className="etiquette" htmlFor="raison_sociale">
                Nom à faire figurer sur les quittances
              </label>
              <input
                id="raison_sociale"
                name="raison_sociale"
                className="champ"
                defaultValue={p.raison_sociale ?? ctx.profil.nom}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="etiquette" htmlFor="ville">
                  Ville
                </label>
                <select id="ville" name="ville" className="champ" defaultValue={p.ville ?? "Douala"}>
                  {LISTE_VILLES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiquette" htmlFor="quartier">
                  Quartier
                </label>
                <input id="quartier" name="quartier" className="champ" defaultValue={p.quartier ?? ""} />
              </div>
              <div>
                <label className="etiquette" htmlFor="telephone">
                  Téléphone
                </label>
                <input
                  id="telephone"
                  name="telephone"
                  type="tel"
                  className="champ"
                  defaultValue={p.telephone ?? ctx.profil.telephone}
                />
              </div>
              <div>
                <label className="etiquette" htmlFor="email">
                  Email
                </label>
                <input id="email" name="email" type="email" className="champ" defaultValue={p.email ?? ""} />
              </div>
              <div>
                <label className="etiquette" htmlFor="numero_contribuable">
                  Numéro de contribuable
                </label>
                <input
                  id="numero_contribuable"
                  name="numero_contribuable"
                  className="champ"
                  defaultValue={p.numero_contribuable ?? ""}
                />
              </div>
              <div>
                <label className="etiquette" htmlFor="langue">
                  Langue par défaut
                </label>
                <select id="langue" name="langue" className="champ" defaultValue={p.langue ?? "fr"}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <Televerseur nom="logo" etiquette="Votre logo" valeurInitiale={p.logo ?? ""} />
            <Televerseur
              nom="signature_scannee"
              etiquette="Votre signature scannée"
              valeurInitiale={p.signature_scannee ?? ""}
              aide="Photographiez votre signature sur une feuille blanche."
            />
          </div>
        </Bloc>

        <Bloc titre="Règles de vos baux">
          <Avertissement>
            <strong>Aucune de ces valeurs n'est une règle de droit codée dans laloc.</strong> Ce
            sont vos réglages. Faites-les valider par un juriste camerounais, puis ajustez-les
            ici. Tant que ce n'est pas fait, vos documents portent la mention « modèle indicatif ».
          </Avertissement>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="etiquette" htmlFor="preavis_locataire_mois">
                Préavis du locataire (mois)
              </label>
              <input
                id="preavis_locataire_mois"
                name="preavis_locataire_mois"
                type="number"
                min={0}
                max={12}
                className="champ"
                defaultValue={p.preavis_locataire_mois}
              />
            </div>
            <div>
              <label className="etiquette" htmlFor="preavis_bailleur_mois">
                Préavis du bailleur (mois)
              </label>
              <input
                id="preavis_bailleur_mois"
                name="preavis_bailleur_mois"
                type="number"
                min={0}
                max={12}
                className="champ"
                defaultValue={p.preavis_bailleur_mois}
              />
            </div>
            <div>
              <label className="etiquette" htmlFor="mois_caution_defaut">
                Caution par défaut (mois de loyer)
              </label>
              <input
                id="mois_caution_defaut"
                name="mois_caution_defaut"
                type="number"
                min={0}
                max={12}
                className="champ"
                defaultValue={p.mois_caution_defaut}
              />
            </div>
            <div>
              <label className="etiquette" htmlFor="mois_avance_defaut">
                Avance par défaut (mois de loyer)
              </label>
              <input
                id="mois_avance_defaut"
                name="mois_avance_defaut"
                type="number"
                min={0}
                max={24}
                className="champ"
                defaultValue={p.mois_avance_defaut}
              />
            </div>
            <div>
              <label className="etiquette" htmlFor="delai_restitution_caution_jours">
                Délai de restitution de la caution (jours)
              </label>
              <input
                id="delai_restitution_caution_jours"
                name="delai_restitution_caution_jours"
                type="number"
                min={0}
                className="champ"
                defaultValue={p.delai_restitution_caution_jours}
              />
            </div>
            <div>
              <label className="etiquette" htmlFor="jours_rappel_avant_echeance">
                Rappel avant échéance (jours)
              </label>
              <input
                id="jours_rappel_avant_echeance"
                name="jours_rappel_avant_echeance"
                type="number"
                min={0}
                max={30}
                className="champ"
                defaultValue={p.jours_rappel_avant_echeance}
              />
            </div>
            <div>
              <label className="etiquette" htmlFor="jours_avant_relance_retard">
                Relance après retard (jours)
              </label>
              <input
                id="jours_avant_relance_retard"
                name="jours_avant_relance_retard"
                type="number"
                min={0}
                max={60}
                className="champ"
                defaultValue={p.jours_avant_relance_retard}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="etiquette" htmlFor="mention_legale_documents">
              Mention en bas de chaque document
            </label>
            <textarea
              id="mention_legale_documents"
              name="mention_legale_documents"
              rows={2}
              className="champ"
              defaultValue={p.mention_legale_documents ?? ""}
            />
            <p className="aide">
              Ne retirez cette mention que lorsqu'un juriste a validé vos modèles.
            </p>
          </div>
        </Bloc>

        <button type="submit" className="bouton-principal w-full">
          Enregistrer mes réglages
        </button>
      </form>

      <div className="mt-6 space-y-5">
        <Bloc titre="Mon compte">
          <dl className="text-[15px] space-y-2">
            <div>
              <dt className="text-sm text-encre-doux">Nom</dt>
              <dd className="font-semibold">{ctx.profil.nom}</dd>
            </div>
            <div>
              <dt className="text-sm text-encre-doux">Identifiant de connexion</dt>
              <dd className="font-semibold">{afficherTelephone(ctx.profil.telephone)}</dd>
            </div>
          </dl>
          <form action={actionDeconnexion} className="mt-4">
            <button type="submit" className="bouton-second">
              Se déconnecter
            </button>
          </form>
        </Bloc>
      </div>
    </Coquille>
  );
}
