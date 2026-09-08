import { Coquille } from "@/components/coquille";
import { Avertissement, Bloc, Erreur, Succes, Vide } from "@/components/ui";
import { Televerseur } from "@/components/televerseur";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { aujourdhui, dateLongue, fcfa } from "@/lib/format";
import { MODES_CHARGES } from "@/lib/cameroun";
import {
  actionCreerCompteur,
  actionRepartirFacture,
  actionSaisirReleve,
} from "@/lib/actions/charges";

export default async function Charges({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; ok?: string }>;
}) {
  const ctx = await exigerContexte();
  const { e, ok } = await searchParams;
  const base = db();

  const biens = base
    .prepare(
      `SELECT id, nom, ville, mode_charges FROM biens
       WHERE proprietaire_id = ? AND archive_le IS NULL ORDER BY nom`,
    )
    .all(ctx.proprietaireActif) as any[];

  const compteurs = base
    .prepare(
      `SELECT c.*, bi.nom AS bien_nom, u.libelle AS unite_libelle, u.unique_du_bien,
        (SELECT index_releve FROM releves r WHERE r.compteur_id = c.id ORDER BY r.date_releve DESC LIMIT 1) AS dernier_index,
        (SELECT date_releve FROM releves r WHERE r.compteur_id = c.id ORDER BY r.date_releve DESC LIMIT 1) AS derniere_date
       FROM compteurs c
       JOIN biens bi ON bi.id = c.bien_id
       LEFT JOIN unites u ON u.id = c.unite_id
       WHERE c.proprietaire_id = ? AND c.actif = 1 ORDER BY bi.nom`,
    )
    .all(ctx.proprietaireActif) as any[];

  const releves = base
    .prepare(
      `SELECT r.*, c.type, c.unite_mesure, bi.nom AS bien_nom, l.nom AS locataire_nom
       FROM releves r JOIN compteurs c ON c.id = r.compteur_id
       JOIN biens bi ON bi.id = c.bien_id
       LEFT JOIN baux b ON b.id = r.bail_id LEFT JOIN locataires l ON l.id = b.locataire_id
       WHERE c.proprietaire_id = ? ORDER BY r.date_releve DESC LIMIT 20`,
    )
    .all(ctx.proprietaireActif) as any[];

  const charges = base
    .prepare(
      `SELECT ch.*, l.nom AS locataire_nom FROM charges_locataire ch
       JOIN baux b ON b.id = ch.bail_id JOIN locataires l ON l.id = b.locataire_id
       WHERE b.proprietaire_id = ? ORDER BY ch.cree_le DESC LIMIT 20`,
    )
    .all(ctx.proprietaireActif) as any[];

  const communs = compteurs.filter((c) => c.portee === "commun");

  return (
    <Coquille
      ctx={ctx}
      actif="/app/plus"
      titre="Charges et compteurs"
      retour={{ href: "/app/plus", libelle: "Plus" }}
    >
      <div className="space-y-5">
        {e && <Erreur>{e}</Erreur>}
        {ok && <Succes>Enregistré.</Succes>}

        <Avertissement>
          Les charges apparaissent toujours <strong>séparément du loyer</strong> sur les avis et
          les quittances, jamais mélangées. Chaque bien a son propre mode de charges, réglé sur
          sa fiche.
        </Avertissement>

        <Bloc titre="Vos biens et leur mode de charges">
          <div className="space-y-2">
            {biens.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-sable-200 last:border-0"
              >
                <div>
                  <div className="font-semibold text-[15px]">{b.nom}</div>
                  <div className="text-sm text-encre-doux">{b.ville}</div>
                </div>
                <span className="jeton-neutre">
                  {MODES_CHARGES.find((m) => m.code === b.mode_charges)?.libelle ?? b.mode_charges}
                </span>
              </div>
            ))}
          </div>
        </Bloc>

        <Bloc titre="Vos compteurs">
          {compteurs.length === 0 ? (
            <Vide
              titre="Aucun compteur"
              texte="Ajoutez un compteur pour pouvoir saisir des relevés et refacturer la consommation au locataire."
            />
          ) : (
            <div className="space-y-2 mb-5">
              {compteurs.map((c) => (
                <div key={c.id} className="carte-douce p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[15px]">
                        {c.type === "eau" ? "Eau" : c.type === "electricite" ? "Électricité" : "Autre"}
                        {c.numero ? ` · ${c.numero}` : ""}
                      </div>
                      <div className="text-sm text-encre-doux">
                        {c.bien_nom}
                        {c.unite_libelle && !c.unique_du_bien ? ` — ${c.unite_libelle}` : ""}
                      </div>
                      <div className="text-sm text-encre-doux">
                        {c.tarif_unitaire} FCFA / {c.unite_mesure}
                        {c.dernier_index != null &&
                          ` · dernier index ${c.dernier_index} le ${dateLongue(c.derniere_date)}`}
                      </div>
                    </div>
                    <span className={c.portee === "commun" ? "jeton-ocre" : "jeton-terre"}>
                      {c.portee === "commun" ? "Commun" : "Individuel"}
                    </span>
                  </div>

                  {c.portee === "individuel" && (
                    <form action={actionSaisirReleve} className="mt-3 grid sm:grid-cols-4 gap-2 items-end">
                      <input type="hidden" name="compteur_id" value={c.id} />
                      <div className="sm:col-span-1">
                        <label className="etiquette text-xs">Nouvel index</label>
                        <input
                          name="index_releve"
                          type="number"
                          inputMode="numeric"
                          className="champ py-2"
                          required
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="etiquette text-xs">Date</label>
                        <input
                          name="date_releve"
                          type="date"
                          className="champ py-2"
                          defaultValue={aujourdhui()}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <Televerseur nom="photo" etiquette="Photo du compteur" />
                      </div>
                      <button type="submit" className="bouton-second py-2">
                        Enregistrer le relevé
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}

          <details>
            <summary className="cursor-pointer font-semibold text-sm text-encre-doux">
              Ajouter un compteur
            </summary>
            <form action={actionCreerCompteur} className="mt-3 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="etiquette">Bien</label>
                <select name="bien_id" className="champ" required>
                  {biens.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiquette">Type</label>
                <select name="type" className="champ" defaultValue="electricite">
                  <option value="electricite">Électricité (ENEO)</option>
                  <option value="eau">Eau</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="etiquette">Numéro du compteur</label>
                <input name="numero" className="champ" placeholder="ENEO-4471203" />
              </div>
              <div>
                <label className="etiquette">Portée</label>
                <select name="portee" className="champ" defaultValue="individuel">
                  <option value="individuel">Individuel, un seul logement</option>
                  <option value="commun">Commun, à répartir</option>
                </select>
              </div>
              <div>
                <label className="etiquette">Tarif unitaire (FCFA)</label>
                <input
                  name="tarif_unitaire"
                  type="number"
                  inputMode="numeric"
                  className="champ"
                  placeholder="99"
                />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="bouton-second">
                  Ajouter le compteur
                </button>
              </div>
            </form>
          </details>
        </Bloc>

        {communs.length > 0 && (
          <Bloc titre="Répartir une facture commune">
            <form action={actionRepartirFacture} className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="etiquette">Compteur</label>
                <select name="compteur_id" className="champ">
                  {communs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.bien_nom} — {c.numero ?? c.type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiquette">Montant total de la facture</label>
                <input name="montant" type="number" inputMode="numeric" className="champ" required />
              </div>
              <div>
                <label className="etiquette">Période</label>
                <input name="periode" type="month" className="champ" defaultValue={aujourdhui().slice(0, 7)} />
              </div>
              <div>
                <label className="etiquette">Clé de répartition</label>
                <select name="cle_repartition" className="champ" defaultValue="parts_egales">
                  <option value="parts_egales">Parts égales</option>
                  <option value="nb_occupants">Au nombre d'occupants</option>
                  <option value="pourcentages">Pourcentages que je définis</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Televerseur nom="justificatif" etiquette="Justificatif de la facture" />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="bouton-second">
                  Répartir entre les locataires
                </button>
              </div>
            </form>
          </Bloc>
        )}

        {releves.length > 0 && (
          <Bloc titre="Derniers relevés">
            <div className="space-y-2">
              {releves.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-sable-200 last:border-0"
                >
                  <div>
                    <div className="font-semibold text-[15px]">
                      {r.consommation} {r.unite_mesure}
                    </div>
                    <div className="text-sm text-encre-doux">
                      {r.bien_nom}
                      {r.locataire_nom ? ` · ${r.locataire_nom}` : ""} · {dateLongue(r.date_releve)}
                    </div>
                  </div>
                  <div className="font-semibold tabular-nums">{fcfa(r.montant ?? 0)}</div>
                </div>
              ))}
            </div>
          </Bloc>
        )}

        {charges.length > 0 && (
          <Bloc titre="Charges refacturées aux locataires">
            <div className="space-y-2">
              {charges.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-sable-200 last:border-0"
                >
                  <div>
                    <div className="font-semibold text-[15px]">{c.locataire_nom}</div>
                    <div className="text-sm text-encre-doux">{c.detail}</div>
                  </div>
                  <div className="font-semibold tabular-nums">{fcfa(c.montant)}</div>
                </div>
              ))}
            </div>
          </Bloc>
        )}
      </div>
    </Coquille>
  );
}
