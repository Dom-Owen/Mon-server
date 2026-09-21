import { Coquille } from "@/components/coquille";
import { Avertissement, Bloc, Succes } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { MODELES_DEFAUT, A_FOURNIR } from "@/lib/pdf/modeles-defaut";
import { actionEnregistrerModele } from "@/lib/actions/documents";

const TYPES = [
  ["bail_habitation", "Contrat de bail à usage d'habitation"],
  ["bail_commercial", "Contrat de bail à usage commercial"],
  ["avenant", "Avenant au contrat de bail"],
  ["attestation", "Attestation de résidence"],
];

export default async function Modeles({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; ok?: string; e?: string }>;
}) {
  const ctx = await exigerContexte();
  const { type, ok } = await searchParams;
  const choisi = type && MODELES_DEFAUT[type] ? type : "bail_habitation";

  const personnalise = db()
    .prepare(
      `SELECT * FROM modeles_document WHERE proprietaire_id = ? AND type = ? AND actif = 1
       ORDER BY version DESC LIMIT 1`,
    )
    .get(ctx.proprietaireActif, choisi) as any;

  const articles: { titre: string; texte: string }[] = personnalise
    ? JSON.parse(personnalise.contenu_json)
    : MODELES_DEFAUT[choisi].articles;

  return (
    <Coquille
      ctx={ctx}
      actif="/app/plus"
      titre="Modèles de documents"
      retour={{ href: "/app/documents", libelle: "Mes documents" }}
    >
      <div className="space-y-5">
        {ok && <Succes>Votre modèle est enregistré. Les documents déjà émis ne changent pas.</Succes>}

        <Avertissement>
          <strong>laloc n'invente aucun texte juridique.</strong> Les clauses marquées
          « clause à fournir » sont des emplacements vides. Faites rédiger ou valider vos
          clauses par un juriste camerounais, collez-les ici, et vos contrats seront complets.
          Tant que ce n'est pas fait, chaque document porte la mention « modèle indicatif ».
        </Avertissement>

        <div className="flex gap-2 flex-wrap">
          {TYPES.map(([code, libelle]) => (
            <a
              key={code}
              href={`/app/documents/modeles?type=${code}`}
              className={choisi === code ? "jeton-terre" : "jeton-neutre"}
            >
              {libelle}
            </a>
          ))}
        </div>

        <Bloc titre={MODELES_DEFAUT[choisi].titre}>
          <p className="sous-titre text-sm mb-4">
            {personnalise
              ? `Votre version ${personnalise.version}. Les documents déjà émis conservent la version avec laquelle ils ont été faits.`
              : "Version par défaut. Modifiez-la et enregistrez pour créer la vôtre."}
          </p>

          <form action={actionEnregistrerModele} className="space-y-4">
            <input type="hidden" name="type" value={choisi} />

            {articles.map((a, i) => {
              const estVariable = /^\{\{\w+\}\}$/.test(a.texte.trim());
              const estAFournir = a.texte.trim() === A_FOURNIR;
              return (
                <div key={i} className="carte-douce p-3">
                  <input
                    name={`titre_${i}`}
                    defaultValue={a.titre}
                    className="champ font-semibold mb-2"
                  />
                  <textarea
                    name={`texte_${i}`}
                    defaultValue={a.texte}
                    rows={estVariable ? 2 : 4}
                    className={`champ text-[14px] ${estAFournir ? "border-ocre bg-ocre-pale" : ""}`}
                  />
                  {estVariable && (
                    <p className="aide">
                      Cet emplacement est rempli automatiquement par laloc avec les données du
                      bail (parties, loyer, durée…). Laissez-le tel quel.
                    </p>
                  )}
                  {estAFournir && (
                    <p className="aide text-ocre font-semibold">
                      Clause vide : à remplacer par votre texte validé.
                    </p>
                  )}
                </div>
              );
            })}

            {[0, 1, 2].map((k) => {
              const i = articles.length + k;
              return (
                <div key={i} className="carte-douce p-3 opacity-70">
                  <input
                    name={`titre_${i}`}
                    placeholder={`Article ${i + 1} — nouveau (facultatif)`}
                    className="champ font-semibold mb-2"
                  />
                  <textarea name={`texte_${i}`} rows={3} className="champ text-[14px]" />
                </div>
              );
            })}

            <button type="submit" className="bouton-principal w-full">
              Enregistrer ma version
            </button>
          </form>
        </Bloc>
      </div>
    </Coquille>
  );
}
