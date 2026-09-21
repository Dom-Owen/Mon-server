import { Coquille } from "@/components/coquille";
import { Erreur, Vide } from "@/components/ui";
import { FormulairePaiement } from "@/components/formulaire-paiement";
import { exigerContexte } from "@/lib/session";
import { bauxDuProprietaire, nomLogement, situationBail } from "@/lib/requetes";
import { actionEnregistrerPaiement } from "@/lib/actions/paiements";
import { aujourdhui } from "@/lib/format";

export default async function NouveauPaiement({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; bail?: string }>;
}) {
  const ctx = await exigerContexte();
  const { e, bail } = await searchParams;

  const baux = bauxDuProprietaire(ctx.proprietaireActif).map((b) => {
    const s = situationBail(b.id);
    return {
      id: b.id,
      libelle: `${b.locataire_nom} — ${nomLogement(b)}`,
      du: s.du,
      loyer: b.loyer_mensuel + b.charges_mensuelles,
    };
  });

  if (baux.length === 0) {
    return (
      <Coquille ctx={ctx} actif="/app/paiements" titre="Enregistrer un paiement">
        <Vide
          titre="Aucun bail en cours"
          texte="Un paiement se rattache à un bail. Créez d'abord un bail pour pouvoir encaisser."
          action={{ href: "/app/baux/nouveau", libelle: "Créer un bail" }}
        />
      </Coquille>
    );
  }

  return (
    <Coquille
      ctx={ctx}
      actif="/app/paiements"
      titre="Enregistrer un paiement"
      retour={{ href: "/app/paiements", libelle: "Les paiements" }}
    >
      {e && (
        <div className="mb-4">
          <Erreur>{e}</Erreur>
        </div>
      )}
      <FormulairePaiement
        action={actionEnregistrerPaiement}
        baux={baux}
        bailPreselectionne={bail}
        aujourdhui={aujourdhui()}
      />
    </Coquille>
  );
}
