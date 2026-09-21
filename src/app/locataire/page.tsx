import Link from "next/link";
import { redirect } from "next/navigation";
import { Marque, Bloc, Chiffre, Montant, Statut, Succes, Vide, Avertissement } from "@/components/ui";
import { Televerseur } from "@/components/televerseur";
import { profilConnecte, contexteDe } from "@/lib/auth";
import { db } from "@/lib/db";
import { echeancesDuBail, nomLogement, situationBail } from "@/lib/requetes";
import { afficherTelephone, aujourdhui, dateLongue, fcfa, MODES_PAIEMENT } from "@/lib/format";
import { lienWhatsApp } from "@/lib/lien";
import { actionPreavisLocataire, actionSignalerParLocataire } from "@/lib/actions/incidents";
import { actionDeconnexion } from "@/lib/actions/auth";

/**
 * Espace locataire. Lecture seule sur les données du bail : il ne peut jamais rien
 * modifier. Il peut en revanche déposer un préavis et signaler un incident.
 */
export default async function EspaceLocataire({
  searchParams,
}: {
  searchParams: Promise<{ incident?: string; preavis?: string }>;
}) {
  const profil = await profilConnecte();
  if (!profil) redirect("/connexion");
  const { incident, preavis } = await searchParams;
  const base = db();
  const ctx = contexteDe(profil);

  const baux = base
    .prepare(
      `SELECT b.*, l.nom AS locataire_nom, u.libelle AS unite_libelle, u.unique_du_bien,
              bi.nom AS bien_nom, bi.ville AS bien_ville, bi.quartier AS bien_quartier,
              bi.point_repere, p.nom AS bailleur_nom, p.telephone AS bailleur_telephone,
              par.raison_sociale AS bailleur_raison
       FROM baux b
       JOIN locataires l ON l.id = b.locataire_id
       JOIN unites u ON u.id = b.unite_id
       JOIN biens bi ON bi.id = u.bien_id
       JOIN profils p ON p.id = b.proprietaire_id
       LEFT JOIN parametres par ON par.proprietaire_id = b.proprietaire_id
       WHERE l.profil_id = ? AND b.statut IN ('actif','preavis')
       ORDER BY b.date_debut DESC`,
    )
    .all(profil.id) as any[];

  if (baux.length === 0) {
    return (
      <div className="min-h-dvh bg-sable-100">
        <header className="bg-white border-b border-sable-300 px-4 h-14 flex items-center justify-between">
          <Marque taille="petit" />
          <form action={actionDeconnexion}>
            <button className="text-sm font-semibold text-encre-doux">Se déconnecter</button>
          </form>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-6">
          <Vide
            titre="Aucun logement rattaché à votre compte"
            texte="Votre bailleur doit vous rattacher à votre bail. Demandez-lui de vous renvoyer un lien d'accès depuis votre fiche."
            action={ctx.estProprietaire ? { href: "/app", libelle: "Aller à mes biens" } : undefined}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-sable-100">
      <header className="sticky top-0 z-20 bg-sable-100/95 backdrop-blur border-b border-sable-300">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
          <Marque taille="petit" />
          <div className="flex items-center gap-3">
            {ctx.estProprietaire && (
              <Link href="/app" className="text-sm font-semibold text-terre-fonce">
                Mes biens
              </Link>
            )}
            <form action={actionDeconnexion}>
              <button className="text-sm font-semibold text-encre-doux">Se déconnecter</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <div>
          <h1 className="titre-page">Bonjour {profil.nom.split(" ")[0]}</h1>
          <p className="sous-titre">Votre logement, vos quittances et vos paiements.</p>
        </div>

        {incident && <Succes>Votre signalement a été transmis à votre bailleur.</Succes>}
        {preavis && <Succes>Votre préavis a été déposé. Votre bailleur en est informé.</Succes>}

        {baux.map((bail) => {
          const s = situationBail(bail.id);
          const echeances = echeancesDuBail(bail.id);
          const paiements = base
            .prepare(
              `SELECT * FROM paiements WHERE bail_id = ? AND statut = 'enregistre'
               ORDER BY date_encaissement DESC LIMIT 12`,
            )
            .all(bail.id) as any[];
          const documents = base
            .prepare(
              `SELECT id, type, numero, emis_le FROM documents_emis
               WHERE bail_id = ? AND statut = 'emis' ORDER BY emis_le DESC LIMIT 20`,
            )
            .all(bail.id) as any[];
          const edl = base
            .prepare(`SELECT * FROM etats_des_lieux WHERE bail_id = ? ORDER BY date DESC`)
            .all(bail.id) as any[];
          const passees = echeances.filter((e) => e.date_echeance <= aujourdhui()).reverse();

          return (
            <div key={bail.id} className="space-y-5">
              <div className="carte p-5">
                <div className="text-xl font-bold">{nomLogement(bail)}</div>
                <div className="text-sm text-encre-doux">
                  {[bail.bien_quartier, bail.bien_ville].filter(Boolean).join(", ")}
                </div>
                {bail.point_repere && (
                  <div className="text-sm text-encre-doux">📍 {bail.point_repere}</div>
                )}

                <div className="mt-4 pt-4 border-t border-sable-300">
                  {s.du > 0 ? (
                    <>
                      <div className="text-sm font-semibold text-encre-doux uppercase tracking-wide">
                        Votre solde
                      </div>
                      <div className="text-3xl font-bold text-brique tabular-nums">{fcfa(s.du)}</div>
                      <div className="text-sm text-encre-doux">à régler</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-encre-doux uppercase tracking-wide">
                        Vous êtes à jour
                      </div>
                      <div className="text-2xl font-bold text-vert">
                        {s.a_jour_jusquau ? `jusqu'au ${dateLongue(s.a_jour_jusquau)}` : "Aucun impayé"}
                      </div>
                      {s.solde_crediteur > 0 && (
                        <div className="text-sm text-encre-doux">
                          Vous avez {fcfa(s.solde_crediteur)} d'avance.
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={lienWhatsApp(
                      bail.bailleur_telephone,
                      `Bonjour,\n\nJe vous écris au sujet de ${nomLogement(bail)}.\n\n`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="bouton-whatsapp py-2 px-3 text-sm"
                  >
                    Écrire à mon bailleur
                  </a>
                  <a href={`tel:${bail.bailleur_telephone}`} className="bouton-second py-2 px-3 text-sm">
                    {afficherTelephone(bail.bailleur_telephone)}
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Chiffre
                  libelle="Loyer mensuel"
                  valeur={<Montant valeur={bail.loyer_mensuel} taille="grand" />}
                  detail={
                    bail.charges_mensuelles > 0
                      ? `+ ${fcfa(bail.charges_mensuelles)} de charges`
                      : "Charges comprises"
                  }
                />
                <Chiffre
                  libelle="Caution versée"
                  valeur={<Montant valeur={bail.caution_versee} taille="grand" />}
                />
                <Chiffre libelle="Bail depuis le" valeur={dateLongue(bail.date_debut)} />
                <Chiffre
                  libelle="Jusqu'au"
                  valeur={bail.date_fin_prevue ? dateLongue(bail.date_fin_prevue) : "—"}
                />
              </div>

              <Bloc titre="Mes quittances et documents">
                {documents.length === 0 ? (
                  <p className="sous-titre text-sm">
                    Aucun document pour l'instant. Votre bailleur vous en enverra à chaque
                    paiement.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((d) => (
                      <a
                        key={d.id}
                        href={`/api/document/${d.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 py-2.5 border-b border-sable-200 last:border-0"
                      >
                        <div>
                          <div className="font-semibold text-[15px]">{d.numero}</div>
                          <div className="text-sm text-encre-doux">{dateLongue(d.emis_le)}</div>
                        </div>
                        <span className="bouton-doux py-1.5 px-3 text-sm shrink-0">Ouvrir</span>
                      </a>
                    ))}
                  </div>
                )}
              </Bloc>

              <Bloc titre="Mes paiements">
                {paiements.length === 0 ? (
                  <p className="sous-titre text-sm">Aucun paiement enregistré pour l'instant.</p>
                ) : (
                  <div className="space-y-2">
                    {paiements.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 py-2 border-b border-sable-200 last:border-0"
                      >
                        <div>
                          <div className="font-semibold text-[15px]">
                            {dateLongue(p.date_encaissement)}
                          </div>
                          <div className="text-sm text-encre-doux">
                            {MODES_PAIEMENT[p.mode] ?? p.mode}
                          </div>
                        </div>
                        <Montant valeur={p.montant} ton="positif" />
                      </div>
                    ))}
                  </div>
                )}
              </Bloc>

              <Bloc titre="Mes échéances">
                <div className="space-y-2">
                  {passees.slice(0, 8).map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-3 py-2 border-b border-sable-200 last:border-0"
                    >
                      <div>
                        <div className="font-semibold text-[15px]">{e.libelle}</div>
                        <div className="text-xs text-encre-doux">
                          Échéance le {dateLongue(e.date_echeance)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="tabular-nums text-[15px] font-semibold">
                          {e.reste === 0 ? fcfa(e.montant_attendu) : fcfa(e.reste)}
                        </div>
                        <Statut valeur={e.statut} />
                      </div>
                    </div>
                  ))}
                </div>
              </Bloc>

              {edl.length > 0 && (
                <Bloc titre="Mes états des lieux">
                  <div className="space-y-2">
                    {edl.map((x) => (
                      <div
                        key={x.id}
                        className="flex items-center justify-between gap-3 py-2 border-b border-sable-200 last:border-0"
                      >
                        <div>
                          <div className="font-semibold text-[15px]">
                            {x.type === "entree" ? "Entrée" : "Sortie"}
                          </div>
                          <div className="text-sm text-encre-doux">{dateLongue(x.date)}</div>
                        </div>
                        {x.document_id ? (
                          <a
                            href={`/api/document/${x.document_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bouton-doux py-1.5 px-3 text-sm"
                          >
                            Ouvrir
                          </a>
                        ) : (
                          <Statut valeur={x.statut} />
                        )}
                      </div>
                    ))}
                  </div>
                </Bloc>
              )}

              <Bloc titre="Signaler un problème">
                <form action={actionSignalerParLocataire} className="space-y-4">
                  <input type="hidden" name="bail_id" value={bail.id} />
                  <div>
                    <label className="etiquette" htmlFor={`titre_${bail.id}`}>
                      Qu'est-ce qui ne va pas ?
                    </label>
                    <input
                      id={`titre_${bail.id}`}
                      name="titre"
                      className="champ"
                      placeholder="Fuite d'eau, panne d'électricité…"
                      required
                    />
                  </div>
                  <div>
                    <label className="etiquette" htmlFor={`desc_${bail.id}`}>
                      Décrivez le problème
                    </label>
                    <textarea id={`desc_${bail.id}`} name="description" rows={3} className="champ" />
                  </div>
                  <div>
                    <label className="etiquette" htmlFor={`prio_${bail.id}`}>
                      C'est urgent ?
                    </label>
                    <select id={`prio_${bail.id}`} name="priorite" className="champ" defaultValue="normale">
                      <option value="basse">Non, ça peut attendre</option>
                      <option value="normale">Assez urgent</option>
                      <option value="haute">Oui, très urgent</option>
                    </select>
                  </div>
                  <Televerseur nom="photos" etiquette="Photos du problème" multiple />
                  <button type="submit" className="bouton-principal">
                    Envoyer à mon bailleur
                  </button>
                </form>
              </Bloc>

              {bail.statut === "actif" && (
                <Bloc titre="Donner mon préavis">
                  <Avertissement>
                    Votre préavis sera transmis à votre bailleur avec sa date. La durée de
                    préavis applicable est celle de votre contrat : vérifiez-la avant de
                    déposer.
                  </Avertissement>
                  <form action={actionPreavisLocataire} className="space-y-4 mt-4">
                    <input type="hidden" name="bail_id" value={bail.id} />
                    <div>
                      <label className="etiquette" htmlFor={`effet_${bail.id}`}>
                        Date de départ souhaitée
                      </label>
                      <input
                        id={`effet_${bail.id}`}
                        name="date_effet"
                        type="date"
                        className="champ"
                        required
                      />
                    </div>
                    <div>
                      <label className="etiquette" htmlFor={`motif_${bail.id}`}>
                        Motif <span className="font-normal text-encre-pale">(facultatif)</span>
                      </label>
                      <input id={`motif_${bail.id}`} name="motif" className="champ" />
                    </div>
                    <button type="submit" className="bouton-second">
                      Déposer mon préavis
                    </button>
                  </form>
                </Bloc>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
