import { Coquille } from "@/components/coquille";
import { Bloc, Erreur } from "@/components/ui";
import { ChampsGarant, ChampsLocataire, ChampsPiece } from "@/components/champs-locataire";
import { exigerContexte } from "@/lib/session";
import { actionCreerLocataire } from "@/lib/actions/locataires";

export default async function NouveauLocataire({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const ctx = await exigerContexte();
  const { e } = await searchParams;

  return (
    <Coquille
      ctx={ctx}
      actif="/app/locataires"
      titre="Ajouter un locataire"
      retour={{ href: "/app/locataires", libelle: "Mes locataires" }}
    >
      <form action={actionCreerLocataire} className="space-y-5">
        {e && <Erreur>{e}</Erreur>}

        <Bloc titre="Qui est-ce ?">
          <ChampsLocataire />
        </Bloc>

        <Bloc titre="Pièce d'identité">
          <ChampsPiece />
        </Bloc>

        <Bloc titre="Garant et contact d'urgence">
          <ChampsGarant />
        </Bloc>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            name="puis"
            value="bail"
            className="bouton-principal flex-1"
          >
            Enregistrer et créer son bail
          </button>
          <button type="submit" name="puis" value="fiche" className="bouton-second flex-1">
            Enregistrer seulement
          </button>
        </div>
      </form>
    </Coquille>
  );
}
