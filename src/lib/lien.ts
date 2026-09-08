import { headers } from "next/headers";

/** Adresse complète du site, telle que la voit le navigateur. */
export async function racine(): Promise<string> {
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocole = h.get("x-forwarded-proto") ?? (hote.startsWith("localhost") ? "http" : "https");
  return `${protocole}://${hote}`;
}

export async function lienAbsolu(chemin: string): Promise<string> {
  return `${await racine()}${chemin}`;
}

/**
 * Lien wa.me : ouvre WhatsApp avec le message déjà rédigé.
 * C'est gratuit, contrairement à l'API WhatsApp Business qui est facturée
 * à la conversation. L'utilisateur relit et appuie sur envoyer.
 */
export function lienWhatsApp(telephone: string, message: string): string {
  const numero = (telephone || "").replace(/\D/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}

export function lienEmail(email: string, objet: string, corps: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`;
}
