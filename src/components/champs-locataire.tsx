import { ChampTelephone } from "./champ-telephone";
import { Televerseur } from "./televerseur";
import { TYPES_PIECE } from "@/lib/cameroun";

export function ChampsLocataire({ loc }: { loc?: any }) {
  return (
    <>
      <div className="space-y-4">
        <div>
          <label className="etiquette" htmlFor="type">
            Le locataire est
          </label>
          <select id="type" name="type" className="champ" defaultValue={loc?.type ?? "particulier"}>
            <option value="particulier">Un particulier</option>
            <option value="entreprise">Une entreprise</option>
          </select>
          <p className="aide">Pour une boutique ou un bureau, choisissez « une entreprise ».</p>
        </div>

        <div>
          <label className="etiquette" htmlFor="nom">
            Nom complet
          </label>
          <input id="nom" name="nom" className="champ" defaultValue={loc?.nom ?? ""} required />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="etiquette" htmlFor="raison_sociale">
              Raison sociale <span className="font-normal text-encre-pale">(si entreprise)</span>
            </label>
            <input
              id="raison_sociale"
              name="raison_sociale"
              className="champ"
              defaultValue={loc?.raison_sociale ?? ""}
            />
          </div>
          <div>
            <label className="etiquette" htmlFor="rccm">
              Numéro RCCM <span className="font-normal text-encre-pale">(si entreprise)</span>
            </label>
            <input id="rccm" name="rccm" className="champ" defaultValue={loc?.rccm ?? ""} />
          </div>
        </div>

        <ChampTelephone defaut={loc?.telephone?.replace("+237", "") ?? ""} />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="etiquette" htmlFor="whatsapp">
              Numéro WhatsApp{" "}
              <span className="font-normal text-encre-pale">(si différent)</span>
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              className="champ"
              defaultValue={loc?.whatsapp ?? ""}
              placeholder="Même numéro par défaut"
            />
          </div>
          <div>
            <label className="etiquette" htmlFor="email">
              Email <span className="font-normal text-encre-pale">(facultatif)</span>
            </label>
            <input id="email" name="email" type="email" className="champ" defaultValue={loc?.email ?? ""} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="etiquette" htmlFor="profession">
              Profession
            </label>
            <input id="profession" name="profession" className="champ" defaultValue={loc?.profession ?? ""} />
          </div>
          <div>
            <label className="etiquette" htmlFor="employeur">
              Employeur
            </label>
            <input id="employeur" name="employeur" className="champ" defaultValue={loc?.employeur ?? ""} />
          </div>
        </div>
      </div>
    </>
  );
}

export function ChampsPiece({ loc }: { loc?: any }) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="etiquette" htmlFor="type_piece">
            Type de pièce
          </label>
          <select
            id="type_piece"
            name="type_piece"
            className="champ"
            defaultValue={loc?.type_piece ?? TYPES_PIECE[0]}
          >
            {TYPES_PIECE.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiquette" htmlFor="numero_piece">
            Numéro de la pièce
          </label>
          <input
            id="numero_piece"
            name="numero_piece"
            className="champ"
            defaultValue={loc?.numero_piece ?? ""}
          />
        </div>
      </div>
      <Televerseur
        nom="scan_piece"
        etiquette="Photo de la pièce d'identité"
        valeurInitiale={loc?.scan_piece ?? ""}
        aide="Rangée dans un espace privé. Seuls vous et le locataire pouvez l'ouvrir."
      />
    </div>
  );
}

export function ChampsGarant({ loc }: { loc?: any }) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="etiquette" htmlFor="garant_nom">
            Nom du garant
          </label>
          <input id="garant_nom" name="garant_nom" className="champ" defaultValue={loc?.garant_nom ?? ""} />
        </div>
        <div>
          <label className="etiquette" htmlFor="garant_telephone">
            Téléphone du garant
          </label>
          <input
            id="garant_telephone"
            name="garant_telephone"
            type="tel"
            className="champ"
            defaultValue={loc?.garant_telephone ?? ""}
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="etiquette" htmlFor="garant_piece">
            Pièce du garant
          </label>
          <input id="garant_piece" name="garant_piece" className="champ" defaultValue={loc?.garant_piece ?? ""} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="etiquette" htmlFor="urgence_nom">
            Personne à prévenir en cas d'urgence
          </label>
          <input id="urgence_nom" name="urgence_nom" className="champ" defaultValue={loc?.urgence_nom ?? ""} />
        </div>
        <div>
          <label className="etiquette" htmlFor="urgence_telephone">
            Son téléphone
          </label>
          <input
            id="urgence_telephone"
            name="urgence_telephone"
            type="tel"
            className="champ"
            defaultValue={loc?.urgence_telephone ?? ""}
          />
        </div>
      </div>
      <div>
        <label className="etiquette" htmlFor="notes">
          Notes libres
        </label>
        <textarea id="notes" name="notes" rows={3} className="champ" defaultValue={loc?.notes ?? ""} />
      </div>
    </div>
  );
}
