"use server";

import { redirect } from "next/navigation";
import { db, maintenant, nouvelId } from "@/lib/db";
import { normaliserTelephone } from "@/lib/format";
import {
  connecter,
  creerCompte,
  fermerSession,
  hacher,
  invitationParJeton,
  ouvrirSession,
  reinitialiserParCode,
} from "@/lib/auth";

function erreur(chemin: string, message: string, extra = ""): never {
  redirect(`${chemin}?e=${encodeURIComponent(message)}${extra}`);
}

export async function actionConnexion(formData: FormData) {
  const brut = String(formData.get("telephone") ?? "");
  const indicatif = String(formData.get("indicatif") ?? "237");
  const motDePasse = String(formData.get("mot_de_passe") ?? "");

  const tel = normaliserTelephone(brut, indicatif);
  if (!tel) {
    erreur(
      "/connexion",
      "Ce numéro ne semble pas valide. Au Cameroun, un mobile a 9 chiffres et commence par 6.",
    );
  }
  const profil = await connecter(tel, motDePasse);
  if (!profil) {
    erreur("/connexion", "Numéro ou mot de passe incorrect. Vérifiez et réessayez.");
  }
  await ouvrirSession(profil.id);
  redirect("/app");
}

export async function actionInscription(formData: FormData) {
  const nom = String(formData.get("nom") ?? "").trim();
  const brut = String(formData.get("telephone") ?? "");
  const indicatif = String(formData.get("indicatif") ?? "237");
  const email = String(formData.get("email") ?? "").trim();
  const motDePasse = String(formData.get("mot_de_passe") ?? "");

  if (nom.length < 2) erreur("/inscription", "Merci d'indiquer votre nom.");
  const tel = normaliserTelephone(brut, indicatif);
  if (!tel) {
    erreur(
      "/inscription",
      "Ce numéro ne semble pas valide. Au Cameroun, un mobile a 9 chiffres et commence par 6.",
    );
  }
  if (motDePasse.length < 6) {
    erreur("/inscription", "Le mot de passe doit faire au moins 6 caractères.");
  }

  let resultat;
  try {
    resultat = await creerCompte({ telephone: tel, nom, motDePasse, email: email || null });
  } catch {
    erreur(
      "/inscription",
      "Un compte existe déjà avec ce numéro. Essayez de vous connecter.",
    );
  }
  await ouvrirSession(resultat.profil.id);
  redirect(`/inscription/code?c=${encodeURIComponent(resultat.codeRecuperation)}`);
}

export async function actionDeconnexion() {
  await fermerSession();
  redirect("/connexion");
}

export async function actionMotDePasseOublie(formData: FormData) {
  const brut = String(formData.get("telephone") ?? "");
  const code = String(formData.get("code") ?? "");
  const motDePasse = String(formData.get("mot_de_passe") ?? "");

  const tel = normaliserTelephone(brut);
  if (!tel) erreur("/mot-de-passe-oublie", "Ce numéro ne semble pas valide.");
  if (motDePasse.length < 6) {
    erreur("/mot-de-passe-oublie", "Le nouveau mot de passe doit faire au moins 6 caractères.");
  }
  const ok = await reinitialiserParCode(tel, code, motDePasse);
  if (!ok) {
    erreur(
      "/mot-de-passe-oublie",
      "Ce code de récupération ne correspond pas à ce numéro. Si vous êtes locataire, demandez à votre bailleur de vous renvoyer un lien d'accès.",
    );
  }
  redirect("/connexion?ok=1");
}

/** Activation d'un accès reçu par WhatsApp : la personne choisit elle-même son mot de passe. */
export async function actionActiverAcces(formData: FormData) {
  const jeton = String(formData.get("jeton") ?? "");
  const nom = String(formData.get("nom") ?? "").trim();
  const motDePasse = String(formData.get("mot_de_passe") ?? "");
  const chemin = `/activer/${jeton}`;

  if (motDePasse.length < 6) {
    erreur(chemin, "Le mot de passe doit faire au moins 6 caractères.");
  }
  const inv = invitationParJeton(jeton);
  if (!inv) {
    erreur(chemin, "Ce lien n'est plus valable. Demandez-en un nouveau à votre bailleur.");
  }

  const base = db();
  let profil = base.prepare(`SELECT * FROM profils WHERE telephone = ?`).get(inv.telephone) as any;

  if (!profil) {
    const id = nouvelId();
    base
      .prepare(
        `INSERT INTO profils (id, telephone, nom, mot_de_passe, langue, est_admin, cree_le)
         VALUES (?, ?, ?, ?, 'fr', 0, ?)`,
      )
      .run(id, inv.telephone, nom || "Locataire", await hacher(motDePasse), maintenant());
    profil = { id };
  } else {
    base
      .prepare(`UPDATE profils SET mot_de_passe = ? WHERE id = ?`)
      .run(await hacher(motDePasse), profil.id);
  }

  if (inv.role === "locataire" && inv.cible_id) {
    base.prepare(`UPDATE locataires SET profil_id = ? WHERE id = ?`).run(profil.id, inv.cible_id);
  }
  if (inv.role === "mandataire" && inv.cible_id) {
    base.prepare(`UPDATE mandats SET mandataire_id = ? WHERE id = ?`).run(profil.id, inv.cible_id);
  }
  base.prepare(`UPDATE invitations SET utilise_le = ? WHERE id = ?`).run(maintenant(), inv.id);

  await ouvrirSession(profil.id);
  redirect(inv.role === "locataire" ? "/locataire" : "/app");
}
