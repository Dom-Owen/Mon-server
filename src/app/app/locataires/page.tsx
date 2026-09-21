import Link from "next/link";
import { Coquille } from "@/components/coquille";
import { Erreur, Ligne, Vide } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { afficherTelephone } from "@/lib/format";

export default async function ListeLocataires({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; q?: string }>;
}) {
  const ctx = await exigerContexte();
  const { e, q } = await searchParams;
  const recherche = (q ?? "").trim();

  const locataires = db()
    .prepare(
      `SELECT l.*, (
         SELECT b.id FROM baux b WHERE b.locataire_id = l.id AND b.statut IN ('actif','preavis') LIMIT 1
       ) AS bail_id,
       (SELECT bi.nom || CASE WHEN u.unique_du_bien = 1 THEN '' ELSE ' — ' || u.libelle END
          FROM baux b JOIN unites u ON u.id = b.unite_id JOIN biens bi ON bi.id = u.bien_id
          WHERE b.locataire_id = l.id AND b.statut IN ('actif','preavis') LIMIT 1) AS logement
       FROM locataires l
       WHERE l.proprietaire_id = ? AND l.archive_le IS NULL
         AND (? = '' OR l.nom LIKE '%' || ? || '%' OR l.telephone LIKE '%' || ? || '%')
       ORDER BY l.nom`,
    )
    .all(ctx.proprietaireActif, recherche, recherche, recherche) as any[];

  return (
    <Coquille
      ctx={ctx}
      actif="/app/locataires"
      titre="Mes locataires"
      action={
        <Link href="/app/locataires/nouveau" className="bouton-principal">
          Ajouter un locataire
        </Link>
      }
    >
      <div className="space-y-4">
        {e && <Erreur>{e}</Erreur>}

        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={recherche}
            className="champ"
            placeholder="Chercher un nom ou un numéro"
          />
          <button type="submit" className="bouton-second shrink-0">
            Chercher
          </button>
        </form>

        {locataires.length === 0 ? (
          <Vide
            titre={recherche ? "Aucun résultat" : "Vous n'avez pas encore de locataire"}
            texte={
              recherche
                ? "Essayez avec une autre orthographe, ou seulement les premières lettres du nom."
                : "Ajoutez vos locataires actuels, même ceux qui sont en place depuis des années. Vous pourrez photographier leur bail papier plutôt que de le ressaisir."
            }
            action={
              recherche
                ? undefined
                : { href: "/app/locataires/nouveau", libelle: "Ajouter mon premier locataire" }
            }
          />
        ) : (
          <div className="space-y-3">
            {locataires.map((l) => (
              <Ligne
                key={l.id}
                href={`/app/locataires/${l.id}`}
                titre={l.nom}
                sousTitre={afficherTelephone(l.telephone)}
                droite={
                  l.bail_id ? (
                    <>
                      <span className="jeton-vert">Logé</span>
                      <div className="text-xs text-encre-doux mt-1 max-w-[10rem] truncate">
                        {l.logement}
                      </div>
                    </>
                  ) : (
                    <span className="jeton-neutre">Sans bail</span>
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </Coquille>
  );
}
