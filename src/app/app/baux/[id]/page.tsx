import Link from "next/link";
import { notFound } from "next/navigation";
import { Coquille } from "@/components/coquille";
import {
  Avertissement,
  Bloc,
  Chiffre,
  Erreur,
  Ligne,
  Montant,
  Statut,
  Succes,
} from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { bailParId, echeancesDuBail, nomLogement, situationBail, parametresDe } from "@/lib/requetes";
import { afficherTelephone, aujourdhui, dateLongue, fcfa, MODES_PAIEMENT } from "@/lib/format";
import { lienWhatsApp } from "@/lib/lien";
import {
  actionDeposerPreavis,
  actionReviserLoyer,
  actionTerminerBail,
} from "@/lib/actions/baux";
import { actionGenererDocumentBail, actionQuittanceEcheance } from "@/lib/actions/documents";

export default async function FicheBail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string; nouveau?: string }>;
}) {
  const ctx = await exigerContexte();
  const { id } = await params;
  const { e, nouveau } = await searchParams;

  const bail = bailParId(id);
  if (!bail || bail.proprietaire_id !== ctx.proprietaireActif) notFound();

  const s = situationBail(id);
  const echeances = echeancesDuBail(id);
  const p = parametresDe(ctx.proprietaireActif);

  const paiements = db()
    .prepare(
      `SELECT p.*, pr.nom AS encaisse_par_nom FROM paiements p
       LEFT JOIN profils pr ON pr.id = p.encaisse_par
       WHERE p.bail_id = ? ORDER BY p.date_encaissement DESC, p.cree_le DESC`,
    )
    .all(id) as any[];

  const documents = db()
    .prepare(
      `SELECT id, type, numero, emis_le, statut FROM documents_emis
       WHERE bail_id = ? ORDER BY emis_le DESC LIMIT 8`,
    )
    .all(id) as any[];

  const etatsDesLieux = db()
    .prepare(`SELECT id, type, date, statut FROM etats_des_lieux WHERE bail_id = ? ORDER BY date DESC`)
    .all(id) as any[];

  const enRetard = s.du > 0;
  const aVenir = echeances.filter((x) => x.date_echeance > aujourdhui()).slice(0, 3);
  const passees = echeances.filter((x) => x.date_echeance <= aujourdhui()).reverse();

  return (
    <Coquille
      ctx={ctx}
      actif="/app"
      titre={bail.locataire_nom}
      retour={{ href: "/app", libelle: "Accueil" }}
      action={
        <Link href={`/app/paiements/nouveau?bail=${id}`} className="bouton-principal">
          Encaisser
        </Link>
      }
    >
      <div className="space-y-5">
        {e && <Erreur>{e}</Erreur>}
        {nouveau && (
          <Succes>
            Bail créé. L'échéancier complet est généré et le logement est passé en « occupé ».
          </Succes>
        )}

        {/* Situation */}
        <div className="carte p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm text-encre-doux">{nomLogement(bail)}</div>
              <div className="text-sm text-encre-doux">
                {[bail.bien_quartier, bail.bien_ville].filter(Boolean).join(", ")}
              </div>
            </div>
            <div className="flex gap-2">
              <Statut valeur={bail.statut} />
              {bail.origine === "papier_importe" && (
                <span className="jeton-neutre">Bail papier importé</span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-sable-300">
            {enRetard ? (
              <>
                <div className="text-sm font-semibold text-encre-doux uppercase tracking-wide">
                  Doit
                </div>
                <div className="text-3xl font-bold text-brique tabular-nums">{fcfa(s.du)}</div>
                <div className="text-sm text-encre-doux">
                  {s.jours_retard > 0
                    ? `en retard depuis ${s.jours_retard} jour(s)`
                    : "échue aujourd'hui"}
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-encre-doux uppercase tracking-wide">
                  À jour
                </div>
                <div className="text-2xl font-bold text-vert">
                  {s.a_jour_jusquau ? `jusqu'au ${dateLongue(s.a_jour_jusquau)}` : "Aucun impayé"}
                </div>
                {s.solde_crediteur > 0 && (
                  <div className="text-sm text-encre-doux">
                    Solde en avance : {fcfa(s.solde_crediteur)}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={lienWhatsApp(
                bail.locataire_whatsapp || bail.locataire_telephone,
                enRetard
                  ? `Bonjour ${bail.locataire_nom},\n\nSauf erreur, votre solde pour ${nomLogement(bail)} est de ${fcfa(s.du)}.\n\nMerci de régulariser dès que possible.`
                  : `Bonjour ${bail.locataire_nom},\n\n`,
              )}
              target="_blank"
              rel="noreferrer"
              className="bouton-whatsapp py-2 px-3 text-sm"
            >
              WhatsApp
            </a>
            <a href={`tel:${bail.locataire_telephone}`} className="bouton-second py-2 px-3 text-sm">
              {afficherTelephone(bail.locataire_telephone)}
            </a>
            <Link
              href={`/app/locataires/${bail.locataire_id}`}
              className="bouton-doux py-2 px-3 text-sm"
            >
              Sa fiche
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Chiffre
            libelle="Loyer mensuel"
            valeur={<Montant valeur={bail.loyer_mensuel} taille="grand" />}
            detail={bail.charges_mensuelles > 0 ? `+ ${fcfa(bail.charges_mensuelles)} de charges` : "Charges comprises"}
          />
          <Chiffre
            libelle="Caution"
            valeur={<Montant valeur={bail.caution_versee} taille="grand" />}
            detail={
              bail.caution_versee < bail.montant_caution
                ? `sur ${fcfa(bail.montant_caution)} demandés`
                : "intégralement versée"
            }
          />
          <Chiffre libelle="Début du bail" valeur={dateLongue(bail.date_debut)} />
          <Chiffre
            libelle="Fin prévue"
            valeur={bail.date_fin_prevue ? dateLongue(bail.date_fin_prevue) : "—"}
            detail={`${bail.duree_mois} mois`}
          />
        </div>

        {/* Échéancier */}
        <Bloc titre="Échéancier">
          <div className="space-y-2">
            {passees.slice(0, 12).map((x) => (
              <div key={x.id} className="flex items-center justify-between gap-3 py-2 border-b border-sable-200 last:border-0">
                <div className="min-w-0">
                  <div className="font-semibold text-[15px] truncate">{x.libelle}</div>
                  <div className="text-xs text-encre-doux">
                    Échéance le {dateLongue(x.date_echeance)}
                    {x.reste > 0 && x.jours_retard > 0 && ` · ${x.jours_retard} jour(s)`}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold tabular-nums text-[15px]">
                    {x.reste === 0 ? fcfa(x.montant_attendu) : `${fcfa(x.reste)}`}
                  </div>
                  <div className="mt-1 flex items-center gap-2 justify-end">
                    <Statut valeur={x.statut} />
                    <form action={actionQuittanceEcheance}>
                      <input type="hidden" name="echeance_id" value={x.id} />
                      <button
                        type="submit"
                        className="text-xs font-semibold text-terre-fonce underline underline-offset-2"
                      >
                        {x.reste === 0 ? "Quittance" : x.impute > 0 ? "Reçu" : ""}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}

            {aVenir.length > 0 && (
              <div className="pt-3 mt-2 border-t border-sable-300">
                <div className="text-xs font-bold uppercase tracking-wide text-encre-pale mb-2">
                  À venir
                </div>
                {aVenir.map((x) => (
                  <div key={x.id} className="flex items-center justify-between gap-3 py-1.5">
                    <div className="text-[15px] text-encre-doux">{x.libelle}</div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-[15px]">{fcfa(x.reste)}</span>
                      <Statut valeur={x.statut} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Bloc>

        {/* Paiements */}
        <Bloc
          titre="Ses paiements"
          action={
            <Link href={`/app/paiements/nouveau?bail=${id}`} className="lien text-sm font-semibold">
              Encaisser
            </Link>
          }
        >
          {paiements.length === 0 ? (
            <p className="sous-titre text-sm">Aucun paiement enregistré pour l'instant.</p>
          ) : (
            <div className="space-y-2.5">
              {paiements.slice(0, 10).map((x) => (
                <Ligne
                  key={x.id}
                  href={`/app/paiements/${x.id}`}
                  titre={`${dateLongue(x.date_encaissement)}`}
                  sousTitre={`${MODES_PAIEMENT[x.mode] ?? x.mode}${x.encaisse_par_nom ? ` · encaissé par ${x.encaisse_par_nom}` : ""}`}
                  droite={
                    <>
                      <Montant valeur={x.montant} ton={x.statut === "annule" ? "doux" : "positif"} />
                      {x.statut === "annule" && (
                        <div className="mt-1">
                          <span className="jeton-rouge">Annulé</span>
                        </div>
                      )}
                    </>
                  }
                />
              ))}
            </div>
          )}
        </Bloc>

        {/* Documents */}
        <Bloc
          titre="Documents"
          action={
            <Link href="/app/documents" className="lien text-sm font-semibold">
              Tous
            </Link>
          }
        >
          {documents.length > 0 && (
            <div className="space-y-2 mb-4">
              {documents.map((d) => (
                <Link
                  key={d.id}
                  href={`/app/documents/${d.id}`}
                  className="flex items-center justify-between gap-3 py-2 border-b border-sable-200 last:border-0"
                >
                  <div>
                    <div className="font-semibold text-[15px]">{d.numero}</div>
                    <div className="text-xs text-encre-doux">{dateLongue(d.emis_le)}</div>
                  </div>
                  <Statut valeur={d.statut} />
                </Link>
              ))}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-2">
            {[
              ["bail", "Contrat de bail"],
              ["avis_echeance", "Avis d'échéance"],
              ["relance", "Lettre de relance"],
              ["mise_en_demeure", "Mise en demeure"],
              ["recu_caution", "Reçu de caution"],
              ["attestation", "Attestation de résidence"],
              ["conge", "Congé au locataire"],
              ["avenant", "Avenant au bail"],
            ].map(([type, libelle]) => (
              <form key={type} action={actionGenererDocumentBail}>
                <input type="hidden" name="bail_id" value={id} />
                <input type="hidden" name="type" value={type} />
                <button type="submit" className="bouton-second w-full py-2.5 text-sm">
                  {libelle}
                </button>
              </form>
            ))}
          </div>
          <div className="mt-3">
            <Avertissement>
              Tout document généré porte la mention « Modèle indicatif, à faire valider par un
              conseil juridique ». Les clauses juridiques restent vides tant que vous ne les
              avez pas saisies dans Documents &gt; Modèles.
            </Avertissement>
          </div>
        </Bloc>

        {/* États des lieux */}
        <Bloc
          titre="États des lieux"
          action={
            <Link
              href={`/app/etats-des-lieux/nouveau?bail=${id}`}
              className="lien text-sm font-semibold"
            >
              En faire un
            </Link>
          }
        >
          {etatsDesLieux.length === 0 ? (
            <p className="sous-titre text-sm">
              Aucun état des lieux. Faites-en un à l'entrée : sans lui, aucune retenue ne sera
              justifiable à la sortie.
            </p>
          ) : (
            <div className="space-y-2.5">
              {etatsDesLieux.map((x) => (
                <Ligne
                  key={x.id}
                  href={`/app/etats-des-lieux/${x.id}`}
                  titre={x.type === "entree" ? "État des lieux d'entrée" : "État des lieux de sortie"}
                  sousTitre={dateLongue(x.date)}
                  droite={<Statut valeur={x.statut} />}
                />
              ))}
            </div>
          )}
        </Bloc>

        {/* Gestion du bail */}
        <Bloc titre="Réviser le loyer">
          <p className="sous-titre text-sm mb-3">
            Seules les échéances à venir changent. Les quittances déjà remises ne bougent pas.
          </p>
          <form action={actionReviserLoyer} className="grid sm:grid-cols-3 gap-3 items-end">
            <input type="hidden" name="bail_id" value={id} />
            <div>
              <label className="etiquette" htmlFor="nouveau_loyer">
                Nouveau loyer
              </label>
              <input
                id="nouveau_loyer"
                name="nouveau_loyer"
                type="number"
                step={1}
                className="champ"
                defaultValue={bail.loyer_mensuel}
              />
            </div>
            <div>
              <label className="etiquette" htmlFor="date_effet">
                À partir du
              </label>
              <input
                id="date_effet"
                name="date_effet"
                type="date"
                className="champ"
                defaultValue={aujourdhui()}
              />
            </div>
            <button type="submit" className="bouton-second">
              Réviser
            </button>
          </form>
        </Bloc>

        {bail.statut === "actif" && (
          <Bloc titre="Préavis">
            <form action={actionDeposerPreavis} className="space-y-3">
              <input type="hidden" name="bail_id" value={id} />
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="etiquette" htmlFor="origine">
                    Qui donne le préavis
                  </label>
                  <select id="origine" name="origine" className="champ" defaultValue="locataire">
                    <option value="locataire">Le locataire part</option>
                    <option value="bailleur">Je donne congé</option>
                  </select>
                </div>
                <div>
                  <label className="etiquette" htmlFor="date_depot">
                    Date de notification
                  </label>
                  <input
                    id="date_depot"
                    name="date_depot"
                    type="date"
                    className="champ"
                    defaultValue={aujourdhui()}
                  />
                </div>
                <div>
                  <label className="etiquette" htmlFor="duree_preavis_mois">
                    Durée du préavis (mois)
                  </label>
                  <input
                    id="duree_preavis_mois"
                    name="duree_preavis_mois"
                    type="number"
                    min={0}
                    max={12}
                    className="champ"
                    defaultValue={p.preavis_locataire_mois}
                  />
                </div>
              </div>
              <Avertissement>
                La durée de préavis est un réglage de votre compte, pas une règle codée dans
                laloc. Faites-la valider par un juriste camerounais, puis ajustez-la dans les
                paramètres.
              </Avertissement>
              <button type="submit" className="bouton-second">
                Enregistrer le préavis
              </button>
            </form>
          </Bloc>
        )}

        <Bloc titre="Terminer ce bail">
          <p className="sous-titre text-sm mb-3">
            Le logement redevient libre. Tout l'historique, les paiements et les quittances
            restent consultables.
          </p>
          <form action={actionTerminerBail} className="grid sm:grid-cols-3 gap-3 items-end">
            <input type="hidden" name="bail_id" value={id} />
            <div>
              <label className="etiquette" htmlFor="statut">
                Motif
              </label>
              <select id="statut" name="statut" className="champ" defaultValue="termine">
                <option value="termine">Fin normale du bail</option>
                <option value="resilie">Résiliation</option>
              </select>
            </div>
            <div>
              <label className="etiquette" htmlFor="date_fin_reelle">
                Date de sortie
              </label>
              <input
                id="date_fin_reelle"
                name="date_fin_reelle"
                type="date"
                className="champ"
                defaultValue={aujourdhui()}
              />
            </div>
            <button type="submit" className="bouton-second">
              Terminer le bail
            </button>
          </form>
        </Bloc>
      </div>
    </Coquille>
  );
}
