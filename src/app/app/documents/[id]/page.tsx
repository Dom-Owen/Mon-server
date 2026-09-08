import Link from "next/link";
import { notFound } from "next/navigation";
import { Coquille } from "@/components/coquille";
import { Avertissement, Bloc, Statut } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { dateLongue, fcfa, horodatageDouala } from "@/lib/format";
import { titreDocument } from "@/lib/pdf/documents";
import { signatureDocument } from "@/lib/documents";
import { lienAbsolu, lienWhatsApp } from "@/lib/lien";
import { actionAnnulerDocument } from "@/lib/actions/documents";

export default async function FicheDocument({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigerContexte();
  const { id } = await params;

  const doc = db().prepare(`SELECT * FROM documents_emis WHERE id = ?`).get(id) as any;
  if (!doc || doc.proprietaire_id !== ctx.proprietaireActif) notFound();

  const donnees = JSON.parse(doc.donnees_json);
  const loc = doc.locataire_id
    ? (db().prepare(`SELECT * FROM locataires WHERE id = ?`).get(doc.locataire_id) as any)
    : null;

  const signature = signatureDocument(id);
  const lienPdf = await lienAbsolu(`/api/document/${id}`);
  const lienPartage = `${lienPdf}?c=${signature}`;

  const estQuittance = doc.type === "quittance";
  const message =
    `Bonjour ${loc?.nom ?? ""},\n\n` +
    (estQuittance
      ? `Voici votre quittance de loyer ${donnees.periode ? `pour ${donnees.periode}` : ""} (n° ${doc.numero}).`
      : `Voici votre document n° ${doc.numero} : ${titreDocument(doc.type)}.`) +
    `\n\n${lienPartage}\n\nBien à vous.`;

  return (
    <Coquille
      ctx={ctx}
      actif="/app/plus"
      titre={titreDocument(doc.type)}
      retour={{ href: "/app/documents", libelle: "Mes documents" }}
    >
      <div className="space-y-5">
        <div className="carte p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-2xl font-bold font-mono">{doc.numero}</div>
              <div className="text-sm text-encre-doux">
                Émis le {dateLongue(doc.emis_le)} · {loc?.nom ?? "—"}
              </div>
            </div>
            <Statut valeur={doc.statut} />
          </div>

          {donnees.montant != null && (
            <div className="mt-4 pt-4 border-t border-sable-300">
              <div className="text-sm text-encre-doux">Montant</div>
              <div className="text-2xl font-bold tabular-nums">{fcfa(donnees.montant)}</div>
              {donnees.periode && (
                <div className="text-sm text-encre-doux">Période : {donnees.periode}</div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={`/api/document/${id}`} target="_blank" rel="noreferrer" className="bouton-principal">
            Ouvrir le PDF
          </a>
          {loc && (
            <a
              href={lienWhatsApp(loc.whatsapp || loc.telephone, message)}
              target="_blank"
              rel="noreferrer"
              className="bouton-whatsapp"
            >
              Envoyer sur WhatsApp
            </a>
          )}
          {loc?.email && (
            <a
              href={`mailto:${loc.email}?subject=${encodeURIComponent(`${titreDocument(doc.type)} ${doc.numero}`)}&body=${encodeURIComponent(message)}`}
              className="bouton-second"
            >
              Envoyer par email
            </a>
          )}
        </div>

        <Bloc titre="Le lien à partager">
          <p className="sous-titre text-sm mb-3">
            WhatsApp ne permet pas de joindre un fichier automatiquement. laloc envoie donc un
            lien vers le document : le locataire l'ouvre et peut l'enregistrer, même sans compte.
          </p>
          <div className="carte-douce p-3 text-[13px] break-all font-mono">{lienPartage}</div>
          <p className="aide">
            Ce lien est signé : impossible à deviner, et il ne donne accès qu'à ce document.
          </p>
        </Bloc>

        <Bloc titre="Preuve d'intégrité">
          <dl className="text-[15px] space-y-2">
            <div>
              <dt className="text-sm text-encre-doux">Empreinte du fichier (SHA-256)</dt>
              <dd className="font-mono text-[12px] break-all">{doc.hash}</dd>
            </div>
            <div>
              <dt className="text-sm text-encre-doux">Émis le</dt>
              <dd className="font-semibold">{horodatageDouala(doc.emis_le)}</dd>
            </div>
          </dl>
          <div className="mt-3">
            <Avertissement>
              Les données du document sont figées au moment de l'émission. Si le loyer change
              plus tard, cette quittance restera exactement telle qu'elle est aujourd'hui.
              L'empreinte permet de prouver que le fichier n'a pas été retouché.
            </Avertissement>
          </div>
        </Bloc>

        {doc.statut === "emis" && (
          <Bloc titre="Annuler ce document">
            <p className="sous-titre text-sm mb-3">
              On n'efface jamais un document déjà remis. On l'annule, il reste visible marqué
              comme tel, et vous en émettez un nouveau. C'est ce que ferait un comptable.
            </p>
            <form action={actionAnnulerDocument} className="flex flex-col sm:flex-row gap-3">
              <input type="hidden" name="id" value={id} />
              <input name="motif" className="champ" placeholder="Motif de l'annulation" />
              <button type="submit" className="bouton-second shrink-0">
                Annuler le document
              </button>
            </form>
          </Bloc>
        )}
      </div>
    </Coquille>
  );
}
