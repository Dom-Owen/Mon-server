import { notFound } from "next/navigation";
import { Coquille } from "@/components/coquille";
import { Bloc } from "@/components/ui";
import { ChampsAdresse, ChampsCharges, ChampsType } from "@/components/champs-bien";
import { exigerContexte } from "@/lib/session";
import { bienParId } from "@/lib/requetes";
import { actionModifierBien } from "@/lib/actions/biens";

export default async function ModifierBien({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigerContexte();
  const { id } = await params;
  const bien = bienParId(id);
  if (!bien || bien.proprietaire_id !== ctx.proprietaireActif) notFound();

  return (
    <Coquille
      ctx={ctx}
      actif="/app/biens"
      titre="Modifier le bien"
      retour={{ href: `/app/biens/${id}`, libelle: bien.nom }}
    >
      <form action={actionModifierBien} className="space-y-5">
        <input type="hidden" name="id" value={id} />

        <Bloc titre="Le bien">
          <div className="space-y-4">
            <div>
              <label className="etiquette" htmlFor="nom">
                Nom
              </label>
              <input id="nom" name="nom" className="champ" defaultValue={bien.nom} required />
            </div>
            <ChampsType bien={bien} />
          </div>
        </Bloc>

        <Bloc titre="Adresse">
          <div className="space-y-4">
            <ChampsAdresse bien={bien} />
          </div>
        </Bloc>

        <Bloc titre="Charges">
          <ChampsCharges bien={bien} />
        </Bloc>

        <button type="submit" className="bouton-principal w-full">
          Enregistrer les modifications
        </button>
      </form>
    </Coquille>
  );
}
