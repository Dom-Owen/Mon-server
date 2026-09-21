import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { contexteDe, profilConnecte, type Contexte } from "@/lib/auth";

const COOKIE_PROPRIO = "laloc_proprio";

/** À appeler en tête de chaque page de l'espace bailleur. */
export async function exigerContexte(): Promise<Contexte> {
  const profil = await profilConnecte();
  if (!profil) redirect("/connexion");
  const c = await cookies();
  return contexteDe(profil, c.get(COOKIE_PROPRIO)?.value);
}

export async function choisirProprietaire(id: string): Promise<void> {
  const c = await cookies();
  c.set(COOKIE_PROPRIO, id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}
