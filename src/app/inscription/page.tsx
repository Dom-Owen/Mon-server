import Link from "next/link";
import { CadrePublic } from "@/components/cadre-public";
import { ChampTelephone } from "@/components/champ-telephone";
import { Erreur } from "@/components/ui";
import { actionInscription } from "@/lib/actions/auth";

export default async function Inscription({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  return (
    <CadrePublic
      titre="Créer mon compte"
      sousTitre="Votre numéro de téléphone sert d'identifiant. Pas besoin d'adresse email."
      bas={
        <>
          Déjà un compte ?{" "}
          <Link href="/connexion" className="lien font-semibold">
            Se connecter
          </Link>
        </>
      }
    >
      <form action={actionInscription} className="space-y-4">
        {e && <Erreur>{e}</Erreur>}

        <div>
          <label className="etiquette" htmlFor="nom">
            Votre nom
          </label>
          <input id="nom" name="nom" className="champ" autoFocus required />
        </div>

        <ChampTelephone />

        <div>
          <label className="etiquette" htmlFor="mot_de_passe">
            Mot de passe
          </label>
          <input
            id="mot_de_passe"
            name="mot_de_passe"
            type="password"
            autoComplete="new-password"
            className="champ"
            minLength={6}
            required
          />
          <p className="aide">Au moins 6 caractères.</p>
        </div>

        <div>
          <label className="etiquette" htmlFor="email">
            Adresse email <span className="font-normal text-encre-pale">(facultatif)</span>
          </label>
          <input id="email" name="email" type="email" className="champ" />
          <p className="aide">
            Elle sert seulement à retrouver votre mot de passe et à envoyer des documents.
            Vous ne vous en servirez jamais pour vous connecter.
          </p>
        </div>

        <button type="submit" className="bouton-principal w-full">
          Créer mon compte
        </button>
      </form>
    </CadrePublic>
  );
}
