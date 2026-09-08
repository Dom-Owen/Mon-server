import Link from "next/link";
import { Marque } from "./ui";
import type { Contexte } from "@/lib/auth";

const ONGLETS = [
  { href: "/app", libelle: "Accueil", icone: "maison" },
  { href: "/app/biens", libelle: "Biens", icone: "immeuble" },
  { href: "/app/locataires", libelle: "Locataires", icone: "personnes" },
  { href: "/app/paiements", libelle: "Argent", icone: "billet" },
  { href: "/app/plus", libelle: "Plus", icone: "points" },
];

function Icone({ nom, actif }: { nom: string; actif: boolean }) {
  const c = actif ? "currentColor" : "none";
  const props = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: c,
    stroke: "currentColor",
    strokeWidth: actif ? 1.6 : 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (nom) {
    case "maison":
      return (
        <svg {...props}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.8V21h14V9.8" />
        </svg>
      );
    case "immeuble":
      return (
        <svg {...props}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" stroke="#fff" strokeWidth="1.8" />
        </svg>
      );
    case "personnes":
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <path d="M16 5.5a3 3 0 0 1 0 5.6M17 14.6a5.5 5.5 0 0 1 3.5 5.4" fill="none" />
        </svg>
      );
    case "billet":
      return (
        <svg {...props}>
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.6" fill="none" stroke="#fff" strokeWidth="1.8" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      );
  }
}

export function Coquille({
  ctx,
  actif,
  titre,
  retour,
  action,
  children,
}: {
  ctx: Contexte;
  actif: string;
  titre?: string;
  retour?: { href: string; libelle: string };
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const parMandat = ctx.proprietaireActif !== ctx.profil.id;
  const bailleur = ctx.proprietaires.find((p) => p.id === ctx.proprietaireActif);

  return (
    <div className="min-h-dvh flex flex-col">
      {/* En-tête */}
      <header className="sticky top-0 z-20 bg-sable-100/95 backdrop-blur border-b border-sable-300 sans-impression">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/app" className="shrink-0">
            <Marque taille="petit" />
          </Link>
          <div className="flex items-center gap-2">
            {ctx.estLocataire && (
              <Link href="/locataire" className="text-sm font-semibold text-terre-fonce">
                Mon logement
              </Link>
            )}
            <Link
              href="/app/parametres"
              className="text-sm font-semibold text-encre-doux truncate max-w-[9rem]"
            >
              {ctx.profil.nom}
            </Link>
          </div>
        </div>

        {parMandat && (
          <div className="bg-terre-pale border-t border-terre/20 px-4 py-2 text-[13px] text-terre-fonce">
            <div className="mx-auto max-w-5xl">
              Vous agissez comme mandataire pour <strong>{bailleur?.nom}</strong>.
              Toutes vos actions sont tracées.{" "}
              <Link href="/app/changer-de-compte" className="underline">
                Changer
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Contenu */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-5 pb-28 sm:pb-8">
        {(titre || retour) && (
          <div className="mb-5">
            {retour && (
              <Link
                href={retour.href}
                className="inline-flex items-center gap-1 text-sm font-semibold text-encre-doux mb-2 sans-impression"
              >
                <span aria-hidden>←</span> {retour.libelle}
              </Link>
            )}
            <div className="flex items-end justify-between gap-4 flex-wrap">
              {titre && <h1 className="titre-page">{titre}</h1>}
              {action && <div className="sans-impression">{action}</div>}
            </div>
          </div>
        )}
        {children}
      </main>

      {/* Navigation basse, sur téléphone */}
      <nav className="nav-basse sans-impression fixed bottom-0 inset-x-0 z-20 bg-white border-t border-sable-300 sm:hidden">
        <ul className="grid grid-cols-5">
          {ONGLETS.map((o) => {
            const estActif = actif === o.href;
            return (
              <li key={o.href}>
                <Link
                  href={o.href}
                  className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                    estActif ? "text-terre" : "text-encre-doux"
                  }`}
                >
                  <Icone nom={o.icone} actif={estActif} />
                  {o.libelle}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Navigation haute, sur ordinateur */}
      <div className="hidden sm:block sans-impression border-t border-sable-300 bg-white">
        <ul className="mx-auto max-w-5xl px-4 flex gap-1 py-2">
          {ONGLETS.map((o) => (
            <li key={o.href}>
              <Link
                href={o.href}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                  actif === o.href
                    ? "bg-terre-pale text-terre-fonce"
                    : "text-encre-doux hover:bg-sable-100"
                }`}
              >
                <Icone nom={o.icone} actif={actif === o.href} />
                {o.libelle}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
