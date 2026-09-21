import { CadrePublic } from "@/components/cadre-public";
import { Erreur } from "@/components/ui";
import { actionActiverAcces } from "@/lib/actions/auth";
import { invitationParJeton } from "@/lib/auth";
import { afficherTelephone } from "@/lib/format";
import { db } from "@/lib/db";

export default async function Activer({
  params,
  searchParams,
}: {
  params: Promise<{ jeton: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { jeton } = await params;
  const { e } = await searchParams;
  const inv = invitationParJeton(jeton);

  if (!inv) {
    return (
      <CadrePublic titre="Ce lien n'est plus valable">
        <p className="text-[15px] text-encre-doux">
          Les liens d'accès expirent au bout de deux semaines, ou après avoir été utilisés
          une fois. Demandez à votre bailleur de vous en renvoyer un par WhatsApp.
        </p>
      </CadrePublic>
    );
  }

  const bailleur = db()
    .prepare(`SELECT nom FROM profils WHERE id = ?`)
    .get(inv.proprietaire_id) as any;
  const locataire =
    inv.role === "locataire" && inv.cible_id
      ? (db().prepare(`SELECT nom FROM locataires WHERE id = ?`).get(inv.cible_id) as any)
      : null;

  return (
    <CadrePublic
      titre={inv.role === "locataire" ? "Accéder à mon logement" : "Accepter le mandat"}
      sousTitre={`${bailleur?.nom ?? "Votre bailleur"} vous donne accès à laloc. Choisissez votre mot de passe : lui ne le connaîtra jamais.`}
    >
      <form action={actionActiverAcces} className="space-y-4">
        {e && <Erreur>{e}</Erreur>}
        <input type="hidden" name="jeton" value={jeton} />

        <div className="carte-douce p-4 text-[15px]">
          <div className="text-encre-doux">Votre numéro</div>
          <div className="font-semibold">{afficherTelephone(inv.telephone)}</div>
        </div>

        <div>
          <label className="etiquette" htmlFor="nom">
            Votre nom
          </label>
          <input
            id="nom"
            name="nom"
            className="champ"
            defaultValue={locataire?.nom ?? ""}
            required
          />
        </div>

        <div>
          <label className="etiquette" htmlFor="mot_de_passe">
            Choisissez un mot de passe
          </label>
          <input
            id="mot_de_passe"
            name="mot_de_passe"
            type="password"
            autoComplete="new-password"
            className="champ"
            minLength={6}
            required
          />
          <p className="aide">Au moins 6 caractères. Retenez-le bien.</p>
        </div>

        <button type="submit" className="bouton-principal w-full">
          Activer mon accès
        </button>
      </form>
    </CadrePublic>
  );
}
