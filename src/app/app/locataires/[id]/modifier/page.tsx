import { notFound } from "next/navigation";
import { Coquille } from "@/components/coquille";
import { Bloc } from "@/components/ui";
import { ChampsGarant, ChampsLocataire, ChampsPiece } from "@/components/champs-locataire";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { actionModifierLocataire } from "@/lib/actions/locataires";

export default async function ModifierLocataire({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigerContexte();
  const { id } = await params;
  const loc = db().prepare(`SELECT * FROM locataires WHERE id = ?`).get(id) as any;
  if (!loc || loc.proprietaire_id !== ctx.proprietaireActif) notFound();

  return (
    <Coquille
      ctx={ctx}
      actif="/app/locataires"
      titre="Modifier la fiche"
      retour={{ href: `/app/locataires/${id}`, libelle: loc.nom }}
    >
      <form action={actionModifierLocataire} className="space-y-5">
        <input type="hidden" name="id" value={id} />
        <Bloc titre="Qui est-ce ?">
          <ChampsLocataire loc={loc} />
        </Bloc>
        <Bloc titre="Pièce d'identité">
          <ChampsPiece loc={loc} />
        </Bloc>
        <Bloc titre="Garant et contact d'urgence">
          <ChampsGarant loc={loc} />
        </Bloc>
        <button type="submit" className="bouton-principal w-full">
          Enregistrer les modifications
        </button>
      </form>
    </Coquille>
  );
}
