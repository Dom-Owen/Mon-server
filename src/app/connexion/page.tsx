import Link from "next/link";
import { redirect } from "next/navigation";
import { CadrePublic } from "@/components/cadre-public";
import { ChampTelephone } from "@/components/champ-telephone";
import { Erreur, Succes } from "@/components/ui";
import { actionConnexion } from "@/lib/actions/auth";
import { actionDemarrerDemo } from "@/lib/actions/demo";
import { profilConnecte } from "@/lib/auth";

export default async function Connexion({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; ok?: string }>;
}) {
  if (await profilConnecte()) redirect("/app");
  const { e, ok } = await searchParams;

  return (
    <CadrePublic
      titre="Se connecter"
      bas={
        <>
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="lien font-semibold">
            Créer mon compte
          </Link>
        </>
      }
    >
      <form action={actionConnexion} className="space-y-4">
        {e && <Erreur>{e}</Erreur>}
        {ok && <Succes>Mot de passe modifié. Vous pouvez vous connecter.</Succes>}

        <ChampTelephone autoFocus />

        <div>
          <label className="etiquette" htmlFor="mot_de_passe">
            Mot de passe
          </label>
          <input
            id="mot_de_passe"
            name="mot_de_passe"
            type="password"
            autoComplete="current-password"
            className="champ"
            required
          />
        </div>

        <button type="submit" className="bouton-principal w-full">
          Se connecter
        </button>

        <div className="text-center">
          <Link href="/mot-de-passe-oublie" className="lien text-sm">
            J'ai oublié mon mot de passe
          </Link>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-sable-300">
        <p className="text-sm text-encre-doux mb-3 text-center">
          Vous voulez d'abord voir à quoi ça ressemble ?
        </p>
        <form action={actionDemarrerDemo}>
          <button type="submit" className="bouton-second w-full">
            Ouvrir la démonstration
          </button>
        </form>
        <p className="aide text-center">
          Un bailleur d'exemple avec ses immeubles, ses locataires et ses paiements.
          Pour voir le côté locataire, connectez-vous ensuite avec le
          <strong> 677 44 55 66</strong> et le mot de passe <strong>demo1234</strong>.
        </p>
      </div>
    </CadrePublic>
  );
}
