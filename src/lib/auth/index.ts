import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db, nouvelId, maintenant } from "@/lib/db";

/**
 * Connexion par NUMÉRO DE TÉLÉPHONE.
 *
 * Toute la logique de connexion est concentrée ici. Le jour où l'on voudra ajouter un
 * code à usage unique par SMS ou par WhatsApp, ou passer à Supabase, c'est le seul
 * fichier à reprendre : aucun écran n'appelle directement la base pour s'authentifier.
 */

const NOM_COOKIE = "laloc_session";
const SECRET =
  process.env.LALOC_SECRET ?? "cle-de-demonstration-a-remplacer-en-production";

export type Profil = {
  id: string;
  telephone: string;
  email: string | null;
  nom: string;
  langue: string;
  est_admin: number;
};

// ------------------------------------------------------------- mots de passe

export async function hacher(motDePasse: string): Promise<string> {
  return bcrypt.hash(motDePasse, 10);
}

export async function verifier(motDePasse: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(motDePasse, hash);
}

/** Code de récupération remis une seule fois à l'inscription. */
export function genererCodeRecuperation(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I, O, 0, 1 : illisibles
  const octets = crypto.randomBytes(12);
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += alphabet[octets[i] % alphabet.length];
    if (i === 3 || i === 7) code += "-";
  }
  return code;
}

// ----------------------------------------------------------------- sessions

function signer(valeur: string): string {
  return crypto.createHmac("sha256", SECRET).update(valeur).digest("base64url");
}

