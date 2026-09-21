import PDFDocument from "pdfkit";

/**
 * Fabrication des PDF.
 *
 * Un seul moteur de rendu pour les quatorze documents : ils partagent l'en-tête du
 * bailleur, la numérotation, la mise en page et la mention juridique. Ajouter un
 * quinzième document ne demandera que de décrire son contenu, pas de refaire une page.
 *
 * On n'utilise pas de navigateur sans écran pour produire les PDF : c'est lourd, lent
 * et cher à héberger. pdfkit écrit le document directement.
 */

const ENCRE = "#2E2721";
const DOUX = "#6B5D4F";
const TERRE = "#B0662F";
const SABLE = "#F2EADC";
const PALE = "#9C8E7E";

export type Partie = {
  nom: string;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  contribuable?: string | null;
};

export type Bloc =
  | { genre: "paragraphe"; texte: string }
  | { genre: "champs"; titre?: string; lignes: [string, string][] }
  | {
      genre: "tableau";
      titre?: string;
      entetes: string[];
      lignes: string[][];
      total?: [string, string];
    }
  | { genre: "articles"; articles: { titre: string; texte: string }[] }
  | { genre: "encadre"; texte: string }
  | { genre: "espace"; hauteur?: number }
  | { genre: "signatures"; gauche: string; droite: string };

export type SpecDocument = {
  numero: string;
  titre: string;
  sousTitre?: string;
  bailleur: Partie;
  destinataire?: Partie;
  blocs: Bloc[];
  mentionLegale?: string | null;
  lieu?: string | null;
  date: string;
  journalSignature?: string[];
};

const MARGE = 50;

