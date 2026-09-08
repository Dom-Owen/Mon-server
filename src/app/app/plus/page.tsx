import Link from "next/link";
import { Coquille } from "@/components/coquille";
import { Bloc } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { actionDeconnexion } from "@/lib/actions/auth";

const RUBRIQUES = [
  {
    titre: "Documents",
    liens: [
      ["/app/documents", "Mes documents", "Quittances, reçus, contrats et lettres"],
      ["/app/documents/modeles", "Modèles de documents", "Modifier les clauses de vos contrats"],
      ["/app/etats-des-lieux", "États des lieux", "Entrées, sorties et comparaisons"],
    ],
  },
  {
    titre: "Suivi",
    liens: [
      ["/app/impayes", "Impayés", "Qui doit quoi, du plus ancien au plus récent"],
      ["/app/relances", "Relances", "Avis d'échéance, rappels et mises en demeure"],
      ["/app/charges", "Charges et compteurs", "Relevés, répartitions et factures"],
      ["/app/incidents", "Incidents", "Pannes et réparations signalées"],
    ],
  },
  {
    titre: "Mon compte",
    liens: [
      ["/app/parametres", "Réglages", "Coordonnées, préavis, caution, mentions"],
      ["/app/mandataires", "Mandataires", "Déléguer la gestion à un proche ou une agence"],
      ["/app/journal", "Journal des actions", "Qui a fait quoi, et quand"],
      ["/app/export", "Télécharger mes données", "Tout récupérer en une archive"],
    ],
  },
];

export default async function Plus() {
  const ctx = await exigerContexte();
  return (
    <Coquille ctx={ctx} actif="/app/plus" titre="Plus">
      <div className="space-y-5">
        {RUBRIQUES.map((r) => (
          <Bloc key={r.titre} titre={r.titre}>
            <div className="space-y-2">
              {r.liens.map(([href, libelle, aide]) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between gap-3 py-3 border-b border-sable-200 last:border-0"
                >
                  <div>
                    <div className="font-semibold">{libelle}</div>
                    <div className="text-sm text-encre-doux">{aide}</div>
                  </div>
                  <span aria-hidden className="text-encre-pale">→</span>
                </Link>
              ))}
            </div>
          </Bloc>
        ))}

        {ctx.estLocataire && (
          <Bloc titre="Vous êtes aussi locataire">
            <p className="sous-titre text-sm mb-3">
              Le même compte peut être bailleur d'un bien et locataire d'un autre.
            </p>
            <Link href="/locataire" className="bouton-second">
              Voir mon logement
            </Link>
          </Bloc>
        )}

        <form action={actionDeconnexion}>
          <button type="submit" className="bouton-second w-full">
            Se déconnecter
          </button>
        </form>
      </div>
    </Coquille>
  );
}