export async function ouvrirSession(profilId: string): Promise<void> {
  const jeton = `${profilId}.${signer(profilId)}`;
  const c = await cookies();
  c.set(NOM_COOKIE, jeton, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function fermerSession(): Promise<void> {
  const c = await cookies();
  c.delete(NOM_COOKIE);
}

export async function profilConnecte(): Promise<Profil | null> {
  const c = await cookies();
  const jeton = c.get(NOM_COOKIE)?.value;
  if (!jeton) return null;
  const [id, signature] = jeton.split(".");
  if (!id || !signature) return null;
  // Comparaison à temps constant : ne révèle rien par la durée de la vérification.
  const attendue = signer(id);
  if (
    signature.length !== attendue.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(attendue))
  ) {
    return null;
  }
  const p = db()
    .prepare(
      `SELECT id, telephone, email, nom, langue, est_admin FROM profils WHERE id = ?`,
    )
    .get(id) as Profil | undefined;
  return p ?? null;
}

// ---------------------------------------------------------------- comptes

export async function creerCompte(opts: {
  telephone: string;
  nom: string;
  motDePasse: string;
  email?: string | null;
}): Promise<{ profil: Profil; codeRecuperation: string }> {
  const base = db();
  const existe = base
    .prepare(`SELECT id FROM profils WHERE telephone = ?`)
    .get(opts.telephone);
  if (existe) throw new Error("Un compte existe déjà avec ce numéro.");

  const id = nouvelId();
  const code = genererCodeRecuperation();
  base
    .prepare(
      `INSERT INTO profils (id, telephone, email, nom, mot_de_passe, code_recuperation_hash, langue, est_admin, cree_le)
       VALUES (?, ?, ?, ?, ?, ?, 'fr', 0, ?)`,
    )
    .run(
      id,
      opts.telephone,
      opts.email || null,
      opts.nom,
      await hacher(opts.motDePasse),
      await hacher(code),
      maintenant(),
    );

  // Chaque bailleur démarre avec ses paramètres et ses modèles de message.
  base
    .prepare(
      `INSERT INTO parametres (proprietaire_id, telephone, mention_legale_documents, maj_le)
       VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING`,
    )
    .run(
      id,
      opts.telephone,
      "Modèle indicatif. À faire valider par un conseil juridique avant usage.",
      maintenant(),
    );

  const profil = base
    .prepare(`SELECT id, telephone, email, nom, langue, est_admin FROM profils WHERE id = ?`)
    .get(id) as Profil;
  return { profil, codeRecuperation: code };
}

export async function connecter(
  telephone: string,
  motDePasse: string,
): Promise<Profil | null> {
  const p = db()
    .prepare(`SELECT * FROM profils WHERE telephone = ?`)
    .get(telephone) as any;
  if (!p || !p.mot_de_passe) return null;
  if (!(await verifier(motDePasse, p.mot_de_passe))) return null;
  return {
    id: p.id,
    telephone: p.telephone,
    email: p.email,
    nom: p.nom,
    langue: p.langue,
    est_admin: p.est_admin,
  };
}

/** Réinitialisation par code de récupération, sans email ni SMS. */
export async function reinitialiserParCode(
  telephone: string,
  code: string,
  nouveauMotDePasse: string,
): Promise<boolean> {
  const base = db();
  const p = base.prepare(`SELECT * FROM profils WHERE telephone = ?`).get(telephone) as any;
  if (!p || !p.code_recuperation_hash) return false;
  if (!(await verifier(code.trim().toUpperCase(), p.code_recuperation_hash))) return false;
  const nouveauCode = genererCodeRecuperation();
  base
    .prepare(`UPDATE profils SET mot_de_passe = ?, code_recuperation_hash = ? WHERE id = ?`)
    .run(await hacher(nouveauMotDePasse), await hacher(nouveauCode), p.id);
  return true;
}

// ------------------------------------------------------- rôles et périmètre

export type Droit =
  | "encaisser"
  | "creer_bail"
  | "resilier_bail"
  | "generer_documents"
  | "etat_des_lieux"
  | "inviter_locataire"
  | "modifier_modeles";

export const TOUS_LES_DROITS: { code: Droit; libelle: string }[] = [
  { code: "encaisser", libelle: "Encaisser un paiement" },
  { code: "creer_bail", libelle: "Créer un bail" },
  { code: "resilier_bail", libelle: "Résilier un bail" },
  { code: "generer_documents", libelle: "Générer les documents" },
  { code: "etat_des_lieux", libelle: "Faire un état des lieux" },
  { code: "inviter_locataire", libelle: "Donner l'accès à un locataire" },
  { code: "modifier_modeles", libelle: "Modifier les modèles de documents" },
];

export type Contexte = {
  profil: Profil;
  /** Bailleurs dont ce profil peut voir les données : lui-même, plus ses mandats. */
  proprietaires: { id: string; nom: string; propre: boolean; droits: Droit[] }[];
  /** Le bailleur actuellement consulté. */
  proprietaireActif: string;
  droits: Droit[];
  estProprietaire: boolean;
  estLocataire: boolean;
};

/**
 * Le rôle n'est jamais stocké sur l'utilisateur : il se déduit du lien entre la
 * personne et le bien. Un même compte peut être bailleur d'un bien et locataire
 * d'un autre, ce qui est fréquent.
 */
export function contexteDe(profil: Profil, proprietaireDemande?: string): Contexte {
  const base = db();

  const aDesBiens = base
    .prepare(`SELECT COUNT(*) AS n FROM biens WHERE proprietaire_id = ?`)
    .get(profil.id) as any;

  const mandats = base
    .prepare(
      `SELECT m.*, p.nom AS bailleur_nom FROM mandats m
       JOIN profils p ON p.id = m.bailleur_id
       WHERE m.mandataire_id = ? AND m.revoque_le IS NULL
         AND (m.date_fin IS NULL OR m.date_fin >= date('now'))`,
    )
    .all(profil.id) as any[];

  const proprietaires: Contexte["proprietaires"] = [];
  // On est toujours bailleur de son propre compte, même sans bien : c'est ce qui
  // permet d'en ajouter un premier.
  proprietaires.push({
    id: profil.id,
    nom: "Mes biens",
    propre: true,
    droits: TOUS_LES_DROITS.map((d) => d.code),
  });
  for (const m of mandats) {
    proprietaires.push({
      id: m.bailleur_id,
      nom: m.bailleur_nom,
      propre: false,
      droits: JSON.parse(m.droits_json || "[]"),
    });
  }

  const actif =
    proprietaireDemande && proprietaires.some((p) => p.id === proprietaireDemande)
      ? proprietaireDemande
      : profil.id;
  const entree = proprietaires.find((p) => p.id === actif)!;

  const estLocataire =
    (base
      .prepare(
        `SELECT COUNT(*) AS n FROM locataires l
         JOIN baux b ON b.locataire_id = l.id
         WHERE l.profil_id = ? AND b.statut IN ('actif','preavis')`,
      )
      .get(profil.id) as any).n > 0;

  return {
    profil,
    proprietaires,
    proprietaireActif: actif,
    droits: entree.droits,
    // On n'est bailleur que si l'on possède réellement un bien, ou si l'on a un mandat.
    // Sans cela, un locataire pur verrait un lien « Mes biens » menant à un écran vide.
    estProprietaire: aDesBiens.n > 0 || mandats.length > 0,
    estLocataire,
  };
}

export function aLeDroit(ctx: Contexte, droit: Droit): boolean {
  return ctx.droits.includes(droit);
}

// -------------------------------------------------------------- invitations

export function creerInvitation(opts: {
  proprietaireId: string;
  telephone: string;
  role: "locataire" | "mandataire";
  cibleId: string;
}): string {
  const base = db();
  const jeton = crypto.randomBytes(24).toString("base64url");
  const hash = crypto.createHash("sha256").update(jeton).digest("hex");
  const expire = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  base
    .prepare(
      `INSERT INTO invitations (id, proprietaire_id, telephone, role, cible_id, jeton_hash, expire_le, cree_le)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      nouvelId(),
      opts.proprietaireId,
      opts.telephone,
      opts.role,
      opts.cibleId,
      hash,
      expire,
      maintenant(),
    );
  return jeton;
}

export function invitationParJeton(jeton: string): any | null {
  const hash = crypto.createHash("sha256").update(jeton).digest("hex");
  const inv = db()
    .prepare(
      `SELECT * FROM invitations WHERE jeton_hash = ? AND utilise_le IS NULL AND expire_le > ?`,
    )
    .get(hash, maintenant());
  return inv ?? null;
}
