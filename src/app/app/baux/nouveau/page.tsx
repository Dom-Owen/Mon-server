import Link from "next/link";
import { Coquille } from "@/components/coquille";
import { Avertissement, Bloc, Erreur, Vide } from "@/components/ui";
import { Televerseur } from "@/components/televerseur";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { aujourdhui, entier } from "@/lib/format";
import { parametresDe } from "@/lib/requetes";
import { actionCreerBail } from "@/lib/actions/baux";

export default async function NouveauBail({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; unite?: string; locataire?: string }>;
}) {
  const ctx = await exigerContexte();
  const { e, unite, locataire } = await searchParams;
  const base = db();
  const p = parametresDe(ctx.proprietaireActif);

  const unitesLibres = base
    .prepare(
      `SELECT u.id, u.libelle, u.loyer_reference, u.caution_reference, u.unique_du_bien,
              bi.nom AS bien_nom, bi.ville, bi.usage, bi.mode_charges, bi.charges_forfait
       FROM unites u JOIN biens bi ON bi.id = u.bien_id
       WHERE bi.proprietaire_id = ? AND u.archive_le IS NULL AND bi.archive_le IS NULL
         AND NOT EXISTS (SELECT 1 FROM baux b WHERE b.unite_id = u.id AND b.statut IN ('actif','preavis'))
       ORDER BY bi.nom, u.libelle`,
    )
    .all(ctx.proprietaireActif) as any[];

  const locataires = base
    .prepare(
      `SELECT id, nom, telephone FROM locataires
       WHERE proprietaire_id = ? AND archive_le IS NULL ORDER BY nom`,
    )
    .all(ctx.proprietaireActif) as any[];

  if (unitesLibres.length === 0 || locataires.length === 0) {
    return (
      <Coquille ctx={ctx} actif="/app" titre="Créer un bail" retour={{ href: "/app", libelle: "Accueil" }}>
        <Vide
          titre={unitesLibres.length === 0 ? "Aucun logement libre" : "Aucun locataire enregistré"}
          texte={
            unitesLibres.length === 0
              ? "Tous vos logements sont déjà loués, ou vous n'en avez pas encore ajouté. Commencez par là."
              : "Un bail relie un logement à un locataire. Ajoutez d'abord la fiche du locataire."
          }
          action={
            unitesLibres.length === 0
              ? { href: "/app/biens/nouveau", libelle: "Ajouter un bien" }
              : { href: "/app/locataires/nouveau", libelle: "Ajouter un locataire" }
          }
        />
      </Coquille>
    );
  }

  const uniteChoisie = unitesLibres.find((u) => u.id === unite) ?? unitesLibres[0];
  const loyerDefaut = uniteChoisie?.loyer_reference || 0;
  const cautionDefaut = uniteChoisie?.caution_reference || 0;

  return (
    <Coquille
      ctx={ctx}
      actif="/app"
      titre="Créer un bail"
      retour={{ href: "/app", libelle: "Accueil" }}
    >
      <form action={actionCreerBail} className="space-y-5">
        {e && <Erreur>{e}</Erreur>}

        <Bloc titre="Qui loue quoi">
          <div className="space-y-4">
            <div>
              <label className="etiquette" htmlFor="locataire_id">
                Le locataire
              </label>
              <select
                id="locataire_id"
                name="locataire_id"
                className="champ"
                defaultValue={locataire ?? locataires[0]?.id}
                required
              >
                {locataires.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nom}
                  </option>
                ))}
              </select>
              <p className="aide">
                Il n'est pas dans la liste ?{" "}
                <Link href="/app/locataires/nouveau" className="lien">
                  Ajoutez sa fiche
                </Link>
                .
              </p>
            </div>

            <div>
              <label className="etiquette" htmlFor="unite_id">
                Le logement
              </label>
              <select
                id="unite_id"
                name="unite_id"
                className="champ"
                defaultValue={uniteChoisie?.id}
                required
              >
                {unitesLibres.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unique_du_bien ? u.bien_nom : `${u.bien_nom} — ${u.libelle}`} ({u.ville})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="etiquette" htmlFor="usage">
                Usage
              </label>
              <select id="usage" name="usage" className="champ" defaultValue={uniteChoisie?.usage ?? "habitation"}>
                <option value="habitation">Habitation</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
          </div>
        </Bloc>

        <Bloc titre="Durée et loyer">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="etiquette" htmlFor="date_debut">
                Date de début
              </label>
              <input
                id="date_debut"
                name="date_debut"
                type="date"
                className="champ"
                defaultValue={aujourdhui()}
                required
              />
              <p className="aide">
                Pour un bail déjà en cours, mettez sa vraie date de départ.
              </p>
            </div>
            <div>
              <label className="etiquette" htmlFor="duree_mois">
                Durée
              </label>
              <select id="duree_mois" name="duree_mois" className="champ" defaultValue="12">
                <option value="6">6 mois</option>
                <option value="12">1 an</option>
                <option value="24">2 ans</option>
                <option value="36">3 ans</option>
              </select>
            </div>
            <div>
              <label className="etiquette" htmlFor="loyer_mensuel">
                Loyer mensuel
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="loyer_mensuel"
                  name="loyer_mensuel"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={0}
                  className="champ"
                  defaultValue={loyerDefaut || undefined}
                  required
                />
                <span className="font-semibold text-encre-doux shrink-0">FCFA</span>
              </div>
            </div>
            <div>
              <label className="etiquette" htmlFor="charges_mensuelles">
                Charges mensuelles
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="charges_mensuelles"
                  name="charges_mensuelles"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={0}
                  className="champ"
                  defaultValue={uniteChoisie?.mode_charges === "forfait" ? uniteChoisie.charges_forfait : 0}
                />
                <span className="font-semibold text-encre-doux shrink-0">FCFA</span>
              </div>
              <p className="aide">Toujours séparées du loyer sur les quittances.</p>
            </div>
            <div>
              <label className="etiquette" htmlFor="jour_echeance">
                Loyer dû le
              </label>
              <input
                id="jour_echeance"
                name="jour_echeance"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                className="champ"
                placeholder="Jour du début du bail"
              />
              <p className="aide">Laissez vide pour reprendre le jour du début du bail.</p>
            </div>
            <div>
              <label className="etiquette" htmlFor="periodicite">
                Périodicité
              </label>
              <select id="periodicite" name="periodicite" className="champ" defaultValue="mensuelle">
                <option value="mensuelle">Mensuelle</option>
                <option value="trimestrielle">Trimestrielle</option>
              </select>
            </div>
          </div>
        </Bloc>

        <Bloc titre="Caution et avance">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="etiquette" htmlFor="montant_caution">
                Caution demandée
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="montant_caution"
                  name="montant_caution"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={0}
                  className="champ"
                  defaultValue={cautionDefaut || undefined}
                />
                <span className="font-semibold text-encre-doux shrink-0">FCFA</span>
              </div>
            </div>
            <div>
              <label className="etiquette" htmlFor="caution_versee">
                Caution déjà versée
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="caution_versee"
                  name="caution_versee"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={0}
                  className="champ"
                  defaultValue={0}
                />
                <span className="font-semibold text-encre-doux shrink-0">FCFA</span>
              </div>
            </div>
            <div>
              <label className="etiquette" htmlFor="mois_avance">
                Mois de loyer payés d'avance
              </label>
              <input
                id="mois_avance"
                name="mois_avance"
                type="number"
                inputMode="numeric"
                min={0}
                max={24}
                className="champ"
                defaultValue={0}
              />
              <p className="aide">
                Très courant au Cameroun. Le réglage par défaut de votre compte est{" "}
                {p.mois_avance_defaut} mois.
              </p>
            </div>
            <div>
              <label className="etiquette" htmlFor="avance_versee">
                Montant de l'avance encaissée
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="avance_versee"
                  name="avance_versee"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={0}
                  className="champ"
                  defaultValue={0}
                />
                <span className="font-semibold text-encre-doux shrink-0">FCFA</span>
              </div>
              <p className="aide">
                laloc la répartira toute seule sur les premiers mois de l'échéancier.
              </p>
            </div>
            <div>
              <label className="etiquette" htmlFor="mode_paiement">
                Mode de paiement habituel
              </label>
              <select id="mode_paiement" name="mode_paiement" className="champ" defaultValue="especes">
                <option value="especes">Espèces</option>
                <option value="mtn_momo">MTN Mobile Money</option>
                <option value="orange_money">Orange Money</option>
                <option value="virement">Virement bancaire</option>
                <option value="cheque">Chèque</option>
              </select>
            </div>
          </div>
        </Bloc>

        <Bloc titre="Ce bail existe-t-il déjà sur papier ?">
          <div className="space-y-3">
            <label className="flex items-start gap-3 carte-douce p-3.5 cursor-pointer has-[:checked]:border-terre has-[:checked]:bg-terre-pale">
              <input
                type="radio"
                name="origine"
                value="application"
                defaultChecked
                className="mt-1 size-5 accent-[#B0662F] shrink-0"
              />
              <span>
                <span className="font-semibold block">Non, c'est un nouveau bail</span>
                <span className="text-sm text-encre-doux">
                  laloc pourra générer le contrat en PDF.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 carte-douce p-3.5 cursor-pointer has-[:checked]:border-terre has-[:checked]:bg-terre-pale">
              <input
                type="radio"
                name="origine"
                value="papier_importe"
                className="mt-1 size-5 accent-[#B0662F] shrink-0"
              />
              <span>
                <span className="font-semibold block">Oui, il est déjà signé sur papier</span>
                <span className="text-sm text-encre-doux">
                  Photographiez-le simplement, sans rien ressaisir.
                </span>
              </span>
            </label>

            <Televerseur
              nom="document_bail"
              etiquette="Photo ou PDF du bail existant"
              aide="Plusieurs pages ? Prenez-les une par une, elles seront toutes conservées."
              multiple
            />

            <div>
              <label className="etiquette" htmlFor="solde_ouverture">
                Dette déjà accumulée avant aujourd'hui
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="solde_ouverture"
                  name="solde_ouverture"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={0}
                  className="champ"
                  defaultValue={0}
                />
                <span className="font-semibold text-encre-doux shrink-0">FCFA</span>
              </div>
              <p className="aide">
                Si ce locataire vous doit déjà de l'argent, indiquez-le ici. Sans ça, votre
                page « impayés » afficherait zéro dès le premier jour.
              </p>
            </div>
          </div>
        </Bloc>

        <Avertissement>
          Dès l'enregistrement, laloc calcule tout l'échéancier des loyers dus et fait
          passer le logement en « occupé ». Vous n'avez rien d'autre à faire.
        </Avertissement>

        <button type="submit" className="bouton-principal w-full text-base py-4">
          Créer le bail et son échéancier
        </button>
      </form>
    </Coquille>
  );
}
