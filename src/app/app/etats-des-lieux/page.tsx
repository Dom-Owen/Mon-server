import Link from "next/link";
import { Coquille } from "@/components/coquille";
import { Bloc, Erreur, Ligne, Statut, Vide } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { dateLongue } from "@/lib/format";

export default async function ListeEdl({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const ctx = await exigerContexte();
  const { e } = await searchParams;

  const liste = db()
    .prepare(
      `SELECT ed.*, l.nom AS locataire_nom, bi.nom AS bien_nom, u.libelle AS unite_libelle,
              u.unique_du_bien
       FROM etats_des_lieux ed
       JOIN baux b ON b.id = ed.bail_id
       JOIN locataires l ON l.id = b.locataire_id
       JOIN unites u ON u.id = b.unite_id
       JOIN biens bi ON bi.id = u.bien_id
       WHERE ed.proprietaire_id = ? ORDER BY ed.date DESC`,
    )
    .all(ctx.proprietaireActif) as any[];

  return (
    <Coquille
      ctx={ctx}
      actif="/app/plus"
      titre="États des lieux"
      retour={{ href: "/app/plus", libelle: "Plus" }}
      action={
        <Link href="/app/etats-des-lieux/nouveau" className="bouton-principal">
          En faire un
        </Link>
      }
    >
      <div className="space-y-4">
        {e && <Erreur>{e}</Erreur>}

        {liste.length === 0 ? (
          <Vide
            titre="Aucun état des lieux"
            texte="Faites-en un à chaque entrée. Sans état des lieux d'entrée, aucune retenue sur la caution ne sera justifiable au départ du locataire."
            action={{ href: "/app/etats-des-lieux/nouveau", libelle: "Faire mon premier état des lieux" }}
          />
        ) : (
          <Bloc>
            <div className="space-y-2.5">
              {liste.map((x) => (
                <Ligne
                  key={x.id}
                  href={`/app/etats-des-lieux/${x.id}`}
                  titre={`${x.type === "entree" ? "Entrée" : "Sortie"} — ${x.locataire_nom}`}
                  sousTitre={`${x.unique_du_bien ? x.bien_nom : `${x.bien_nom} — ${x.unite_libelle}`} · ${dateLongue(x.date)}`}
                  droite={<Statut valeur={x.statut} />}
                />
              ))}
            </div>
          </Bloc>
        )}
      </div>
    </Coquille>
  );
}
