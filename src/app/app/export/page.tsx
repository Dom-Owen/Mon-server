import { Coquille } from "@/components/coquille";
import { Bloc } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { bauxDuProprietaire, nomLogement } from "@/lib/requetes";

export default async function Export() {
  const ctx = await exigerContexte();
  const base = db();
  const compte = base
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM biens WHERE proprietaire_id = ?) AS biens,
        (SELECT COUNT(*) FROM locataires WHERE proprietaire_id = ?) AS locataires,
        (SELECT COUNT(*) FROM baux WHERE proprietaire_id = ?) AS baux,
        (SELECT COUNT(*) FROM paiements WHERE proprietaire_id = ?) AS paiements,
        (SELECT COUNT(*) FROM documents_emis WHERE proprietaire_id = ?) AS documents`,
    )
    .get(
      ctx.proprietaireActif,
      ctx.proprietaireActif,
      ctx.proprietaireActif,
      ctx.proprietaireActif,
      ctx.proprietaireActif,
    ) as any;

  const baux = bauxDuProprietaire(ctx.proprietaireActif, {
    statuts: ["actif", "preavis", "termine", "resilie"],
  });

  return (
    <Coquille
      ctx={ctx}
      actif="/app/plus"
      titre="Télécharger mes données"
      retour={{ href: "/app/plus", libelle: "Plus" }}
    >
      <div className="space-y-5">
        <Bloc titre="Tout récupérer">
          <p className="sous-titre mb-4">
            Vos données vous appartiennent. Ce bouton fabrique une archive contenant vos
            tableaux, tous vos PDF et toutes vos photos. Elle s'ouvre sur n'importe quel
            ordinateur, sans laloc et sans internet.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
            {[
              ["Biens", compte.biens],
              ["Locataires", compte.locataires],
              ["Baux", compte.baux],
              ["Paiements", compte.paiements],
              ["Documents", compte.documents],
            ].map(([libelle, valeur]) => (
              <div key={String(libelle)} className="carte-douce p-3 text-center">
                <div className="text-2xl font-bold tabular-nums">{String(valeur)}</div>
                <div className="text-xs text-encre-doux font-semibold uppercase tracking-wide">
                  {String(libelle)}
                </div>
              </div>
            ))}
          </div>

          <a href="/api/export" className="bouton-principal w-full text-base py-4">
            Télécharger toutes mes données
          </a>
          <p className="aide">
            Format ZIP. Les tableaux sont en CSV, lisibles par Excel et LibreOffice.
          </p>
        </Bloc>

        <Bloc titre="L'historique d'un seul bail">
          <p className="sous-titre text-sm mb-4">
            Utile en cas de litige : tout ce qui concerne un locataire dans un seul fichier.
          </p>
          {baux.length === 0 ? (
            <p className="sous-titre text-sm">Aucun bail pour l'instant.</p>
          ) : (
            <div className="space-y-2">
              {baux.map((b) => (
                <a
                  key={b.id}
                  href={`/api/export?bail=${b.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-sable-200 last:border-0"
                >
                  <div>
                    <div className="font-semibold text-[15px]">{b.locataire_nom}</div>
                    <div className="text-sm text-encre-doux">{nomLogement(b)}</div>
                  </div>
                  <span className="bouton-doux py-1.5 px-3 text-sm shrink-0">Télécharger</span>
                </a>
              ))}
            </div>
          )}
        </Bloc>
      </div>
    </Coquille>
  );
}
