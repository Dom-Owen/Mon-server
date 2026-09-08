import { Coquille } from "@/components/coquille";
import { Bloc, Statut, Vide } from "@/components/ui";
import { Televerseur } from "@/components/televerseur";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { bauxDuProprietaire, nomLogement } from "@/lib/requetes";
import { dateLongue, fcfa } from "@/lib/format";
import { actionCreerIncident, actionMajIncident } from "@/lib/actions/incidents";

export default async function Incidents() {
  const ctx = await exigerContexte();
  const base = db();

  const incidents = base
    .prepare(
      `SELECT i.*, l.nom AS locataire_nom, bi.nom AS bien_nom, u.libelle AS unite_libelle,
              u.unique_du_bien, p.nom AS auteur
       FROM incidents i
       LEFT JOIN baux b ON b.id = i.bail_id
       LEFT JOIN locataires l ON l.id = b.locataire_id
       LEFT JOIN unites u ON u.id = i.unite_id
       LEFT JOIN biens bi ON bi.id = u.bien_id
       LEFT JOIN profils p ON p.id = i.signale_par
       WHERE i.proprietaire_id = ?
       ORDER BY CASE i.statut WHEN 'ouvert' THEN 0 WHEN 'en_cours' THEN 1 ELSE 2 END,
                i.cree_le DESC`,
    )
    .all(ctx.proprietaireActif) as any[];

  const baux = bauxDuProprietaire(ctx.proprietaireActif);

  return (
    <Coquille
      ctx={ctx}
      actif="/app/plus"
      titre="Incidents"
      retour={{ href: "/app/plus", libelle: "Plus" }}
    >
      <div className="space-y-5">
        <Bloc titre="Signalements">
          {incidents.length === 0 ? (
            <Vide
              titre="Aucun incident"
              texte="Les pannes signalées par vous ou par vos locataires apparaîtront ici, avec leurs photos."
            />
          ) : (
            <div className="space-y-3">
              {incidents.map((i) => (
                <div key={i.id} className="carte p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">{i.titre}</div>
                      <div className="text-sm text-encre-doux">
                        {i.unique_du_bien ? i.bien_nom : `${i.bien_nom} — ${i.unite_libelle}`}
                        {i.locataire_nom ? ` · ${i.locataire_nom}` : ""}
                      </div>
                      <div className="text-sm text-encre-doux">
                        Signalé le {dateLongue(i.cree_le)}
                        {i.auteur ? ` par ${i.auteur}` : ""}
                      </div>
                      {i.description && <p className="text-[15px] mt-2">{i.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <Statut valeur={i.statut} />
                      {i.priorite === "haute" && (
                        <div className="mt-1">
                          <span className="jeton-rouge">Urgent</span>
                        </div>
                      )}
                      {i.cout ? (
                        <div className="mt-1 font-semibold tabular-nums text-sm">{fcfa(i.cout)}</div>
                      ) : null}
                    </div>
                  </div>

                  {i.statut !== "resolu" && (
                    <form action={actionMajIncident} className="mt-3 grid sm:grid-cols-4 gap-2 items-end">
                      <input type="hidden" name="id" value={i.id} />
                      <div>
                        <label className="etiquette text-xs">Statut</label>
                        <select name="statut" className="champ py-2" defaultValue={i.statut}>
                          <option value="ouvert">Ouvert</option>
                          <option value="en_cours">En cours</option>
                          <option value="resolu">Résolu</option>
                        </select>
                      </div>
                      <div>
                        <label className="etiquette text-xs">Prestataire</label>
                        <input name="prestataire" className="champ py-2" defaultValue={i.prestataire ?? ""} />
                      </div>
                      <div>
                        <label className="etiquette text-xs">Coût (FCFA)</label>
                        <input
                          name="cout"
                          type="number"
                          inputMode="numeric"
                          className="champ py-2"
                          defaultValue={i.cout ?? ""}
                        />
                      </div>
                      <button type="submit" className="bouton-second py-2">
                        Mettre à jour
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </Bloc>

        {baux.length > 0 && (
          <Bloc titre="Signaler un incident">
            <form action={actionCreerIncident} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="etiquette" htmlFor="bail_id">
                    Logement concerné
                  </label>
                  <select id="bail_id" name="bail_id" className="champ" required>
                    {baux.map((b) => (
                      <option key={b.id} value={b.id}>
                        {nomLogement(b)} — {b.locataire_nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="etiquette" htmlFor="priorite">
                    Priorité
                  </label>
                  <select id="priorite" name="priorite" className="champ" defaultValue="normale">
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Urgente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="etiquette" htmlFor="titre">
                  Quel est le problème ?
                </label>
                <input
                  id="titre"
                  name="titre"
                  className="champ"
                  placeholder="Fuite d'eau dans la douche"
                  required
                />
              </div>
              <div>
                <label className="etiquette" htmlFor="description">
                  Détails
                </label>
                <textarea id="description" name="description" rows={3} className="champ" />
              </div>
              <Televerseur nom="photos" etiquette="Photos" multiple />
              <button type="submit" className="bouton-second">
                Enregistrer l'incident
              </button>
            </form>
          </Bloc>
        )}
      </div>
    </Coquille>
  );
}
