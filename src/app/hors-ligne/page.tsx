import { Marque } from "@/components/ui";

export const dynamic = "force-static";

export default function HorsLigne() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center bg-sable-100">
      <Marque taille="grand" />
      <h1 className="text-xl font-bold mt-6">Vous n'avez pas de connexion</h1>
      <p className="sous-titre mt-2 max-w-sm">
        Cette page n'a pas encore été chargée sur votre téléphone. Revenez dès que le réseau
        est revenu, ou ouvrez une page que vous avez déjà consultée.
      </p>
      <a href="/app" className="bouton-principal mt-6">
        Réessayer
      </a>
    </div>
  );
}
