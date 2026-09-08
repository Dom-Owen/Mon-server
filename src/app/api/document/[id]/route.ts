import { db } from "@/lib/db";
import { pdfDuDocument, signatureValide } from "@/lib/documents";
import { profilConnecte, contexteDe } from "@/lib/auth";

/**
 * Sert un document en PDF.
 * On vérifie que la personne a le droit de le voir : le bailleur ou son mandataire,
 * ou le locataire concerné. Personne d'autre.
 */
export async function GET(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const doc = db().prepare(`SELECT * FROM documents_emis WHERE id = ?`).get(id) as any;
  if (!doc) return new Response("Document introuvable", { status: 404 });

  // Lien signé envoyé au locataire par WhatsApp : il ouvre le document sans compte.
  const signature = new URL(requete.url).searchParams.get("c");
  if (signature && signatureValide(id, signature)) {
    const pdfPartage = await pdfDuDocument(id);
    if (!pdfPartage) return new Response("Document introuvable", { status: 404 });
    return new Response(new Uint8Array(pdfPartage), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.numero}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const profil = await profilConnecte();
  if (!profil) return new Response("Non autorisé", { status: 401 });

  const ctx = contexteDe(profil);
  const estBailleurOuMandataire = ctx.proprietaires.some((p) => p.id === doc.proprietaire_id);

  let estLocataireConcerne = false;
  if (doc.bail_id) {
    const lien = db()
      .prepare(
        `SELECT 1 AS ok FROM baux b JOIN locataires l ON l.id = b.locataire_id
         WHERE b.id = ? AND l.profil_id = ?`,
      )
      .get(doc.bail_id, profil.id) as any;
    estLocataireConcerne = !!lien;
  }

  if (!estBailleurOuMandataire && !estLocataireConcerne) {
    return new Response("Non autorisé", { status: 403 });
  }

  const pdf = await pdfDuDocument(id);
  if (!pdf) return new Response("Document introuvable", { status: 404 });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.numero}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
