import { Coquille } from "@/components/coquille";
import { Bloc } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { actionChangerDeCompte } from "@/lib/actions/parametres";

export default async function ChangerDeCompte() {
  const ctx = await exigerContexte();
  return (
    <Coquille
      ctx={ctx}
      actif="/app/plus"
      titre="Changer de compte"
      retour={{ href: "/app", libelle: "Accueil" }}
    >
      <Bloc titre="Vous gérez plusieurs patrimoines">
        <p className="sous-titre text-sm mb-4">
          Vos propres biens, et ceux dont on vous a confié la gestion. Choisissez celui que
          vous voulez consulter.
        </p>
        <div className="space-y-2">
          {ctx.proprietaires.map((p) => (
            <form key={p.id} action={actionChangerDeCompte}>
              <input type="hidden" name="proprietaire_id" value={p.id} />
              <button
                type="submit"
                className={`w-full text-left carte p-4 transition hover:border-terre/50 ${
                  p.id === ctx.proprietaireActif ? "border-terre bg-terre-pale" : ""
                }`}
              >
                <div className="font-semibold">{p.nom}</div>
                <div className="text-sm text-encre-doux">
                  {p.propre ? "Vos biens, tous les droits" : `Mandat · ${p.droits.length} droit(s)`}
                </div>
              </button>
            </form>
          ))}
        </div>
      </Bloc>
    </Coquille>
  );
}
