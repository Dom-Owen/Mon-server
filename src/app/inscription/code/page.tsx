import Link from "next/link";
import { CadrePublic } from "@/components/cadre-public";

/**
 * Le code de récupération est affiché UNE SEULE FOIS.
 * C'est le seul moyen de reprendre la main sans email ni SMS.
 */
export default async function CodeRecuperation({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  if (!c) {
    return (
      <CadrePublic titre="Compte créé">
        <Link href="/app" className="bouton-principal w-full">
          Continuer
        </Link>
      </CadrePublic>
    );
  }

  return (
    <CadrePublic
      titre="Notez ce code, il ne sera plus affiché"
      sousTitre="C'est votre seul moyen de récupérer votre compte si vous oubliez votre mot de passe."
    >
      <div className="rounded-xl bg-terre-pale border-2 border-terre/30 px-4 py-6 text-center">
        <div className="text-[11px] font-bold uppercase tracking-widest text-terre-fonce">
          Code de récupération
        </div>
        <div className="mt-2 font-mono text-2xl sm:text-3xl font-bold tracking-wider text-encre break-all">
          {c}
        </div>
      </div>

      <ul className="mt-5 space-y-2 text-[15px] text-encre-doux">
        <li className="flex gap-2">
          <span aria-hidden>•</span>
          <span>Écrivez-le sur un papier que vous rangez en lieu sûr.</span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden>•</span>
          <span>Ou faites une capture d'écran et gardez-la dans vos photos.</span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden>•</span>
          <span>Ne l'envoyez à personne. Il donne accès à tout votre compte.</span>
        </li>
      </ul>

      <form action="/app" className="mt-6">
        <label className="flex items-start gap-3 mb-4 cursor-pointer">
          <input type="checkbox" required className="mt-1 size-5 accent-[#B0662F]" />
          <span className="text-[15px] font-medium">
            J'ai noté mon code et je l'ai mis en lieu sûr.
          </span>
        </label>
        <button type="submit" className="bouton-principal w-full">
          Continuer vers mes biens
        </button>
      </form>
    </CadrePublic>
  );
}
