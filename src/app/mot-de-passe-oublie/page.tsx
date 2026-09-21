import Link from "next/link";
import { CadrePublic } from "@/components/cadre-public";
import { ChampTelephone } from "@/components/champ-telephone";
import { Erreur, Avertissement } from "@/components/ui";
import { actionMotDePasseOublie } from "@/lib/actions/auth";

export default async function MotDePasseOublie({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  return (
    <CadrePublic
      titre="Retrouver mon accès"
      sousTitre="Avec le code de récupération qui vous a été donné à l'inscription."
      bas={
        <Link href="/connexion" className="lien font-semibold">
          Retour à la connexion
        </Link>
      }
    >
      <form action={actionMotDePasseOublie} className="space-y-4">
        {e && <Erreur>{e}</Erreur>}

        <ChampTelephone autoFocus />

        <div>
          <label className="etiquette" htmlFor="code">
            Code de récupération
          </label>
          <input
            id="code"
            name="code"
            className="champ font-mono uppercase tracking-wider"
            placeholder="XXXX-XXXX-XXXX"
            required
          />
        </div>

        <div>
          <label className="etiquette" htmlFor="mot_de_passe">
            Nouveau mot de passe
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
        </div>

        <button type="submit" className="bouton-principal w-full">
          Changer mon mot de passe
        </button>

        <Avertissement>
          <strong>Vous êtes locataire et vous n'avez pas de code ?</strong> C'est normal.
          Demandez à votre bailleur de vous renvoyer votre lien d'accès par WhatsApp, il
          vous permettra de choisir un nouveau mot de passe.
        </Avertissement>
      </form>
    </CadrePublic>
  );
}
