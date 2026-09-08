import { Coquille } from "@/components/coquille";
import { Avertissement, Bloc, Erreur, Succes, Vide } from "@/components/ui";
import { ChampTelephone } from "@/components/champ-telephone";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { TOUS_LES_DROITS } from "@/lib/auth";
import { afficherTelephone, dateLongue } from "@/lib/format";
import { lienAbsolu, lienWhatsApp } from "@/lib/lien";
import { actionCreerMandat, actionRevoquerMandat } from "@/lib/actions/parametres";

export default async function Mandataires({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; invite?: string; tel?: string }>;
}) {
  const ctx = await exigerContexte();
  const { e, invite, tel } = await searchParams;
  const base = db();

  const mandats = base
    .prepare(
      `SELECT m.*, p.nom AS mandataire_nom, p.telephone AS mandataire_telephone,
              i.telephone AS invite_telephone, i.utilise_le
       FROM mandats m
       LEFT JOIN profils p ON p.id = m.mandataire_id AND p.id != m.id
       LEFT JOIN invitations i ON i.cible_id = m.id
       WHERE m.bailleur_id = ? ORDER BY m.revoque_le IS NOT NULL, m.cree_le DESC`,
    )
    .all(ctx.profil.id) as any[];

  const biens = base
    .prepare(
      `SELECT id, nom, ville FROM biens WHERE proprietaire_id = ? AND archive_le IS NULL ORDER BY nom`,
    )
    .all(ctx.profil.id) as any[];

  let lien = "";
  let message = "";
  if (invite) {
    lien = await lienAbsolu(`/activer/${invite}`);
    message = `Bonjour,\n\nJe vous confie la gestion de mes biens sur laloc. Voici votre accès :\n${lien}\n\nVous choisirez vous-même votre mot de passe. Ce lien est valable 14 jours.`;
  }

  return (
    <Coquille
      ctx={ctx}
      actif="/app/plus"
      titre="Mandataires"
      retour={{ href: "/app/plus", libelle: "Plus" }}
    >
      <div className="space-y-5">
        {e && <Erreur>{e}</Erreur>}

        {invite && (
          <Bloc titre="Lien d'accès prêt">
            <Succes>
              Le mandat est créé. Envoyez le lien : le mandataire choisira lui-même son mot de
              passe, vous ne le connaîtrez jamais.
            </Succes>
            <div className="mt-3 carte-douce p-3 text-[13px] break-all font-mono">{lien}</div>
            <a
              href={lienWhatsApp(tel ?? "", message)}
              target="_blank"
              rel="noreferrer"
              className="bouton-whatsapp mt-3"
            >
              Envoyer sur WhatsApp
            </a>
          </Bloc>
        )}

        <Avertissement>
          Un mandataire agit en votre nom sur les biens que vous choisissez, avec seulement les
          droits que vous cochez. Un droit non coché est refusé <strong>par la base de données</strong>,
          pas seulement masqué à l'écran. Toutes ses actions apparaissent dans votre journal.
        </Avertissement>

        <Bloc titre="Mes mandataires">
          {mandats.length === 0 ? (
            <Vide
              titre="Aucun mandataire"
              texte="Si vous vivez à l'étranger ou que quelqu'un encaisse pour vous sur place, donnez-lui un accès limité plutôt que votre mot de passe."
            />
          ) : (
            <div className="space-y-3">
              {mandats.map((m) => {
                const droits: string[] = JSON.parse(m.droits_json || "[]");
                const bienIds: string[] = JSON.parse(m.biens_json || "[]");
                const revoque = !!m.revoque_le;
                return (
                  <div key={m.id} className={`carte p-4 ${revoque ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          {m.mandataire_nom ?? afficherTelephone(m.invite_telephone ?? "")}
                        </div>
                        <div className="text-sm text-encre-doux">
                          {m.portee === "tous"
                            ? "Tous mes biens"
                            : `${bienIds.length} bien(s) : ${biens
                                .filter((b) => bienIds.includes(b.id))
                                .map((b) => b.nom)
                                .join(", ")}`}
                        </div>
                        <div className="text-sm text-encre-doux">
                          Depuis le {dateLongue(m.date_debut)}
                        </div>
                      </div>
                      {revoque ? (
                        <span className="jeton-rouge">Révoqué</span>
                      ) : m.utilise_le ? (
                        <span className="jeton-vert">Actif</span>
                      ) : (
                        <span className="jeton-ocre">En attente</span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {TOUS_LES_DROITS.filter((d) => droits.includes(d.code)).map((d) => (
                        <span key={d.code} className="jeton-terre">
                          {d.libelle}
                        </span>
                      ))}
                    </div>

                    {!revoque && (
                      <form action={actionRevoquerMandat} className="mt-3">
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="bouton-second py-2 px-3 text-sm">
                          Retirer son accès
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Bloc>

        <Bloc titre="Confier la gestion à quelqu'un">
          <form action={actionCreerMandat} className="space-y-4">
            <ChampTelephone
              etiquette="Son numéro de téléphone"
              aide="Il recevra un lien d'activation par WhatsApp."
            />

            <fieldset>
              <legend className="etiquette">Ce qu'il a le droit de faire</legend>
              <div className="space-y-2">
                {TOUS_LES_DROITS.map((d) => (
                  <label
                    key={d.code}
                    className="flex items-center gap-3 carte-douce p-3 cursor-pointer has-[:checked]:border-terre has-[:checked]:bg-terre-pale"
                  >
                    <input
                      type="checkbox"
                      name={`droit_${d.code}`}
                      value="1"
                      defaultChecked={d.code === "encaisser" || d.code === "generer_documents"}
                      className="size-5 accent-[#B0662F] shrink-0"
                    />
                    <span className="font-medium text-[15px]">{d.libelle}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {biens.length > 0 && (
              <fieldset>
                <legend className="etiquette">Sur quels biens</legend>
                <p className="aide mb-2">Ne cochez rien pour lui confier tous vos biens.</p>
                <div className="space-y-2">
                  {biens.map((b) => (
                    <label key={b.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="biens"
                        value={b.id}
                        className="size-5 accent-[#B0662F] shrink-0"
                      />
                      <span className="text-[15px]">
                        {b.nom} <span className="text-encre-doux">({b.ville})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <button type="submit" className="bouton-principal">
              Créer le mandat
            </button>
          </form>
        </Bloc>
      </div>
    </Coquille>
  );
}
