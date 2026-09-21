import Link from "next/link";
import { Coquille } from "@/components/coquille";
import { Bloc, Chiffre, Erreur, Ligne, Montant, Vide } from "@/components/ui";
import { exigerContexte } from "@/lib/session";
import { db } from "@/lib/db";
import { aujourdhui, dateLongue, MODES_PAIEMENT, moisLong } from "@/lib/format";
import { impayes, resumeDuMois } from "@/lib/requetes";

export default async function Paiements({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; mois?: string }>;
}) {
  const ctx = await exigerContexte();
  const { e, mois } = await searchParams;
  const m = mois ?? aujourdhui().slice(0, 7);
  const resume = resumeDuMois(ctx.proprietaireActif, m);
  const nbImpayes = impayes(ctx.proprietaireActif).length;

  const paiements = db()
    .prepare(
      `SELECT p.*, l.nom AS locataire_nom, bi.nom AS bien_nom, u.libelle AS unite_libelle,
              u.unique_du_bien, pr.nom AS encaisse_par_nom
       FROM paiements p
       JOIN baux b ON b.id = p.bail_id
       JOIN locataires l ON l.id = b.locataire_id
       JOIN unites u ON u.id = b.unite_id
       JOIN biens bi ON bi.id = u.bien_id
       LEFT JOIN profils pr ON pr.id = p.encaisse_par
       WHERE p.proprietaire_id = ? AND substr(p.date_encaissement, 1, 7) = ?
       ORDER BY p.date_encaissement DESC, p.cree_le DESC`,
    )
    .all(ctx.proprietaireActif, m) as any[];

  const moisPrecedent = (() => {
    const [a, mm] = m.split("-").map(Number);
    const d = new Date(Date.UTC(a, mm - 2, 1));
    return d.toISOString().slice(0, 7);
  })();
  const moisSuivant = (() => {
    const [a, mm] = m.split("-").map(Number);
    const d = new Date(Date.UTC(a, mm, 1));
    return d.toISOString().slice(0, 7);
  })();

  return (
    <Coquille
      ctx={ctx}
      actif="/app/paiements"
      titre="Les paiements"
      action={
        <Link href="/app/paiements/nouveau" className="bouton-principal">
          Enregistrer un paiement
        </Link>
      }
    >
      <div className="space-y-5">
        {e && <Erreur>{e}</Erreur>}

        <div className="flex items-center justify-between gap-3">
          <Link href={`/app/paiements?mois=${moisPrecedent}`} className="bouton-doux py-2 px-3">
            ←
          </Link>
          <div className="font-bold text-lg capitalize">{moisLong(m + "-01")}</div>
          <Link href={`/app/paiements?mois=${moisSuivant}`} className="bouton-doux py-2 px-3">
            →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Chiffre
            libelle="Encaissé"
            valeur={<Montant valeur={resume.encaisse} taille="grand" ton="positif" />}
            detail={`${paiements.length} versement(s)`}
          />
          <Chiffre
            libelle="Attendu"
            valeur={<Montant valeur={resume.attendu} taille="grand" />}
          />
        </div>

        {nbImpayes > 0 && (
          <Link
            href="/app/impayes"
            className="carte p-4 flex items-center justify-between gap-3 border-brique/30 bg-brique-pale"
          >
            <div>
              <div className="font-bold text-brique">
                {nbImpayes} locataire{nbImpayes > 1 ? "s" : ""} en retard
              </div>
              <div className="text-sm text-encre-doux">Voir la liste, du plus ancien au plus récent</div>
            </div>
            <span aria-hidden className="text-brique text-xl">→</span>
          </Link>
        )}

        <Bloc titre="Versements du mois">
          {paiements.length === 0 ? (
            <Vide
              titre="Aucun paiement ce mois-ci"
              texte="Dès qu'un locataire vous remet de l'argent, enregistrez-le ici. Cela prend trois gestes et laloc s'occupe du reste."
              action={{ href: "/app/paiements/nouveau", libelle: "Enregistrer un paiement" }}
            />
          ) : (
            <div className="space-y-2.5">
              {paiements.map((p) => (
                <Ligne
                  key={p.id}
                  href={`/app/paiements/${p.id}`}
                  titre={p.locataire_nom}
                  sousTitre={`${dateLongue(p.date_encaissement)} · ${MODES_PAIEMENT[p.mode] ?? p.mode}`}
                  droite={
                    <>
                      <Montant
                        valeur={p.montant}
                        ton={p.statut === "annule" ? "doux" : "positif"}
                      />
                      {p.statut === "annule" && (
                        <div className="mt-1">
                          <span className="jeton-rouge">Annulé</span>
                        </div>
                      )}
                    </>
                  }
                />
              ))}
            </div>
          )}
        </Bloc>
      </div>
    </Coquille>
  );
}
