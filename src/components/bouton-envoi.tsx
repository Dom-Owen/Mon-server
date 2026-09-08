"use client";

import { useFormStatus } from "react-dom";

/**
 * Bouton d'envoi qui s'éteint pendant la soumission.
 *
 * On utilise useFormStatus plutôt que de désactiver le bouton depuis onSubmit :
 * désactiver le bouton dans le gestionnaire d'événement retire le déclencheur du
 * formulaire et annule l'envoi. C'est un piège classique, et silencieux.
 */
export function BoutonEnvoi({
  children,
  enCours,
  className = "bouton-principal w-full text-base py-4",
}: {
  children: React.ReactNode;
  enCours?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (enCours ?? "Enregistrement…") : children}
    </button>
  );
}
