import Link from "next/link";
import { Coquille } from "@/components/coquille";
import { Ligne, Montant, Statut, Vide } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";

export default async function ListeBiens() {
  const ctx = await exigerContexte();
  const biens = db()
    .prepare(
      `SELECT b.*,
        (SELECT COUNT(*) FROM unites u WHERE u.bien_id = b.id AND u.archive_le IS NULL) AS nb_unites,
        (SELECT COUNT(*) FROM unites u WHERE u.bien_id = b.id AND u.archive_le IS NULL AND u.statut='occupee') AS nb_occupees,
        (SELECT COALESCE(SUM(bx.loyer_mensuel + bx.charges_mensuelles), 0) FROM baux bx
           JOIN unites u ON u.id = bx.unite_id
           WHERE u.bien_id = b.id AND bx.statut IN ('actif','preavis')) AS loyer_theorique
       FROM biens b
       WHERE b.proprietaire_id = ? AND b.archive_le IS NULL
       ORDER BY b.ville, b.nom`,
    )
    .all(ctx.proprietaireActif) as any[];

  return (
    <Coquille
      ctx={ctx}
      actif="/app/biens"
      titre="Mes biens"
      action={
        <Link href="/app/biens/nouveau" className="bouton-principal">
          Ajouter un bien
        </Link>
      }
    >
      {biens.length === 0 ? (
        <Vide
          titre="Vous n'avez pas encore de bien"
          texte="Ajoutez une maison, un studio ou un immeuble. Cela ne prend qu'une minute et vous pourrez tout compléter plus tard."
          action={{ href: "/app/biens/nouveau", libelle: "Ajouter mon premier bien" }}
        />
      ) : (
        <div className="space-y-3">
          {biens.map((b) => (
            <Ligne
              key={b.id}
              href={`/app/biens/${b.id}`}
              titre={b.nom}
              sousTitre={[b.quartier, b.ville].filter(Boolean).join(", ")}
              droite={
                <>
                  <Montant valeur={b.loyer_theorique} />
                  <div className="text-xs text-encre-doux mt-0.5">par mois</div>
                </>
              }
              dessous={
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="jeton-neutre">
                    {b.nb_unites} logement{b.nb_unites > 1 ? "s" : ""}
                  </span>
                  <span className={b.nb_occupees > 0 ? "jeton-vert" : "jeton-neutre"}>
                    {b.nb_occupees} occupé{b.nb_occupees > 1 ? "s" : ""}
                  </span>
                  {b.nb_unites - b.nb_occupees > 0 && (
                    <span className="jeton-ocre">
                      {b.nb_unites - b.nb_occupees} libre
                      {b.nb_unites - b.nb_occupees > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}
    </Coquille>
  );
}
