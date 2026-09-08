"use client";

import { useMemo, useState } from "react";
import { BoutonEnvoi } from "./bouton-envoi";
import { MODES_PAIEMENT } from "@/lib/format";

type BailOption = {
  id: string;
  libelle: string;
  du: number;
  loyer: number;
};

/**
 * Enregistrer un paiement en trois gestes : le locataire, le montant, le moyen.
 * La clé d'idempotence est générée ici, dans le navigateur, avant l'envoi.
 */
export function FormulairePaiement({
  action,
  baux,
  bailPreselectionne,
  aujourdhui,
}: {
  action: (formData: FormData) => void;
  baux: BailOption[];
  bailPreselectionne?: string;
  aujourdhui: string;
}) {
  const [bailId, setBailId] = useState(bailPreselectionne ?? baux[0]?.id ?? "");
  const [montant, setMontant] = useState<string>("");
  const cle = useMemo(() => crypto.randomUUID(), []);

  const bail = baux.find((b) => b.id === bailId);
  const propositions = bail
    ? Array.from(new Set([bail.du, bail.loyer, bail.loyer * 3, bail.loyer * 6].filter((v) => v > 0)))
    : [];

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="cle_idempotence" value={cle} />

      <section className="carte p-5">
        <h2 className="text-lg font-bold mb-4">1. Qui a payé ?</h2>
        <select
          name="bail_id"
          className="champ"
          value={bailId}
          onChange={(ev) => setBailId(ev.target.value)}
          required
        >
          {baux.map((b) => (
            <option key={b.id} value={b.id}>
              {b.libelle}
            </option>
          ))}
        </select>
        {bail && bail.du > 0 && (
          <p className="aide">
            Ce locataire doit actuellement{" "}
            <strong className="text-brique">{bail.du.toLocaleString("fr-FR")} FCFA</strong>.
          </p>
        )}
        {bail && bail.du === 0 && (
          <p className="aide">Ce locataire est à jour. Ce sera une avance sur les mois suivants.</p>
        )}
      </section>

      <section className="carte p-5">
        <h2 className="text-lg font-bold mb-4">2. Combien ?</h2>
        <div className="flex items-center gap-2">
          <input
            name="montant"
            type="number"
            inputMode="numeric"
            step={1}
            min={1}
            className="champ text-2xl font-bold py-4"
            placeholder="0"
            value={montant}
            onChange={(ev) => setMontant(ev.target.value)}
            required
            autoFocus
          />
          <span className="font-bold text-encre-doux shrink-0 text-lg">FCFA</span>
        </div>

        {propositions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {propositions.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setMontant(String(v))}
                className="bouton-doux py-2 px-3 text-sm"
              >
                {v.toLocaleString("fr-FR")} FCFA
              </button>
            ))}
          </div>
        )}
        <p className="aide">
          Un montant plus élevé que ce qui est dû ? laloc le répartit sur les mois suivants.
        </p>
      </section>

      <section className="carte p-5">
        <h2 className="text-lg font-bold mb-4">3. Comment ?</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {Object.entries(MODES_PAIEMENT).map(([code, libelle], i) => (
            <label
              key={code}
              className="flex items-start gap-2.5 carte-douce p-3 cursor-pointer has-[:checked]:border-terre has-[:checked]:bg-terre-pale"
            >
              <input
                type="radio"
                name="mode"
                value={code}
                defaultChecked={i === 0}
                className="size-5 accent-[#B0662F] shrink-0 mt-0.5"
              />
              <span className="font-semibold text-sm leading-snug">{libelle}</span>
            </label>
          ))}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer font-semibold text-sm text-encre-doux">
            Ajouter une date, une référence ou une note
          </summary>
          <div className="mt-3 space-y-4">
            <div>
              <label className="etiquette" htmlFor="date_encaissement">
                Date de l'encaissement
              </label>
              <input
                id="date_encaissement"
                name="date_encaissement"
                type="date"
                className="champ"
                defaultValue={aujourdhui}
              />
            </div>
            <div>
              <label className="etiquette" htmlFor="reference">
                Référence de la transaction
              </label>
              <input
                id="reference"
                name="reference"
                className="champ"
                placeholder="Numéro MTN MoMo ou Orange Money"
              />
            </div>
            <div>
              <label className="etiquette" htmlFor="commentaire">
                Note
              </label>
              <input id="commentaire" name="commentaire" className="champ" />
            </div>
          </div>
        </details>
      </section>

      <BoutonEnvoi>Enregistrer le paiement</BoutonEnvoi>
    </form>
  );
}
