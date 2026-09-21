import Link from "next/link";
import { Coquille } from "@/components/coquille";
import { Bloc, Ligne, Statut, Vide } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { dateLongue } from "@/lib/format";
import { titreDocument } from "@/lib/pdf/documents";

export default async function Documents({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const ctx = await exigerContexte();
  const { q, type } = await searchParams;
  const recherche = (q ?? "").trim();

  const documents = db()
    .prepare(
      `SELECT d.*, l.nom AS locataire_nom FROM documents_emis d
       LEFT JOIN locataires l ON l.id = d.locataire_id
       WHERE d.proprietaire_id = ?
         AND (? = '' OR d.type = ?)
         AND (? = '' OR d.numero LIKE '%' || ? || '%' OR l.nom LIKE '%' || ? || '%')
       ORDER BY d.emis_le DESC LIMIT 200`,
    )
    .all(ctx.proprietaireActif, type ?? "", type ?? "", recherche, recherche, recherche) as any[];

  const types = db()
    .prepare(
      `SELECT type, COUNT(*) AS n FROM documents_emis WHERE proprietaire_id = ?
       GROUP BY type ORDER BY n DESC`,
    )
    .all(ctx.proprietaireActif) as any[];

  return (
    <Coquille
      ctx={ctx}
      actif="/app/plus"
      titre="Mes documents"
      retour={{ href: "/app/plus", libelle: "Plus" }}
      action={
        <Link href="/app/documents/modeles" className="bouton-second">
          Modèles
        </Link>
      }
    >
      <div className="space-y-4">
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={recherche}
            className="champ"
            placeholder="Chercher un numéro ou un locataire"
          />
          <button type="submit" className="bouton-second shrink-0">
            Chercher
          </button>
        </form>

        {types.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Link href="/app/documents" className={type ? "jeton-neutre" : "jeton-terre"}>
              Tous
            </Link>
            {types.map((t) => (
              <Link
                key={t.type}
                href={`/app/documents?type=${t.type}`}
                className={type === t.type ? "jeton-terre" : "jeton-neutre"}
              >
                {titreDocument(t.type)} ({t.n})
              </Link>
            ))}
          </div>
        )}

        {documents.length === 0 ? (
          <Vide
            titre={recherche ? "Aucun résultat" : "Aucun document pour l'instant"}
            texte={
              recherche
                ? "Essayez avec le numéro du document ou le nom du locataire."
                : "Vos quittances, reçus, contrats et lettres apparaîtront ici dès que vous en générerez. Ils sont numérotés et conservés définitivement."
            }
          />
        ) : (
          <Bloc>
            <div className="space-y-2.5">
              {documents.map((d) => (
                <Ligne
                  key={d.id}
                  href={`/app/documents/${d.id}`}
                  titre={`${d.numero} — ${titreDocument(d.type)}`}
                  sousTitre={`${d.locataire_nom ?? ""} · ${dateLongue(d.emis_le)}`}
                  droite={<Statut valeur={d.statut} />}
                />
              ))}
            </div>
          </Bloc>
        )}
      </div>
    </Coquille>
  );
}
