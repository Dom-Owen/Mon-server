import { db } from "@/lib/db";
import { bauxDuProprietaire, nomLogement, parametresDe, echeancesDuBail, situationBail } from "@/lib/requetes";
import { ajouterJours, aujourdhui, dateLongue, fcfa, moisLong } from "@/lib/format";
import { MESSAGES_DEFAUT } from "@/lib/pdf/modeles-defaut";

export type EnvoiPret = {
  bail_id: string;
  echeance_id: string | null;
  nature: "avis_echeance" | "rappel" | "relance" | "mise_en_demeure" | "fin_bail";
  locataire: string;
  telephone: string;
  logement: string;
  montant: number;
  message: string;
  urgence: "normale" | "haute";
  detail: string;
};

function appliquer(modele: string, valeurs: Record<string, string>): string {
  return modele.replace(/\{\{(\w+)\}\}/g, (_, cle) => valeurs[cle] ?? "");
}

/**
 * Prépare tout seul les envois du jour : avis d'échéance, rappel avant l'échéance,
 * relance de retard, alerte de fin de bail. Le bailleur relit et déclenche.
 * Rien n'est envoyé automatiquement sans son geste.
 */
export function envoisPrets(proprietaireId: string, langue = "fr"): EnvoiPret[] {
  const base = db();
  const p = parametresDe(proprietaireId);
  const today = aujourdhui();
  const sorties: EnvoiPret[] = [];

  const modeles = base
    .prepare(`SELECT code, langue, corps FROM modeles_message WHERE proprietaire_id = ?`)
    .all(proprietaireId) as any[];
  const modele = (code: string) =>
    modeles.find((m) => m.code === code && m.langue === langue)?.corps ??
    MESSAGES_DEFAUT.find((m) => m.code === code && m.langue === langue)?.corps ??
    MESSAGES_DEFAUT.find((m) => m.code === code)?.corps ??
    "";

  const bailleur = base.prepare(`SELECT nom FROM profils WHERE id = ?`).get(proprietaireId) as any;
  const nomBailleur = p.raison_sociale || bailleur?.nom || "";

  for (const bail of bauxDuProprietaire(proprietaireId)) {
    const logement = nomLogement(bail);
    const s = situationBail(bail.id);
    const echeances = echeancesDuBail(bail.id);

    // Déjà relancé aujourd'hui pour la même chose : on ne propose pas deux fois.
    const dejaEnvoye = (nature: string, echeanceId: string | null) =>
      !!base
        .prepare(
          `SELECT 1 FROM relances WHERE bail_id = ? AND nature = ?
            AND (echeance_id IS ? OR echeance_id = ?) AND date_envoi = ?`,
        )
        .get(bail.id, nature, echeanceId, echeanceId, today);

    const valeursBase = {
      locataire: bail.locataire_nom,
      logement,
      bailleur: nomBailleur,
    };

    // Retard : une relance, ou une mise en demeure si le retard s'installe.
    if (s.du > 0 && s.plus_ancienne_dette) {
      const e = s.plus_ancienne_dette;
      const grave = s.jours_retard >= p.jours_avant_relance_retard * 4;
      const nature = grave ? "mise_en_demeure" : "relance";
      if (s.jours_retard >= p.jours_avant_relance_retard && !dejaEnvoye(nature, e.id)) {
        sorties.push({
          bail_id: bail.id,
          echeance_id: e.id,
          nature,
          locataire: bail.locataire_nom,
          telephone: bail.locataire_whatsapp || bail.locataire_telephone,
          logement,
          montant: s.du,
          urgence: grave ? "haute" : "normale",
          detail: `En retard de ${s.jours_retard} jour(s)`,
          message: appliquer(modele(nature), {
            ...valeursBase,
            montant: fcfa(s.du),
            periode: e.libelle,
            date_echeance: dateLongue(e.date_echeance),
            jours: String(s.jours_retard),
          }),
        });
        continue;
      }
    }

    // Rappel quelques jours avant l'échéance.
    const limite = ajouterJours(today, p.jours_rappel_avant_echeance);
    const prochaine = echeances.find(
      (e) => e.reste > 0 && e.date_echeance >= today && e.date_echeance <= limite,
    );
    if (prochaine && !dejaEnvoye("rappel", prochaine.id)) {
      sorties.push({
        bail_id: bail.id,
        echeance_id: prochaine.id,
        nature: "rappel",
        locataire: bail.locataire_nom,
        telephone: bail.locataire_whatsapp || bail.locataire_telephone,
        logement,
        montant: prochaine.reste,
        urgence: "normale",
        detail: `Échéance le ${dateLongue(prochaine.date_echeance)}`,
        message: appliquer(modele("rappel"), {
          ...valeursBase,
          montant: fcfa(prochaine.reste),
          periode: moisLong(prochaine.periode_debut),
          date_echeance: dateLongue(prochaine.date_echeance),
        }),
      });
    }

    // Fin de bail sous 90 jours.
    if (bail.date_fin_prevue) {
      const dans90 = ajouterJours(today, 90);
      if (
        bail.date_fin_prevue >= today &&
        bail.date_fin_prevue <= dans90 &&
        !dejaEnvoye("fin_bail", null)
      ) {
        sorties.push({
          bail_id: bail.id,
          echeance_id: null,
          nature: "fin_bail",
          locataire: bail.locataire_nom,
          telephone: bail.locataire_whatsapp || bail.locataire_telephone,
          logement,
          montant: 0,
          urgence: "normale",
          detail: `Bail jusqu'au ${dateLongue(bail.date_fin_prevue)}`,
          message: appliquer(modele("fin_bail"), {
            ...valeursBase,
            date_fin: dateLongue(bail.date_fin_prevue),
          }),
        });
      }
    }
  }

  const ordre = { mise_en_demeure: 0, relance: 1, rappel: 2, avis_echeance: 3, fin_bail: 4 };
  return sorties.sort((a, b) => ordre[a.nature] - ordre[b.nature]);
}
