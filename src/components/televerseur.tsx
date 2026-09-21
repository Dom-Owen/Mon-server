"use client";

import { useRef, useState } from "react";

/**
 * Un seul bouton : « prendre une photo » ou « choisir un fichier ».
 *
 * La photo est redimensionnée et recompressée DANS LE NAVIGATEUR avant d'être envoyée.
 * Une photo de téléphone fait 4 Mo ; après passage ici elle en fait environ 200 Ko et
 * reste parfaitement lisible. C'est un facteur 20 sur la facture de stockage et sur la
 * data consommée par l'utilisateur, qui la paie souvent au mégaoctet.
 */

const LARGEUR_MAX = 1600;
const QUALITE = 0.72;

async function compresser(fichier: File): Promise<File> {
  if (!fichier.type.startsWith("image/")) return fichier;

  const image = await new Promise<HTMLImageElement>((resoudre, rejeter) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resoudre(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rejeter(new Error("image illisible"));
    };
    img.src = url;
  });

  const ratio = Math.min(1, LARGEUR_MAX / Math.max(image.width, image.height));
  if (ratio === 1 && fichier.size < 400 * 1024) return fichier;

  const toile = document.createElement("canvas");
  toile.width = Math.round(image.width * ratio);
  toile.height = Math.round(image.height * ratio);
  const ctx = toile.getContext("2d");
  if (!ctx) return fichier;
  ctx.drawImage(image, 0, 0, toile.width, toile.height);

  const blob = await new Promise<Blob | null>((r) =>
    toile.toBlob(r, "image/jpeg", QUALITE),
  );
  if (!blob || blob.size >= fichier.size) return fichier;
  return new File([blob], fichier.name.replace(/\.\w+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}

export function Televerseur({
  nom,
  etiquette,
  aide,
  valeurInitiale = "",
  multiple = false,
}: {
  nom: string;
  etiquette: string;
  aide?: string;
  valeurInitiale?: string;
  multiple?: boolean;
}) {
  const [chemins, setChemins] = useState<string[]>(
    valeurInitiale ? valeurInitiale.split(",").filter(Boolean) : [],
  );
  const [etat, setEtat] = useState<"repos" | "envoi">("repos");
  const [progression, setProgression] = useState(0);
  const [erreur, setErreur] = useState("");
  const champAppareil = useRef<HTMLInputElement>(null);
  const champFichier = useRef<HTMLInputElement>(null);

  async function envoyer(liste: FileList | null) {
    if (!liste || liste.length === 0) return;
    setErreur("");
    setEtat("envoi");
    const nouveaux: string[] = [];
    const total = liste.length;

    for (let i = 0; i < total; i++) {
      setProgression(Math.round((i / total) * 100));
      try {
        const compresse = await compresser(liste[i]);
        const corps = new FormData();
        corps.append("fichier", compresse);
        const reponse = await fetch("/api/televerser", { method: "POST", body: corps });
        const json = await reponse.json();
        if (!reponse.ok) {
          setErreur(json.erreur ?? "L'envoi a échoué. Réessayez.");
          break;
        }
        nouveaux.push(json.chemin);
      } catch {
        setErreur("Cette image n'a pas pu être lue. Essayez-en une autre.");
        break;
      }
    }

    setProgression(100);
    setChemins((prec) => (multiple ? [...prec, ...nouveaux] : nouveaux.slice(-1)));
    setEtat("repos");
    if (champAppareil.current) champAppareil.current.value = "";
    if (champFichier.current) champFichier.current.value = "";
  }

  function retirer(chemin: string) {
    setChemins((prec) => prec.filter((c) => c !== chemin));
  }

  return (
    <div>
      <span className="etiquette">{etiquette}</span>
      <input type="hidden" name={nom} value={chemins.join(",")} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => champAppareil.current?.click()}
          className="bouton-second"
          disabled={etat === "envoi"}
        >
          Prendre une photo
        </button>
        <button
          type="button"
          onClick={() => champFichier.current?.click()}
          className="bouton-doux"
          disabled={etat === "envoi"}
        >
          Choisir un fichier
        </button>
      </div>

      <input
        ref={champAppareil}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        hidden
        onChange={(ev) => envoyer(ev.target.files)}
      />
      <input
        ref={champFichier}
        type="file"
        accept="image/*,application/pdf"
        multiple={multiple}
        hidden
        onChange={(ev) => envoyer(ev.target.files)}
      />

      {etat === "envoi" && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-sable-300 overflow-hidden">
            <div
              className="h-full bg-terre transition-all"
              style={{ width: `${progression}%` }}
            />
          </div>
          <p className="aide">Compression et envoi en cours…</p>
        </div>
      )}

      {erreur && <p className="mt-2 text-sm font-medium text-brique">{erreur}</p>}

      {chemins.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chemins.map((c) => (
            <div key={c} className="relative">
              {c.endsWith(".pdf") ? (
                <div className="size-20 rounded-xl border border-sable-400 bg-sable-100 grid place-items-center text-xs font-semibold text-encre-doux">
                  PDF
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c}
                  alt=""
                  className="size-20 rounded-xl object-cover border border-sable-400"
                />
              )}
              <button
                type="button"
                onClick={() => retirer(c)}
                aria-label="Retirer"
                className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-brique text-white text-xs font-bold grid place-items-center shadow"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {aide && <p className="aide">{aide}</p>}
    </div>
  );
}
