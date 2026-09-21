import { SANS_DISQUE_PERMANENT } from "@/lib/stockage";

/**
 * Dit honnêtement ce que vaut le site quand il tourne sur un hébergement sans
 * disque permanent : tout fonctionne, mais rien n'est conservé durablement.
 * Mieux vaut le lire avant d'y saisir de vraies données que de le découvrir après.
 */
export function BandeauDemonstration() {
  if (!SANS_DISQUE_PERMANENT) return null;
  return (
    <div className="bg-encre text-sable-100 text-[13px] leading-snug px-4 py-2 sans-impression">
      <div className="mx-auto max-w-5xl">
        <strong>Démonstration.</strong> Tout fonctionne, mais les données sont remises à
        zéro régulièrement. N'y saisissez pas de vrais loyers.
      </div>
    </div>
  );
}
