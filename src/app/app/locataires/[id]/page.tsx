import Link from "next/link";
import { notFound } from "next/navigation";
import { Coquille } from "@/components/coquille";
import { Avertissement, Bloc, Erreur, Ligne, Montant, Statut, Succes } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { afficherTelephone, dateLongue } from "@/lib/format";
import { nomLogement, situationBail } from "@/lib/requetes";
import { lienAbsolu, lienWhatsApp } from "@/lib/lien";
import { actionArchiverLocataire, actionInviterLocataire } from "@/lib/actions/locataires";

export default async function FicheLocataire({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string; invite?: string }>;
}) {
  const ctx = await exigerContexte();
  const { id } = await params;
  const { e, invite } = await searchParams;

  const loc = db().prepare(`SELECT * FROM locataires WHERE id = ?`).get(id) as any;
  if (!loc || loc.proprietaire_id !== ctx.proprietaireActif) notFound();

  const baux = db()
    .prepare(
      `SELECT b.*, u.libelle AS unite_libelle, u.unique_du_bien AS unite_unique,
              bi.nom AS bien_nom
       FROM baux b JOIN unites u ON u.id = b.unite_id JOIN biens bi ON bi.id = u.bien_id
       WHERE b.locataire_id = ? ORDER BY b.date_debut DESC`,
    )
    .all(id) as any[];

  let lienInvitation = "";
  let messageWhatsApp = "";
  if (invite) {
    lienInvitation = await lienAbsolu(`/activer/${invite}`);
    messageWhatsApp = `Bonjour ${loc.nom},\n\nVoici votre accès à laloc pour consulter votre bail, vos quittances et vos paiements :\n${lienInvitation}\n\nVous choisirez vous-même votre mot de passe. Ce lien est valable 14 jours.`;
  }

  return (
    <Coquille
      ctx={ctx}
      actif="/app/locataires"
      titre={loc.nom}
      retour={{ href: "/app/locataires", libelle: "Mes locataires" }}
      action={
        <Link href={`/app/locataires/${id}/modifier`} className="bouton-second">
          Modifier
        </Link>
      }
    >
      <div className="space-y-5">
        {e && <Erreur>{e}</Erreur>}

        {invite && (
          <Bloc titre="Lien d'accès prêt">
            <Succes>
              Le lien est créé. Envoyez-le au locataire : il choisira lui-même son mot de
              passe, vous ne le connaîtrez jamais.
            </Succes>
            <div className="mt-3 carte-douce p-3 text-[13px] break-all font-mono">
              {lienInvitation}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={lienWhatsApp(loc.whatsapp || loc.telephone, messageWhatsApp)}
                target="_blank"
                rel="noreferrer"
                className="bouton-whatsapp"
              >
                Envoyer sur WhatsApp
              </a>
              {loc.email && (
                <a
                  href={`mailto:${loc.email}?subject=${encodeURIComponent("Votre accès laloc")}&body=${encodeURIComponent(messageWhatsApp)}`}
                  className="bouton-second"
                >
                  Envoyer par email
                </a>
              )}
            </div>
          </Bloc>
        )}

        <Bloc titre="Coordonnées">
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-[15px]">
            <div>
              <dt className="text-sm text-encre-doux">Téléphone</dt>
              <dd className="font-semibold">{afficherTelephone(loc.telephone)}</dd>
            </div>
            <div>
              <dt className="text-sm text-encre-doux">WhatsApp</dt>
              <dd className="font-semibold">{afficherTelephone(loc.whatsapp || loc.telephone)}</dd>
            </div>
            {loc.email && (
              <div>
                <dt className="text-sm text-encre-doux">Email</dt>
                <dd className="font-semibold break-all">{loc.email}</dd>
              </div>
            )}
            {loc.profession && (
              <div>
                <dt className="text-sm text-encre-doux">Profession</dt>
                <dd className="font-semibold">{loc.profession}</dd>
              </div>
            )}
            {loc.employeur && (
              <div>
                <dt className="text-sm text-encre-doux">Employeur</dt>
                <dd className="font-semibold">{loc.employeur}</dd>
              </div>
            )}
            {loc.type === "entreprise" && loc.rccm && (
              <div>
                <dt className="text-sm text-encre-doux">RCCM</dt>
                <dd className="font-semibold">{loc.rccm}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={lienWhatsApp(
                loc.whatsapp || loc.telephone,
                `Bonjour ${loc.nom},\n\n`,
              )}
              target="_blank"
              rel="noreferrer"
              className="bouton-whatsapp"
            >
              Écrire sur WhatsApp
            </a>
            <a href={`tel:${loc.telephone}`} className="bouton-second">
              Appeler
            </a>
          </div>
        </Bloc>

        {(loc.type_piece || loc.scan_piece) && (
          <Bloc titre="Pièce d'identité">
            <div className="text-[15px]">
              <div className="font-semibold">{loc.type_piece}</div>
              {loc.numero_piece && (
                <div className="text-encre-doux">Numéro {loc.numero_piece}</div>
              )}
            </div>
            {loc.scan_piece && (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={loc.scan_piece}
                  alt="Pièce d'identité"
                  className="max-w-xs rounded-xl border border-sable-400"
                />
              </div>
            )}
          </Bloc>
        )}

        {(loc.garant_nom || loc.urgence_nom) && (
          <Bloc titre="Garant et urgence">
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-[15px]">
              {loc.garant_nom && (
                <div>
                  <dt className="text-sm text-encre-doux">Garant</dt>
                  <dd className="font-semibold">
                    {loc.garant_nom}
                    {loc.garant_telephone && (
                      <span className="font-normal text-encre-doux">
                        {" "}
                        · {afficherTelephone(loc.garant_telephone)}
                      </span>
                    )}
                  </dd>
                </div>
              )}
              {loc.urgence_nom && (
                <div>
                  <dt className="text-sm text-encre-doux">En cas d'urgence</dt>
                  <dd className="font-semibold">
                    {loc.urgence_nom}
                    {loc.urgence_telephone && (
                      <span className="font-normal text-encre-doux">
                        {" "}
                        · {afficherTelephone(loc.urgence_telephone)}
                      </span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </Bloc>
        )}

        <Bloc
          titre="Ses baux"
          action={
            <Link href={`/app/baux/nouveau?locataire=${id}`} className="lien text-sm font-semibold">
              Créer un bail
            </Link>
          }
        >
          {baux.length === 0 ? (
            <p className="sous-titre text-sm">
              Aucun bail pour l'instant. Créez-en un pour l'installer dans un logement.
            </p>
          ) : (
            <div className="space-y-2.5">
              {baux.map((b) => {
                const s = situationBail(b.id);
                return (
                  <Ligne
                    key={b.id}
                    href={`/app/baux/${b.id}`}
                    titre={nomLogement(b)}
                    sousTitre={`Depuis le ${dateLongue(b.date_debut)}`}
                    droite={
                      <>
                        <Statut valeur={b.statut} />
                        {s.du > 0 && (
                          <div className="mt-1">
                            <Montant valeur={s.du} ton="negatif" taille="petit" />
                          </div>
                        )}
                      </>
                    }
                  />
                );
              })}
            </div>
          )}
        </Bloc>

        <Bloc titre="Son accès à laloc">
          {loc.profil_id ? (
            <Succes>
              Ce locataire a son accès. Il peut consulter son bail, ses quittances et son
              historique de paiement, sans jamais pouvoir modifier quoi que ce soit.
            </Succes>
          ) : (
            <>
              <p className="sous-titre text-sm mb-3">
                Donnez-lui accès à son espace : il verra son bail, ses quittances et son
                solde, et pourra déposer un préavis ou signaler un incident.
              </p>
              <form action={actionInviterLocataire}>
                <input type="hidden" name="id" value={id} />
                <button type="submit" className="bouton-principal">
                  Créer son lien d'accès
                </button>
              </form>
            </>
          )}
          <div className="mt-3">
            <Avertissement>
              Vous ne connaîtrez jamais son mot de passe. S'il l'oublie, recréez-lui un lien
              d'accès depuis cette page : c'est la façon prévue de le dépanner.
            </Avertissement>
          </div>
        </Bloc>

        <Bloc titre="Archiver ce locataire">
          <p className="sous-titre text-sm mb-3">
            Il disparaît de vos listes, mais son historique et ses quittances restent
            consultables. Rien n'est effacé.
          </p>
          <form action={actionArchiverLocataire}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="bouton-second">
              Archiver
            </button>
          </form>
        </Bloc>
      </div>
    </Coquille>
  );
}
