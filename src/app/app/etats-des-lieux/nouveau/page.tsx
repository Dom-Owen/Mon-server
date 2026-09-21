import { Coquille } from "@/components/coquille";
import { Avertissement, Bloc, Vide } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { bauxDuProprietaire, nomLogement } from "@/lib/requetes";
import { aujourdhui } from "@/lib/format";
import { actionCreerEdl } from "@/lib/actions/edl";

export default async function NouvelEdl({
  searchParams,
}: {
  searchParams: Promise<{ bail?: string }>;
}) {
  const ctx = await exigerContexte();
  const { bail } = await searchParams;
  const baux = bauxDuProprietaire(ctx.proprietaireActif, {
    statuts: ["actif", "preavis", "termine"],
  });

  if (baux.length === 0) {
    return (
      <Coquille ctx={ctx} actif="/app/plus" titre="Nouvel état des lieux">
        <Vide
          titre="Aucun bail"
          texte="Un état des lieux se rattache à un bail. Créez-en un d'abord."
          action={{ href: "/app/baux/nouveau", libelle: "Créer un bail" }}
        />
      </Coquille>
    );
  }

  return (
    <Coquille
      ctx={ctx}
      actif="/app/plus"
      titre="Nouvel état des lieux"
      retour={{ href: "/app/etats-des-lieux", libelle: "États des lieux" }}
    >
      <form action={actionCreerEdl} className="space-y-5">
        <Bloc titre="Quel logement">
          <div className="space-y-4">
            <div>
              <label className="etiquette" htmlFor="bail_id">
                Bail concerné
              </label>
              <select id="bail_id" name="bail_id" className="champ" defaultValue={bail} required>
                {baux.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.locataire_nom} — {nomLogement(b)}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="space-y-2">
              <legend className="etiquette">Type</legend>
              <label className="flex items-start gap-3 carte-douce p-3.5 cursor-pointer has-[:checked]:border-terre has-[:checked]:bg-terre-pale">
                <input type="radio" name="type" value="entree" defaultChecked className="mt-1 size-5 accent-[#B0662F]" />
                <span>
                  <span className="font-semibold block">État des lieux d'entrée</span>
                  <span className="text-sm text-encre-doux">À la remise des clés.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 carte-douce p-3.5 cursor-pointer has-[:checked]:border-terre has-[:checked]:bg-terre-pale">
                <input type="radio" name="type" value="sortie" className="mt-1 size-5 accent-[#B0662F]" />
                <span>
                  <span className="font-semibold block">État des lieux de sortie</span>
                  <span className="text-sm text-encre-doux">
                    laloc le comparera automatiquement avec celui d'entrée.
                  </span>
                </span>
              </label>
            </fieldset>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="etiquette" htmlFor="date">
                  Date
                </label>
                <input id="date" name="date" type="date" className="champ" defaultValue={aujourdhui()} />
              </div>
              <div>
                <label className="etiquette" htmlFor="nb_chambres">
                  Nombre de chambres
                </label>
                <input
                  id="nb_chambres"
                  name="nb_chambres"
                  type="number"
                  min={0}
                  max={6}
                  className="champ"
                  defaultValue={1}
                />
              </div>
            </div>
          </div>
        </Bloc>

        <Avertissement>
          laloc prépare la trame pièce par pièce. Vous pourrez noter chaque élément, prendre des
          photos et faire signer les deux parties. Une fois signé, le document est figé et ne
          peut plus être modifié.
        </Avertissement>

        <button type="submit" className="bouton-principal w-full">
          Commencer l'état des lieux
        </button>
      </form>
    </Coquille>
  );
}
