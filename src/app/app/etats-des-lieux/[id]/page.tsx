import Link from "next/link";
import { notFound } from "next/navigation";
import { Coquille } from "@/components/coquille";
import { Avertissement, Bloc, Erreur, Statut, Succes } from "@/components/ui";
import { Televerseur } from "@/components/televerseur";
import { Signature } from "@/components/signature";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { bailParId, nomLogement } from "@/lib/requetes";
import { dateLongue, ETATS_ELEMENT, horodatageDouala } from "@/lib/format";
import { ETATS } from "@/lib/edl-modele";
import { actionEnregistrerEdl, actionSignerEdl } from "@/lib/actions/edl";

export default async function FicheEdl({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string; ok?: string }>;
}) {
  const ctx = await exigerContexte();
  const { id } = await params;
  const { e, ok } = await searchParams;
  const base = db();

  const edl = base.prepare(`SELECT * FROM etats_des_lieux WHERE id = ?`).get(id) as any;
  if (!edl || edl.proprietaire_id !== ctx.proprietaireActif) notFound();

  const bail = bailParId(edl.bail_id)!;
  const pieces = base
    .prepare(`SELECT * FROM edl_pieces WHERE edl_id = ? ORDER BY ordre`)
    .all(id) as any[];

  const elementsParPiece = new Map<string, any[]>();
  const photosParPiece = new Map<string, string[]>();
  for (const p of pieces) {
    elementsParPiece.set(
      p.id,
      base.prepare(`SELECT * FROM edl_elements WHERE piece_id = ? ORDER BY ordre`).all(p.id) as any[],
    );
    photosParPiece.set(
      p.id,
      (base.prepare(`SELECT fichier FROM edl_photos WHERE piece_id = ?`).all(p.id) as any[]).map(
        (x) => x.fichier,
      ),
    );
  }

  // Comparaison avec l'entrée, pour un état des lieux de sortie.
  const etatsEntree = new Map<string, string>();
  if (edl.type === "sortie" && edl.edl_entree_id) {
    const rows = base
      .prepare(
        `SELECT p.nom AS piece, e.libelle, e.etat FROM edl_elements e
         JOIN edl_pieces p ON p.id = e.piece_id WHERE p.edl_id = ?`,
      )
      .all(edl.edl_entree_id) as any[];
    for (const r of rows) etatsEntree.set(`${r.piece}|${r.libelle}`, r.etat);
  }

  const signe = edl.statut === "signe";
  const titre = edl.type === "entree" ? "État des lieux d'entrée" : "État des lieux de sortie";

  return (
    <Coquille
      ctx={ctx}
      actif="/app/plus"
      titre={titre}
      retour={{ href: "/app/etats-des-lieux", libelle: "États des lieux" }}
    >
      <div className="space-y-5">
        {e && <Erreur>{e}</Erreur>}
        {ok && <Succes>Vos notes sont enregistrées.</Succes>}

        <div className="carte p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{bail.locataire_nom}</div>
              <div className="text-sm text-encre-doux">{nomLogement(bail)}</div>
              <div className="text-sm text-encre-doux">{dateLongue(edl.date)}</div>
            </div>
            <Statut valeur={edl.statut} />
          </div>
          {signe && (
            <div className="mt-4 pt-4 border-t border-sable-300 space-y-2">
              <p className="text-sm text-encre-doux">
                Figé le {horodatageDouala(edl.signe_le)}. Ce document ne peut plus être modifié.
              </p>
              {edl.document_id && (
                <Link href={`/app/documents/${edl.document_id}`} className="bouton-principal">
                  Voir le PDF signé
                </Link>
              )}
            </div>
          )}
        </div>

        {edl.type === "sortie" && !edl.edl_entree_id && (
          <Avertissement>
            Aucun état des lieux d'entrée n'a été trouvé pour ce bail. La comparaison ne sera
            donc pas possible, et une retenue sur la caution sera difficile à justifier.
          </Avertissement>
        )}

        {signe ? (
          <>
            {pieces.map((p) => (
              <Bloc key={p.id} titre={p.nom}>
                <div className="space-y-2">
                  {(elementsParPiece.get(p.id) ?? []).map((el) => (
                    <div
                      key={el.id}
                      className="flex items-center justify-between gap-3 py-2 border-b border-sable-200 last:border-0"
                    >
                      <div className="text-[15px]">{el.libelle}</div>
                      <div className="text-right">
                        <span className="font-semibold text-[15px]">
                          {ETATS_ELEMENT[el.etat] ?? "Non renseigné"}
                        </span>
                        {el.commentaire && (
                          <div className="text-xs text-encre-doux">{el.commentaire}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {(photosParPiece.get(p.id) ?? []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(photosParPiece.get(p.id) ?? []).map((c) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={c}
                        src={c}
                        alt=""
                        className="size-24 rounded-xl object-cover border border-sable-400"
                      />
                    ))}
                  </div>
                )}
              </Bloc>
            ))}
          </>
        ) : (
          <form action={actionEnregistrerEdl} className="space-y-5">
            <input type="hidden" name="id" value={id} />

            {pieces.map((p) => (
              <Bloc key={p.id} titre={p.nom}>
                <div className="space-y-4">
                  {(elementsParPiece.get(p.id) ?? []).map((el) => {
                    const avant = etatsEntree.get(`${p.nom}|${el.libelle}`);
                    return (
                      <div key={el.id} className="pb-3 border-b border-sable-200 last:border-0">
                        <div className="flex items-baseline justify-between gap-2 mb-2">
                          <span className="font-semibold text-[15px]">{el.libelle}</span>
                          {avant && (
                            <span className="text-xs text-encre-doux">
                              À l'entrée : {ETATS_ELEMENT[avant] ?? "non renseigné"}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {ETATS.map((et) => (
                            <label
                              key={et.code}
                              className="text-center carte-douce py-2 cursor-pointer text-sm font-semibold has-[:checked]:border-terre has-[:checked]:bg-terre-pale has-[:checked]:text-terre-fonce"
                            >
                              <input
                                type="radio"
                                name={`etat_${el.id}`}
                                value={et.code}
                                defaultChecked={el.etat === et.code}
                                className="sr-only"
                              />
                              {et.libelle}
                            </label>
                          ))}
                        </div>
                        <input
                          name={`com_${el.id}`}
                          defaultValue={el.commentaire ?? ""}
                          className="champ mt-2 py-2 text-sm"
                          placeholder="Observation (facultatif)"
                        />
                      </div>
                    );
                  })}

                  <Televerseur
                    nom={`photos_${p.id}`}
                    etiquette={`Photos de « ${p.nom} »`}
                    valeurInitiale={(photosParPiece.get(p.id) ?? []).join(",")}
                    multiple
                    aide="Les photos sont compressées avant l'envoi pour économiser votre data."
                  />
                </div>
              </Bloc>
            ))}

            <Bloc titre="Relevés et observations">
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="etiquette" htmlFor="releve_electricite">
                      Index du compteur électrique
                    </label>
                    <input
                      id="releve_electricite"
                      name="releve_electricite"
                      className="champ"
                      defaultValue={edl.releve_electricite ?? ""}
                    />
                  </div>
                  <div>
                    <label className="etiquette" htmlFor="releve_eau">
                      Index du compteur eau
                    </label>
                    <input
                      id="releve_eau"
                      name="releve_eau"
                      className="champ"
                      defaultValue={edl.releve_eau ?? ""}
                    />
                  </div>
                </div>
                <div>
                  <label className="etiquette" htmlFor="observations">
                    Observations générales
                  </label>
                  <textarea
                    id="observations"
                    name="observations"
                    rows={3}
                    className="champ"
                    defaultValue={edl.observations ?? ""}
                  />
                </div>
              </div>
            </Bloc>

            <button type="submit" className="bouton-second w-full">
              Enregistrer mes notes
            </button>
          </form>
        )}

        {!signe && (
          <Bloc titre="Signer et figer le document">
            <Avertissement>
              <strong>Signature avec dossier de preuve.</strong> Ne vaut pas signature
              électronique avancée au sens de la loi n°2010/012 du 21 décembre 2010. laloc
              conserve l'horodatage, l'identité des signataires et l'empreinte du document
              pour établir qu'il n'a pas été modifié après coup.
            </Avertissement>

            <form action={actionSignerEdl} className="space-y-5 mt-4">
              <input type="hidden" name="id" value={id} />
              <Signature nom="signature_bailleur" etiquette={`Le bailleur — ${ctx.profil.nom}`} />
              <Signature nom="signature_locataire" etiquette={`Le locataire — ${bail.locataire_nom}`} />
              <p className="text-sm text-encre-doux">
                Enregistrez d'abord vos notes ci-dessus. Une fois signé, le document est figé
                définitivement et le PDF est généré.
              </p>
              <button type="submit" className="bouton-principal w-full">
                Signer et figer définitivement
              </button>
            </form>
          </Bloc>
        )}
      </div>
    </Coquille>
  );
}
