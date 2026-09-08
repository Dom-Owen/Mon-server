import { redirect } from "next/navigation";
import { profilConnecte } from "@/lib/auth";

export default async function Accueil() {
  const profil = await profilConnecte();
  redirect(profil ? "/app" : "/connexion");
}
