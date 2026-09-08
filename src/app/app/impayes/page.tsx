import Link from "next/link";
import { Coquille } from "@/components/coquille";
import { Bloc, Ligne, Montant, Vide } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { impayes, nomLogement } from "@/lib/requetes";
import { dateLongue, fcfa } from "@/lib/format";
import { lienWhatsApp } from "@/lib/lien";

export default async function Impayes() {
  const ctx = await exigerContexte();
  const liste = impayes(ctx.proprietaireActif);
  const total = liste.reduce((s, i) => s + i.du, 0);

  return (
    <Coquille
      ctx={ctx}
      actif="/app/paiements"
      titre="Impayés"
      retour={{ href: "/app/paiements", libelle: "Les paiements" }}
    >
      {liste.length === 0 ? (
        <Vide
          titre="Tout le monde est à jour"
          texte="Aucun de vos locataires ne vous doit d'argent aujourd'hui. C'est le meilleur écran de l'application."
        />
      ) : (
        <div className="space-y-5">
          <div className="carte p-5 bg-brique-pale border-brique/30">
            <div className="text-sm font-semibold text-encre-doux uppercase tracking-wide">
              Total dû
            </div>
            <div className="text-3xl font-bold text-brique tabular-nums mt-1">{fcfa(total)}</div>
            <div className="text-sm text-encre-doux">
              réparti sur {liste.length} locataire{liste.length > 1 ? "s" : ""}
            </div>
          </div>

          <Bloc titre="Du plus ancien au plus récent">
            <div className="space-y-2.5">
              {liste.map((i) => (
                <div key={i.bail.id} className="carte p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/app/baux/${i.bail.id}`} className="font-semibold hover:underline">
                        {i.bail.locataire_nom}
                      </Link>
                      <div className="text-sm text-encre-doux truncate">{nomLogement(i.bail)}</div>
                      {i.depuis && (
                        <div className="text-sm text-encre-doux mt-0.5">
                          Impayé depuis le {dateLongue(i.depuis)}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <Montant valeur={i.du} ton="negatif" />
                      <div className="text-xs text-encre-doux mt-0.5">
                        {i.jours > 0 ? `${i.jours} jour(s)` : "Échue ce jour"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={lienWhatsApp(
                        i.bail.locataire_whatsapp || i.bail.locataire_telephone,
                        `Bonjour ${i.bail.locataire_nom},\n\nSauf erreur de ma part, votre loyer pour ${nomLogement(i.bail)} présente un solde de ${fcfa(i.du)}.\n\nMerci de régulariser dès que possible.\n\nBien à vous.`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="bouton-whatsapp py-2 px-3 text-sm"
                    >
                      Relancer sur WhatsApp
                    </a>
                    <Link
                      href={`/app/paiements/nouveau?bail=${i.bail.id}`}
                      className="bouton-second py-2 px-3 text-sm"
                    >
                      Il a payé
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Bloc>
        </div>
      )}
    </Coquille>
  );
}