export function rendrePdf(spec: SpecDocument): Promise<Buffer> {
  return new Promise((resoudre, rejeter) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGE, bufferPages: true });
    const morceaux: Buffer[] = [];
    doc.on("data", (c: Buffer) => morceaux.push(c));
    doc.on("end", () => resoudre(Buffer.concat(morceaux)));
    doc.on("error", rejeter);

    const largeur = doc.page.width - MARGE * 2;

    // ------------------------------------------------------------- en-tête
    doc.fillColor(TERRE).fontSize(20).font("Helvetica-Bold").text("laloc", MARGE, MARGE);
    doc
      .fillColor(ENCRE)
      .fontSize(13)
      .font("Helvetica-Bold")
      .text(spec.bailleur.nom, MARGE, MARGE + 26, { width: largeur * 0.6 });

    const coordonnees = [
      spec.bailleur.adresse,
      spec.bailleur.telephone,
      spec.bailleur.email,
      spec.bailleur.contribuable ? `Contribuable : ${spec.bailleur.contribuable}` : null,
    ].filter(Boolean) as string[];
    doc.fillColor(DOUX).fontSize(9).font("Helvetica");
    for (const l of coordonnees) doc.text(l, MARGE, doc.y, { width: largeur * 0.6 });

    // Numéro, à droite
    doc
      .fillColor(DOUX)
      .fontSize(9)
      .font("Helvetica")
      .text("Document n°", MARGE + largeur * 0.6, MARGE + 4, {
        width: largeur * 0.4,
        align: "right",
      });
    doc
      .fillColor(ENCRE)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(spec.numero, MARGE + largeur * 0.6, MARGE + 16, {
        width: largeur * 0.4,
        align: "right",
      });

    doc.moveDown(1.2);
    trait(doc, largeur);

    // -------------------------------------------------------------- titre
    doc.moveDown(0.8);
    doc
      .fillColor(ENCRE)
      .fontSize(17)
      .font("Helvetica-Bold")
      .text(spec.titre.toUpperCase(), { width: largeur, align: "center" });
    if (spec.sousTitre) {
      doc
        .fillColor(DOUX)
        .fontSize(10)
        .font("Helvetica")
        .text(spec.sousTitre, { width: largeur, align: "center" });
    }
    doc.moveDown(1);

    // ------------------------------------------------------- destinataire
    if (spec.destinataire) {
      const y = doc.y;
      doc.rect(MARGE, y, largeur, 2).fill(SABLE);
      doc.y = y + 12;
      doc.fillColor(PALE).fontSize(8).font("Helvetica-Bold").text("CONCERNE");
      doc.fillColor(ENCRE).fontSize(11).font("Helvetica-Bold").text(spec.destinataire.nom);
      const d = [spec.destinataire.telephone, spec.destinataire.adresse].filter(Boolean) as string[];
      doc.fillColor(DOUX).fontSize(9).font("Helvetica");
      for (const l of d) doc.text(l);
      doc.moveDown(0.8);
    }

    // -------------------------------------------------------------- blocs
    for (const bloc of spec.blocs) {
      sautSiNecessaire(doc, 80);
      switch (bloc.genre) {
        case "paragraphe":
          doc
            .fillColor(ENCRE)
            .fontSize(10.5)
            .font("Helvetica")
            .text(bloc.texte, { width: largeur, align: "justify", lineGap: 2 });
          doc.moveDown(0.7);
          break;

        case "champs": {
          if (bloc.titre) sousTitre(doc, bloc.titre);
          for (const [cle, valeur] of bloc.lignes) {
            sautSiNecessaire(doc, 24);
            const y = doc.y;
            doc.fillColor(DOUX).fontSize(10).font("Helvetica").text(cle, MARGE, y, {
              width: largeur * 0.42,
            });
            doc
              .fillColor(ENCRE)
              .fontSize(10)
              .font("Helvetica-Bold")
              .text(valeur, MARGE + largeur * 0.44, y, { width: largeur * 0.56 });
            doc.y = Math.max(doc.y, y + 15);
          }
          doc.moveDown(0.6);
          break;
        }

        case "tableau": {
          if (bloc.titre) sousTitre(doc, bloc.titre);
          const nbCol = bloc.entetes.length;
          const colLarge = largeur / nbCol;
          let y = doc.y;

          doc.rect(MARGE, y, largeur, 22).fill(SABLE);
          doc.fillColor(ENCRE).fontSize(9).font("Helvetica-Bold");
          bloc.entetes.forEach((e, i) => {
            doc.text(e, MARGE + 8 + i * colLarge, y + 7, {
              width: colLarge - 16,
              align: i === 0 ? "left" : "right",
            });
          });
          y += 22;

          doc.font("Helvetica").fontSize(9.5);
          for (const ligne of bloc.lignes) {
            if (y > doc.page.height - 120) {
              doc.addPage();
              y = MARGE;
            }
            doc.fillColor(ENCRE);
            ligne.forEach((c, i) => {
              doc.text(c, MARGE + 8 + i * colLarge, y + 6, {
                width: colLarge - 16,
                align: i === 0 ? "left" : "right",
              });
            });
            y += 20;
            doc.strokeColor(SABLE).lineWidth(0.5).moveTo(MARGE, y).lineTo(MARGE + largeur, y).stroke();
          }

          if (bloc.total) {
            doc.rect(MARGE, y, largeur, 26).fill(SABLE);
            doc.fillColor(ENCRE).fontSize(11).font("Helvetica-Bold");
            doc.text(bloc.total[0], MARGE + 8, y + 8, { width: largeur * 0.5 });
            doc.text(bloc.total[1], MARGE + largeur * 0.5, y + 8, {
              width: largeur * 0.5 - 8,
              align: "right",
            });
            y += 26;
          }
          doc.y = y + 12;
          break;
        }

        case "articles":
          for (const a of bloc.articles) {
            sautSiNecessaire(doc, 70);
            doc.fillColor(TERRE).fontSize(10.5).font("Helvetica-Bold").text(a.titre, { width: largeur });
            doc
              .fillColor(ENCRE)
              .fontSize(10)
              .font("Helvetica")
              .text(a.texte, { width: largeur, align: "justify", lineGap: 1.5 });
            doc.moveDown(0.6);
          }
          break;

        case "encadre": {
          const hauteur = doc.heightOfString(bloc.texte, { width: largeur - 24 }) + 20;
          sautSiNecessaire(doc, hauteur + 20);
          const y = doc.y;
          doc.rect(MARGE, y, largeur, hauteur).fillAndStroke(SABLE, SABLE);
          doc
            .fillColor(ENCRE)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(bloc.texte, MARGE + 12, y + 10, { width: largeur - 24 });
          doc.y = y + hauteur + 12;
          break;
        }

        case "espace":
          doc.moveDown((bloc.hauteur ?? 1) as number);
          break;

        case "signatures": {
          sautSiNecessaire(doc, 120);
          doc.moveDown(1);
          const y = doc.y;
          const demi = largeur / 2 - 10;
          doc.fillColor(DOUX).fontSize(9).font("Helvetica-Bold");
          doc.text(bloc.gauche, MARGE, y, { width: demi });
          doc.text(bloc.droite, MARGE + demi + 20, y, { width: demi });
          doc
            .strokeColor(PALE)
            .lineWidth(0.7)
            .moveTo(MARGE, y + 62)
            .lineTo(MARGE + demi, y + 62)
            .stroke();
          doc
            .moveTo(MARGE + demi + 20, y + 62)
            .lineTo(MARGE + demi * 2 + 20, y + 62)
            .stroke();
          doc.y = y + 74;
          break;
        }
      }
    }

    // ------------------------------------------------- lieu, date, mention
    doc.moveDown(0.5);
    doc
      .fillColor(ENCRE)
      .fontSize(10)
      .font("Helvetica")
      .text(`${spec.lieu ? spec.lieu + ", le " : "Le "}${spec.date}`, {
        width: largeur,
        align: "right",
      });

    // ------------------------------------------- journal de signature
    if (spec.journalSignature && spec.journalSignature.length > 0) {
      doc.addPage();
      doc.fillColor(ENCRE).fontSize(14).font("Helvetica-Bold").text("Journal de signature");
      doc
        .fillColor(DOUX)
        .fontSize(9.5)
        .font("Helvetica")
        .text(
          "Éléments conservés pour établir l'origine et l'intégrité du document signé.",
          { width: largeur },
        );
      doc.moveDown(0.8);
      for (const ligne of spec.journalSignature) {
        doc.fillColor(ENCRE).fontSize(9.5).font("Helvetica").text("• " + ligne, { width: largeur });
        doc.moveDown(0.2);
      }
    }

    // ------------------------------------------------------- pied de page
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      const bas = doc.page.height - 42;
      doc.strokeColor(SABLE).lineWidth(0.7).moveTo(MARGE, bas - 10).lineTo(MARGE + largeur, bas - 10).stroke();
      if (spec.mentionLegale) {
        doc
          .fillColor(PALE)
          .fontSize(7.5)
          .font("Helvetica-Oblique")
          .text(spec.mentionLegale, MARGE, bas - 4, { width: largeur * 0.72 });
      }
      doc
        .fillColor(PALE)
        .fontSize(7.5)
        .font("Helvetica")
        .text(`${spec.numero} — page ${i + 1} sur ${pages.count}`, MARGE + largeur * 0.72, bas - 4, {
          width: largeur * 0.28,
          align: "right",
        });
    }

    doc.end();
  });
}

function trait(doc: PDFKit.PDFDocument, largeur: number) {
  doc.strokeColor(SABLE).lineWidth(1).moveTo(MARGE, doc.y).lineTo(MARGE + largeur, doc.y).stroke();
}

function sousTitre(doc: PDFKit.PDFDocument, texte: string) {
  doc.fillColor(TERRE).fontSize(9).font("Helvetica-Bold").text(texte.toUpperCase());
  doc.moveDown(0.35);
}

function sautSiNecessaire(doc: PDFKit.PDFDocument, hauteur: number) {
  if (doc.y + hauteur > doc.page.height - 70) doc.addPage();
}
