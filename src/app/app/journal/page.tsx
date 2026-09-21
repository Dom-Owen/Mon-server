import { Coquille } from "@/components/coquille";
import { Bloc, Vide } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { journalDe } from "@/lib/audit";
import { horodatageDouala } from "@/lib/format";

export default async function Journal() {
  const ctx = await exigerContexte();
  const lignes = journalDe(ctx.proprietaireActif, 200);

  const couleur: Record<string, string> = {
    creation: "jeton-vert",
    modification: "jeton-ocre",
    suppression: "jeton-rouge",
  };
  const libelle: Record<string, string> = {
    creation: "Ajout",
    modification: "Modification",
    suppression: "Archivage",
  };

  return (
    <Coquille
      ctx={ctx}
      actif="/app/plus"
      titre="Journal des actions"
      retour={{ href: "/app/plus", libelle: "Plus" }}
    >
      <div className="space-y-4">
        <p className="sous-titre">
          Tout ce qui a été fait sur votre compte, par vous ou par vos mandataires. Cette liste
          ne peut être ni modifiée ni effacée, par personne.
        </p>

        {lignes.length === 0 ? (
          <Vide
            titre="Rien à afficher pour l'instant"
            texte="Dès que vous ou un mandataire enregistrerez une action, elle apparaîtra ici avec sa date et son auteur."
          />
        ) : (
          <Bloc>
            <div className="space-y-2">
              {lignes.map((l) => (
                <div
                  key={l.id}
                  className="flex items-start justify-between gap-3 py-2.5 border-b border-sable-200 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-[15px]">{l.resume}</div>
                    <div className="text-xs text-encre-doux">
                      {l.utilisateur_nom} · {horodatageDouala(l.cree_le)}
                    </div>
                  </div>
                  <span className={couleur[l.action] ?? "jeton-neutre"}>
                    {libelle[l.action] ?? l.action}
                  </span>
                </div>
              ))}
            </div>
          </Bloc>
        )}
      </div>
    </Coquille>
  );
}
