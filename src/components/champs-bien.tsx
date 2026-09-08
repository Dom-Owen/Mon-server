import { LISTE_VILLES, MODES_CHARGES, TYPES_BIEN, VILLES } from "@/lib/cameroun";

export function ChampsAdresse({ bien }: { bien?: any }) {
  const tousQuartiers = Object.entries(VILLES).flatMap(([ville, qs]) =>
    qs.map((q) => ({ ville, q })),
  );
  return (
    <>
      <div>
        <label className="etiquette" htmlFor="ville">
          Ville
        </label>
        <select id="ville" name="ville" className="champ" defaultValue={bien?.ville ?? "Douala"}>
          {LISTE_VILLES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
          {bien?.ville && !LISTE_VILLES.includes(bien.ville) && (
            <option value={bien.ville}>{bien.ville}</option>
          )}
          <option value="">Autre ville…</option>
        </select>
        <input
          name="ville_libre"
          className="champ mt-2"
          placeholder="Si « Autre ville », écrivez-la ici"
        />
      </div>

      <div>
        <label className="etiquette" htmlFor="quartier">
          Quartier
        </label>
        <input
          id="quartier"
          name="quartier"
          list="liste-quartiers"
          className="champ"
          defaultValue={bien?.quartier ?? ""}
          placeholder="Makepe, Bastos, Molyko…"
        />
        <datalist id="liste-quartiers">
          {tousQuartiers.map(({ ville, q }) => (
            <option key={`${ville}-${q}`} value={q}>
              {ville}
            </option>
          ))}
        </datalist>
      </div>

      <div>
        <label className="etiquette" htmlFor="point_repere">
          Point de repère
        </label>
        <input
          id="point_repere"
          name="point_repere"
          className="champ"
          defaultValue={bien?.point_repere ?? ""}
          placeholder="Descente Total Mvog-Ada, derrière l'école publique…"
        />
        <p className="aide">
          C'est ce que vous diriez à quelqu'un au téléphone pour qu'il trouve la maison.
        </p>
      </div>

      <div>
        <label className="etiquette" htmlFor="lieu_dit">
          Lieu-dit <span className="font-normal text-encre-pale">(facultatif)</span>
        </label>
        <input id="lieu_dit" name="lieu_dit" className="champ" defaultValue={bien?.lieu_dit ?? ""} />
      </div>

      <div>
        <label className="etiquette" htmlFor="precisions_acces">
          Précisions d'accès <span className="font-normal text-encre-pale">(facultatif)</span>
        </label>
        <textarea
          id="precisions_acces"
          name="precisions_acces"
          rows={2}
          className="champ"
          defaultValue={bien?.precisions_acces ?? ""}
          placeholder="Portail vert, deuxième cour à droite…"
        />
      </div>
    </>
  );
}

export function ChampsCharges({ bien }: { bien?: any }) {
  return (
    <fieldset className="space-y-3">
      <legend className="etiquette">Comment sont gérées les charges ?</legend>
      {MODES_CHARGES.map((m) => (
        <label
          key={m.code}
          className="flex items-start gap-3 carte-douce p-3.5 cursor-pointer has-[:checked]:border-terre has-[:checked]:bg-terre-pale"
        >
          <input
            type="radio"
            name="mode_charges"
            value={m.code}
            defaultChecked={(bien?.mode_charges ?? "incluses") === m.code}
            className="mt-1 size-5 accent-[#B0662F] shrink-0"
          />
          <span>
            <span className="font-semibold block">{m.libelle}</span>
            <span className="text-sm text-encre-doux">{m.explication}</span>
          </span>
        </label>
      ))}
      <div>
        <label className="etiquette" htmlFor="charges_forfait">
          Si forfait : montant mensuel des charges
        </label>
        <div className="flex items-center gap-2">
          <input
            id="charges_forfait"
            name="charges_forfait"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            className="champ"
            defaultValue={bien?.charges_forfait ?? 0}
          />
          <span className="font-semibold text-encre-doux shrink-0">FCFA</span>
        </div>
      </div>
    </fieldset>
  );
}

export function ChampsType({ bien }: { bien?: any }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <label className="etiquette" htmlFor="type">
          Type de bien
        </label>
        <select id="type" name="type" className="champ" defaultValue={bien?.type ?? "maison"}>
          {TYPES_BIEN.map((t) => (
            <option key={t.code} value={t.code}>
              {t.libelle}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="etiquette" htmlFor="usage">
          Usage
        </label>
        <select id="usage" name="usage" className="champ" defaultValue={bien?.usage ?? "habitation"}>
          <option value="habitation">Habitation</option>
          <option value="commercial">Commercial</option>
        </select>
      </div>
    </div>
  );
}
