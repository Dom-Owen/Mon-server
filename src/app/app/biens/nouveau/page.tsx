import { Coquille } from "@/components/coquille";
import { Bloc, Erreur } from "@/components/ui";
import { ChampsAdresse, ChampsCharges, ChampsType } from "@/components/champs-bien";
import { exigerContexte } from "@/lib/session";
import { actionCreerBien } from "@/lib/actions/biens";

export default async function NouveauBien({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const ctx = await exigerContexte();
  const { e } = await searchParams;

  return (
    <Coquille
      ctx={ctx}
      actif="/app/biens"
      titre="Ajouter un bien"
      retour={{ href: "/app/biens", libelle: "Mes biens" }}
    >
      <form action={actionCreerBien} className="space-y-5">
        {e && <Erreur>{e}</Erreur>}

        <Bloc titre="Le bien">
          <div className="space-y-4">
            <div>
              <label className="etiquette" htmlFor="nom">
                Comment l'appelez-vous ?
              </label>
              <input
                id="nom"
                name="nom"
                className="champ"
                placeholder="Maison Makepe, Immeuble Bonamoussadi…"
                autoFocus
                required
              />
              <p className="aide">Le nom que vous utilisez vous-même pour en parler.</p>
            </div>
            <ChampsType />
          </div>
        </Bloc>

        <Bloc titre="Où se trouve-t-il ?">
          <div className="space-y-4">
            <ChampsAdresse />
          </div>
        </Bloc>

        <Bloc titre="Combien de logements ?">
          <div className="space-y-3">
            <label className="flex items-start gap-3 carte-douce p-3.5 cursor-pointer has-[:checked]:border-terre has-[:checked]:bg-terre-pale">
              <input
                type="radio"
                name="plusieurs_unites"
                value="0"
                defaultChecked
                className="mt-1 size-5 accent-[#B0662F] shrink-0"
              />
              <span>
                <span className="font-semibold block">Un seul logement</span>
                <span className="text-sm text-encre-doux">
                  Une maison, un studio, une boutique que vous louez en entier.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 carte-douce p-3.5 cursor-pointer has-[:checked]:border-terre has-[:checked]:bg-terre-pale">
              <input
                type="radio"
                name="plusieurs_unites"
                value="1"
                className="mt-1 size-5 accent-[#B0662F] shrink-0"
              />
              <span>
                <span className="font-semibold block">Plusieurs logements</span>
                <span className="text-sm text-encre-doux">
                  Un immeuble avec des studios ou des appartements loués séparément.
                </span>
              </span>
            </label>
            <div>
              <label className="etiquette" htmlFor="nb_unites">
                Si plusieurs : combien ?
              </label>
              <input
                id="nb_unites"
                name="nb_unites"
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                defaultValue={3}
                className="champ"
              />
              <p className="aide">
                Vous pourrez les renommer un par un ensuite (Studio A1, Studio A2…).
              </p>
            </div>
          </div>
        </Bloc>

        <Bloc titre="Le loyer de référence">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="etiquette" htmlFor="loyer_reference">
                Loyer mensuel demandé
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="loyer_reference"
                  name="loyer_reference"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  className="champ"
                  placeholder="60000"
                />
                <span className="font-semibold text-encre-doux shrink-0">FCFA</span>
              </div>
            </div>
            <div>
              <label className="etiquette" htmlFor="caution_reference">
                Caution demandée
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="caution_reference"
                  name="caution_reference"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  className="champ"
                  placeholder="120000"
                />
                <span className="font-semibold text-encre-doux shrink-0">FCFA</span>
              </div>
            </div>
            <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
              <div>
                <label className="etiquette" htmlFor="nb_pieces">
                  Nombre de pièces
                </label>
                <input
                  id="nb_pieces"
                  name="nb_pieces"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="champ"
                />
              </div>
              <div>
                <label className="etiquette" htmlFor="superficie">
                  Superficie approximative (m²)
                </label>
                <input
                  id="superficie"
                  name="superficie"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="champ"
                />
              </div>
            </div>
            <label className="sm:col-span-2 flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="meuble" value="1" className="size-5 accent-[#B0662F]" />
              <span className="font-medium">Le logement est meublé</span>
            </label>
          </div>
        </Bloc>

        <Bloc titre="Les charges">
          <ChampsCharges />
        </Bloc>

        <div className="flex gap-3">
          <button type="submit" className="bouton-principal flex-1">
            Enregistrer le bien
          </button>
        </div>
      </form>
    </Coquille>
  );
}
