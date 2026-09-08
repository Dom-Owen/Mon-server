import Link from "next/link";
import { notFound } from "next/navigation";
import { Coquille } from "@/components/coquille";
import { Bloc, Chiffre, Erreur, Ligne, Montant, Statut, Vide } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { bienParId, unitesDuBien, situationBail } from "@/lib/requetes";
import { db } from "@/lib/db";
import { aujourdhui, dateLongue, entier, moisLong } from "@/lib/format";
import { MODES_CHARGES, TYPES_BIEN } from "@/lib/cameroun";
import { actionAjouterUnite, actionArchiverBien } from "@/lib/actions/biens";

export default async function FicheBien({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const ctx = await exigerContexte();
  const { id } = await params;
  const { e } = await searchParams;

  const bien = bienParId(id);
  if (!bien || bien.proprietaire_id !== ctx.proprietaireActif) notFound();

  const unites = unitesDuBien(id);
  const mois = aujourdhui().slice(0, 7);

  const encaisse = (db()
    .prepare(
      `SELECT COALESCE(SUM(p.montant), 0) AS t FROM paiements p
       JOIN baux b ON b.id = p.bail_id JOIN unites u ON u.id = b.unite_id
       WHERE u.bien_id = ? AND substr(p.date_encaissement,1,7) = ? AND p.statut='enregistre'`,
    )
    .get(id, mois) as any).t as number;

  const theorique = unites.reduce((s, u) => {
    if (!u.bail_id) return s;
    const b = db()
      .prepare(`SELECT loyer_mensuel, charges_mensuelles FROM baux WHERE id = ?`)
      .get(u.bail_id) as any;
    return s + (b ? b.loyer_mensuel + b.charges_mensuelles : 0);
  }, 0);

  const occupees = unites.filter((u) => u.statut === "occupee").length;
  const typeLibelle = TYPES_BIEN.find((t) => t.code === bien.type)?.libelle ?? bien.type;
  const chargesLibelle =
    MODES_CHARGES.find((m) => m.code === bien.mode_charges)?.libelle ?? bien.mode_charges;

  return (
    <Coquille
      ctx={ctx}
      actif="/app/biens"
      titre={bien.nom}
      retour={{ href: "/app/biens", libelle: "Mes biens" }}
      action={
        <Link href={`/app/biens/${id}/modifier`} className="bouton-second">
          Modifier
        </Link>
      }
    >
      <div className="space-y-5">
        {e && <Erreur>{e}</Erreur>}

        <div className="carte p-5">
          <div className="text-sm text-encre-doux">
            {typeLibelle} · {bien.usage === "commercial" ? "Usage commercial" : "Habitation"}
          </div>
          <div className="font-semibold mt-1">
            {[bien.quartier, bien.ville].filter(Boolean).join(", ")}
          </div>
          {bien.point_repere && (
            <div className="text-sm text-encre-doux mt-1">📍 {bien.point_repere}</div>
          )}
          {bien.precisions_acces && (
            <div className="text-sm text-encre-doux mt-1">{bien.precisions_acces}</div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="jeton-neutre">Charges : {chargesLibelle}</span>
            {bien.mode_charges === "forfait" && bien.charges_forfait > 0 && (
              <span className="jeton-terre">{entier(bien.charges_forfait)} FCFA / mois</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Chiffre
            libelle="Logements"
            valeur={unites.length}
            detail={`${occupees} occupé(s), ${unites.length - occupees} libre(s)`}
          />
          <Chiffre
            libelle="Occupation"
            valeur={`${unites.length ? Math.round((occupees / unites.length) * 100) : 0} %`}
          />
          <Chiffre
            libelle="Loyer théorique"
            valeur={<Montant valeur={theorique} taille="grand" />}
            detail="par mois, baux en cours"
          />
          <Chiffre
            libelle={`Encaissé en ${moisLong(aujourdhui()).split(" ")[0]}`}
            valeur={<Montant valeur={encaisse} taille="grand" ton="positif" />}
          />
        </div>

        <Bloc titre="Les logements">
          {unites.length === 0 ? (
            <Vide titre="Aucun logement" texte="Ajoutez au moins un logement pour pouvoir créer un bail." />
          ) : (
            <div className="space-y-2.5">
              {unites.map((u) => {
                const s = u.bail_id ? situationBail(u.bail_id) : null;
                const bail = u.bail_id
                  ? (db()
                      .prepare(
                        `SELECT b.*, l.nom AS locataire_nom FROM baux b
                         JOIN locataires l ON l.id = b.locataire_id WHERE b.id = ?`,
                      )
                      .get(u.bail_id) as any)
                  : null;
                return (
                  <Ligne
                    key={u.id}
                    href={bail ? `/app/baux/${bail.id}` : `/app/baux/nouveau?unite=${u.id}`}
                    titre={u.unique_du_bien ? bien.nom : u.libelle}
                    sousTitre={
                      bail
                        ? `${bail.locataire_nom} · depuis le ${dateLongue(bail.date_debut)}`
                        : "Libre — créer un bail"
                    }
                    droite={
                      bail ? (
                        s && s.du > 0 ? (
                          <>
                            <Montant valeur={s.du} ton="negatif" />
                            <div className="text-xs text-encre-doux mt-0.5">à recevoir</div>
                          </>
                        ) : (
                          <span className="jeton-vert">À jour</span>
                        )
                      ) : (
                        <Statut valeur={u.statut} />
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </Bloc>

        <Bloc titre="Ajouter un logement">
          <form action={actionAjouterUnite} className="space-y-4">
            <input type="hidden" name="bien_id" value={id} />
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="etiquette" htmlFor="libelle">
                  Nom du logement
                </label>
                <input id="libelle" name="libelle" className="champ" placeholder="Studio A3" required />
              </div>
              <div>
                <label className="etiquette" htmlFor="etage">
                  Étage <span className="font-normal text-encre-pale">(facultatif)</span>
                </label>
                <input id="etage" name="etage" className="champ" placeholder="Rez-de-chaussée" />
              </div>
              <div>
                <label className="etiquette" htmlFor="loyer_reference">
                  Loyer mensuel
                </label>
                <input
                  id="loyer_reference"
                  name="loyer_reference"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  className="champ"
                />
              </div>
              <div>
                <label className="etiquette" htmlFor="caution_reference">
                  Caution
                </label>
                <input
                  id="caution_reference"
                  name="caution_reference"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  className="champ"
                />
              </div>
            </div>
            <button type="submit" className="bouton-second">
              Ajouter ce logement
            </button>
          </form>
        </Bloc>

        <Bloc titre="Archiver ce bien">
          <p className="sous-titre text-sm mb-3">
            Le bien disparaît de vos listes mais rien n'est effacé : les baux, les paiements
            et les quittances restent consultables. On n'efface jamais, on archive.
          </p>
          <form action={actionArchiverBien}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="bouton-second">
              Archiver ce bien
            </button>
          </form>
        </Bloc>
      </div>
    </Coquille>
  );
}
