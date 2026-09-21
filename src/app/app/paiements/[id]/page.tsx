import Link from "next/link";
import { notFound } from "next/navigation";
import { Coquille } from "@/components/coquille";
import { Bloc, Erreur, Montant, Statut, Succes } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { bailParId, nomLogement, situationBail } from "@/lib/requetes";
import { dateLongue, fcfa, MODES_PAIEMENT } from "@/lib/format";
import { actionAnnulerPaiement } from "@/lib/actions/paiements";
import { actionDocumentPaiement } from "@/lib/actions/documents";

export default async function FichePaiement({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string; nouveau?: string }>;
}) {
  const ctx = await exigerContexte();
  const { id } = await params;
  const { e, nouveau } = await searchParams;

  const p = db().prepare(`SELECT * FROM paiements WHERE id = ?`).get(id) as any;
  if (!p || p.proprietaire_id !== ctx.proprietaireActif) notFound();

  const bail = bailParId(p.bail_id)!;
  const s = situationBail(p.bail_id);

  const imputations = db()
    .prepare(
      `SELECT i.montant, e.libelle, e.montant_attendu,
        COALESCE((SELECT SUM(i2.montant) FROM imputations i2
          JOIN paiements p2 ON p2.id = i2.paiement_id AND p2.statut='enregistre'
          WHERE i2.echeance_id = e.id), 0) AS total_impute
       FROM imputations i JOIN echeances e ON e.id = i.echeance_id
       WHERE i.paiement_id = ? ORDER BY e.date_echeance`,
    )
    .all(id) as any[];

  const document = db()
    .prepare(
      `SELECT d.id, d.numero, d.type, d.statut FROM documents_emis d
       JOIN documents_echeances de ON de.document_id = d.id
       WHERE d.bail_id = ? GROUP BY d.id ORDER BY d.emis_le DESC LIMIT 1`,
    )
    .get(p.bail_id) as any;

  const avance = p.montant - imputations.reduce((sum, i) => sum + i.montant, 0);

  return (
    <Coquille
      ctx={ctx}
      actif="/app/paiements"
      titre={fcfa(p.montant)}
      retour={{ href: `/app/baux/${p.bail_id}`, libelle: bail.locataire_nom }}
    >
      <div className="space-y-5">
        {e && <Erreur>{e}</Erreur>}
        {nouveau && <Succes>Paiement enregistré et réparti sur les échéances.</Succes>}

        <Bloc titre="Le versement">
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-[15px]">
            <div>
              <dt className="text-sm text-encre-doux">Locataire</dt>
              <dd className="font-semibold">{bail.locataire_nom}</dd>
            </div>
            <div>
              <dt className="text-sm text-encre-doux">Logement</dt>
              <dd className="font-semibold">{nomLogement(bail)}</dd>
            </div>
            <div>
              <dt className="text-sm text-encre-doux">Date</dt>
              <dd className="font-semibold">{dateLongue(p.date_encaissement)}</dd>
            </div>
            <div>
              <dt className="text-sm text-encre-doux">Moyen</dt>
              <dd className="font-semibold">{MODES_PAIEMENT[p.mode] ?? p.mode}</dd>
            </div>
            {p.reference && (
              <div>
                <dt className="text-sm text-encre-doux">Référence</dt>
                <dd className="font-semibold break-all">{p.reference}</dd>
              </div>
            )}
            {p.commentaire && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-encre-doux">Note</dt>
                <dd>{p.commentaire}</dd>
              </div>
            )}
          </dl>
          {p.statut === "annule" && (
            <div className="mt-3">
              <span className="jeton-rouge">Annulé</span>
              {p.motif_annulation && (
                <span className="ml-2 text-sm text-encre-doux">{p.motif_annulation}</span>
              )}
            </div>
          )}
        </Bloc>

        <Bloc titre="Comment il a été réparti">
          {imputations.length === 0 ? (
            <p className="sous-titre text-sm">
              Ce versement n'était rattaché à aucune échéance due : il est conservé en avance
              sur les loyers à venir.
            </p>
          ) : (
            <div className="space-y-2">
              {imputations.map((i, k) => {
                const solde = i.total_impute >= i.montant_attendu;
                return (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-3 py-2 border-b border-sable-200 last:border-0"
                  >
                    <div>
                      <div className="font-semibold text-[15px]">{i.libelle}</div>
                      <div className="text-xs text-encre-doux">
                        {solde ? "période soldée" : `reste ${fcfa(i.montant_attendu - i.total_impute)}`}
                      </div>
                    </div>
                    <Montant valeur={i.montant} ton="positif" />
                  </div>
                );
              })}
            </div>
          )}
          {avance > 0 && (
            <div className="mt-3 carte-douce p-3 text-[15px]">
              <strong>{fcfa(avance)}</strong> conservés en avance sur les mois suivants.
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-sable-300 text-[15px]">
            {s.du > 0 ? (
              <>
                Ce locataire doit encore <strong className="text-brique">{fcfa(s.du)}</strong>.
              </>
            ) : (
              <>
                Ce locataire est à jour
                {s.a_jour_jusquau && <> jusqu'au <strong>{dateLongue(s.a_jour_jusquau)}</strong></>}.
              </>
            )}
          </div>
        </Bloc>

        {p.statut !== "annule" && (
          <Bloc titre="Le document à remettre">
            <p className="sous-titre text-sm mb-3">
              laloc choisit tout seul : un <strong>reçu</strong> si la période n'est pas
              entièrement payée, une <strong>quittance de loyer</strong> dès qu'elle est soldée.
              Ce sont deux documents de nature juridique différente.
            </p>
            <form action={actionDocumentPaiement}>
              <input type="hidden" name="paiement_id" value={id} />
              <button type="submit" className="bouton-principal">
                Générer le document
              </button>
            </form>
            {document && (
              <div className="mt-3">
                <Link href={`/app/documents/${document.id}`} className="lien text-sm font-semibold">
                  Dernier document de ce bail : {document.numero}
                </Link>
              </div>
            )}
          </Bloc>
        )}

        {p.statut !== "annule" && (
          <Bloc titre="Annuler ce paiement">
            <p className="sous-titre text-sm mb-3">
              Rien n'est effacé : le paiement reste visible, marqué annulé, et les échéances
              qu'il couvrait redeviennent dues. La trace est conservée dans le journal.
            </p>
            <form action={actionAnnulerPaiement} className="flex flex-col sm:flex-row gap-3">
              <input type="hidden" name="id" value={id} />
              <input name="motif" className="champ" placeholder="Motif de l'annulation" />
              <button type="submit" className="bouton-second shrink-0">
                Annuler le paiement
              </button>
            </form>
          </Bloc>
        )}
      </div>
    </Coquille>
  );
}
