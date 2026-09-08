import Link from "next/link";
import { entier } from "@/lib/format";

export function Marque({ taille = "normal" }: { taille?: "petit" | "normal" | "grand" }) {
  const t =
    taille === "grand" ? "text-4xl" : taille === "petit" ? "text-lg" : "text-2xl";
  return (
    <span className={`font-titre font-bold tracking-tight ${t}`}>
      <span className="text-encre">la</span>
      <span className="text-terre">loc</span>
    </span>
  );
}

export function Montant({
  valeur,
  ton = "normal",
  taille = "normal",
}: {
  valeur: number;
  ton?: "normal" | "positif" | "negatif" | "doux";
  taille?: "petit" | "normal" | "grand";
}) {
  const couleur =
    ton === "positif"
      ? "text-vert"
      : ton === "negatif"
        ? "text-brique"
        : ton === "doux"
          ? "text-encre-doux"
          : "text-encre";
  const t =
    taille === "grand"
      ? "text-2xl sm:text-3xl font-bold"
      : taille === "petit"
        ? "text-sm font-semibold"
        : "text-base sm:text-lg font-semibold";
  // La devise est écrite plus petite et le tout reste insécable : un montant ne doit
  // jamais se couper au milieu de « FCFA » sur un écran étroit.
  return (
    <span className={`${couleur} ${t} whitespace-nowrap`}>
      <span className="tabular-nums">{entier(valeur)}</span>
      <span className="text-[0.68em] font-semibold ml-1">FCFA</span>
    </span>
  );
}

const LIBELLE_STATUT: Record<string, [string, string]> = {
  soldee: ["Soldée", "jeton-vert"],
  a_venir: ["À venir", "jeton-neutre"],
  due: ["Due", "jeton-ocre"],
  partielle: ["Partiellement payée", "jeton-ocre"],
  en_retard: ["En retard", "jeton-rouge"],
  actif: ["Actif", "jeton-vert"],
  projet: ["En projet", "jeton-neutre"],
  preavis: ["En préavis", "jeton-ocre"],
  termine: ["Terminé", "jeton-neutre"],
  resilie: ["Résilié", "jeton-rouge"],
  libre: ["Libre", "jeton-neutre"],
  occupee: ["Occupée", "jeton-vert"],
  travaux: ["En travaux", "jeton-ocre"],
  reservee: ["Réservée", "jeton-terre"],
  brouillon: ["Brouillon", "jeton-neutre"],
  signe: ["Signé", "jeton-vert"],
  emis: ["Émis", "jeton-vert"],
  annule: ["Annulé", "jeton-rouge"],
  ouvert: ["Ouvert", "jeton-rouge"],
  en_cours: ["En cours", "jeton-ocre"],
  resolu: ["Résolu", "jeton-vert"],
  prete: ["Prête à envoyer", "jeton-ocre"],
  envoyee: ["Envoyée", "jeton-vert"],
};

export function Statut({ valeur }: { valeur: string }) {
  const [libelle, classe] = LIBELLE_STATUT[valeur] ?? [valeur, "jeton-neutre"];
  return <span className={classe}>{libelle}</span>;
}

export function Vide({
  titre,
  texte,
  action,
}: {
  titre: string;
  texte: string;
  action?: { href: string; libelle: string };
}) {
  return (
    <div className="vide">
      <h3 className="text-lg font-bold mb-2">{titre}</h3>
      <p className="sous-titre max-w-md mx-auto">{texte}</p>
      {action && (
        <Link href={action.href} className="bouton-principal mt-5">
          {action.libelle}
        </Link>
      )}
    </div>
  );
}

export function Erreur({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-xl bg-brique-pale border border-brique/30 px-4 py-3 text-brique text-sm font-medium">
      {children}
    </div>
  );
}

export function Succes({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-xl bg-vert-pale border border-vert/30 px-4 py-3 text-vert text-sm font-medium">
      {children}
    </div>
  );
}

export function Avertissement({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-ocre-pale border border-ocre/30 px-4 py-3 text-[13px] text-encre-doux leading-relaxed">
      {children}
    </div>
  );
}

export function Bloc({
  titre,
  action,
  children,
}: {
  titre?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="carte p-5 sm:p-6">
      {(titre || action) && (
        <header className="flex items-center justify-between gap-3 mb-4">
          {titre && <h2 className="text-lg font-bold">{titre}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Chiffre({
  libelle,
  valeur,
  detail,
  ton,
}: {
  libelle: string;
  valeur: React.ReactNode;
  detail?: string;
  ton?: "positif" | "negatif";
}) {
  return (
    <div className="carte p-4">
      <div className="text-[13px] font-semibold text-encre-doux uppercase tracking-wide">
        {libelle}
      </div>
      <div
        className={`mt-1 text-xl sm:text-2xl font-bold tabular-nums ${
          ton === "positif" ? "text-vert" : ton === "negatif" ? "text-brique" : ""
        }`}
      >
        {valeur}
      </div>
      {detail && <div className="text-sm text-encre-doux mt-0.5">{detail}</div>}
    </div>
  );
}

export function Ligne({
  href,
  titre,
  sousTitre,
  droite,
  dessous,
}: {
  href?: string;
  titre: React.ReactNode;
  sousTitre?: React.ReactNode;
  droite?: React.ReactNode;
  dessous?: React.ReactNode;
}) {
  const contenu = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{titre}</div>
          {sousTitre && (
            <div className="text-sm text-encre-doux truncate">{sousTitre}</div>
          )}
        </div>
        {droite && <div className="text-right shrink-0">{droite}</div>}
      </div>
      {dessous}
    </>
  );
  const classe =
    "block w-full text-left carte p-4 transition hover:border-terre/50 hover:shadow-pose";
  return href ? (
    <Link href={href} className={classe}>
      {contenu}
    </Link>
  ) : (
    <div className="carte p-4">{contenu}</div>
  );
}

/** Mention imposée sur tout document tant que le texte n'est pas validé par un juriste. */
export function MentionJuridique() {
  return (
    <p className="text-[12px] text-encre-pale italic">
      Modèle indicatif. À faire valider par un conseil juridique avant usage.
    </p>
  );
}
