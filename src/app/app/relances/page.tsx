import { Coquille } from "@/components/coquille";
import { Avertissement, Bloc, Succes, Vide } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { envoisPrets } from "@/lib/relances";
import { dateLongue, fcfa } from "@/lib/format";
import { lienWhatsApp } from "@/lib/lien";
import { MESSAGES_DEFAUT } from "@/lib/pdf/modeles-defaut";
import {
  actionEnregistrerModeleMessage,
  actionMarquerRelanceEnvoyee,
} from "@/lib/actions/relances";

const NATURES: Record<string, string> = {
  avis_echeance: "Avis d'échéance",
  rappel: "Rappel avant échéance",
  relance: "Relance de retard",
  mise_en_demeure: "Mise en demeure",
  fin_bail: "Fin de bail proche",
};

export default async function Relances({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; langue?: string }>;
}) {
  const ctx = await exigerContexte();
  const { ok, langue } = await searchParams;
  const lang = langue === "en" ? "en" : "fr";

  const prets = envoisPrets(ctx.proprietaireActif, lang);
  const historique = db()
    .prepare(
      `SELECT r.*, l.nom AS locataire_nom FROM relances r
       JOIN baux b ON b.id = r.bail_id JOIN locataires l ON l.id = b.locataire_id
       WHERE r.proprietaire_id = ? ORDER BY r.date_envoi DESC, r.cree_le DESC LIMIT 40`,
    )
    .all(ctx.proprietaireActif) as any[];

  const modeles = db()
    .prepare(`SELECT * FROM modeles_message WHERE proprietaire_id = ? ORDER BY code, langue`)
    .all(ctx.proprietaireActif) as any[];

  const codes = ["rappel", "relance", "mise_en_demeure", "fin_bail"];

  return (
    <Coquille
      ctx={ctx}
      actif="/app/plus"
      titre="Relances"
      retour={{ href: "/app/plus", libelle: "Plus" }}
    >
      <div className="space-y-5">
        {ok && <Succes>Enregistré.</Succes>}

        <Avertissement>
          laloc prépare les messages, <strong>vous décidez de les envoyer</strong>. Rien ne part
          tout seul. Le bouton ouvre WhatsApp avec le texte déjà écrit : c'est gratuit, vous
          relisez et vous appuyez sur envoyer.
        </Avertissement>

        <Bloc
          titre="Envois prêts"
          action={
            <div className="flex gap-1">
              <a
                href="/app/relances?langue=fr"
                className={lang === "fr" ? "jeton-terre" : "jeton-neutre"}
              >
                FR
              </a>
              <a
                href="/app/relances?langue=en"
                className={lang === "en" ? "jeton-terre" : "jeton-neutre"}
              >
                EN
              </a>
            </div>
          }
        >
          {prets.length === 0 ? (
            <Vide
              titre="Rien à envoyer aujourd'hui"
              texte="Aucun rappel, aucune relance et aucune fin de bail proche. laloc vous préviendra le moment venu."
            />
          ) : (
            <div className="space-y-3">
              {prets.map((x, i) => (
                <div
                  key={i}
                  className={`carte p-4 ${x.urgence === "haute" ? "border-brique/40 bg-brique-pale" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">{x.locataire}</div>
                      <div className="text-sm text-encre-doux truncate">{x.logement}</div>
                      <div className="text-sm text-encre-doux">{x.detail}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={x.urgence === "haute" ? "jeton-rouge" : "jeton-ocre"}>
                        {NATURES[x.nature]}
                      </span>
                      {x.montant > 0 && (
                        <div className="font-semibold tabular-nums mt-1">{fcfa(x.montant)}</div>
                      )}
                    </div>
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-encre-doux">
                      Lire le message
                    </summary>
                    <pre className="mt-2 carte-douce p-3 text-[13px] whitespace-pre-wrap font-sans">
                      {x.message}
                    </pre>
                  </details>

                  <form action={actionMarquerRelanceEnvoyee} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="bail_id" value={x.bail_id} />
                    <input type="hidden" name="echeance_id" value={x.echeance_id ?? ""} />
                    <input type="hidden" name="nature" value={x.nature} />
                    <input type="hidden" name="canal" value="whatsapp" />
                    <input type="hidden" name="message" value={x.message} />
                    <a
                      href={lienWhatsApp(x.telephone, x.message)}
                      target="_blank"
                      rel="noreferrer"
                      className="bouton-whatsapp py-2 px-3 text-sm"
                    >
                      Ouvrir WhatsApp
                    </a>
                    <button type="submit" className="bouton-second py-2 px-3 text-sm">
                      Je l'ai envoyé
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </Bloc>

        <Bloc titre="Journal des relances envoyées">
          {historique.length === 0 ? (
            <p className="sous-titre text-sm">
              Rien encore. Ce journal sert de preuve : il conserve la date, le canal et le texte
              exact de chaque relance envoyée.
            </p>
          ) : (
            <div className="space-y-2">
              {historique.map((h) => (
                <details key={h.id} className="py-2 border-b border-sable-200 last:border-0">
                  <summary className="cursor-pointer flex items-center justify-between gap-3">
                    <span>
                      <span className="font-semibold text-[15px]">{h.locataire_nom}</span>
                      <span className="block text-sm text-encre-doux">
                        {NATURES[h.nature] ?? h.nature} · {dateLongue(h.date_envoi ?? h.date_preparation)}
                      </span>
                    </span>
                    <span className="jeton-vert shrink-0">{h.canal}</span>
                  </summary>
                  <pre className="mt-2 carte-douce p-3 text-[13px] whitespace-pre-wrap font-sans">
                    {h.message}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </Bloc>

        <Bloc titre="Mes modèles de messages">
          <p className="sous-titre text-sm mb-4" id="modeles">
            Personnalisez le texte de chaque type de message, en français et en anglais. Les
            variables entre accolades sont remplacées automatiquement.
          </p>
          <div className="space-y-4">
            {codes.map((code) =>
              (["fr", "en"] as const).map((l) => {
                const m =
                  modeles.find((x) => x.code === code && x.langue === l) ??
                  MESSAGES_DEFAUT.find((x) => x.code === code && x.langue === l) ??
                  MESSAGES_DEFAUT.find((x) => x.code === code);
                if (!m) return null;
                return (
                  <details key={`${code}-${l}`} className="carte-douce p-3">
                    <summary className="cursor-pointer font-semibold text-[15px]">
                      {NATURES[code]} · {l === "fr" ? "Français" : "English"}
                    </summary>
                    <form action={actionEnregistrerModeleMessage} className="mt-3 space-y-3">
                      <input type="hidden" name="code" value={code} />
                      <input type="hidden" name="langue" value={l} />
                      <input name="objet" className="champ" defaultValue={m.objet ?? ""} />
                      <textarea name="corps" rows={7} className="champ text-[14px]" defaultValue={m.corps} />
                      <p className="aide">
                        Variables : {"{{locataire}}"} {"{{logement}}"} {"{{montant}}"}{" "}
                        {"{{periode}}"} {"{{date_echeance}}"} {"{{jours}}"} {"{{bailleur}}"}
                      </p>
                      <button type="submit" className="bouton-second py-2 px-3 text-sm">
                        Enregistrer ce modèle
                      </button>
                    </form>
                  </details>
                );
              }),
            )}
          </div>
        </Bloc>
      </div>
    </Coquille>
  );
}
