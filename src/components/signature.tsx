"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Signature dessinée au doigt sur l'écran.
 *
 * L'image est enregistrée dans un champ caché du formulaire. Elle ne vaut pas
 * signature électronique avancée : c'est un élément d'un dossier de preuve, et
 * l'application le dit explicitement à l'utilisateur.
 */
export function Signature({ nom, etiquette }: { nom: string; etiquette: string }) {
  const toile = useRef<HTMLCanvasElement>(null);
  const [signee, setSignee] = useState(false);
  const [valeur, setValeur] = useState("");

  useEffect(() => {
    const c = toile.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#2E2721";

    let dessine = false;
    const point = (ev: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    };
    const debut = (ev: PointerEvent) => {
      dessine = true;
      c.setPointerCapture(ev.pointerId);
      const p = point(ev);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ev.preventDefault();
    };
    const bouge = (ev: PointerEvent) => {
      if (!dessine) return;
      const p = point(ev);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ev.preventDefault();
    };
    const fin = () => {
      if (!dessine) return;
      dessine = false;
      setSignee(true);
      setValeur(c.toDataURL("image/png"));
    };

    c.addEventListener("pointerdown", debut);
    c.addEventListener("pointermove", bouge);
    c.addEventListener("pointerup", fin);
    c.addEventListener("pointerleave", fin);
    return () => {
      c.removeEventListener("pointerdown", debut);
      c.removeEventListener("pointermove", bouge);
      c.removeEventListener("pointerup", fin);
      c.removeEventListener("pointerleave", fin);
    };
  }, []);

  function effacer() {
    const c = toile.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx?.clearRect(0, 0, c.width, c.height);
    setSignee(false);
    setValeur("");
  }

  return (
    <div>
      <span className="etiquette">{etiquette}</span>
      <input type="hidden" name={nom} value={valeur} />
      <canvas
        ref={toile}
        className="w-full h-40 rounded-xl border-2 border-dashed border-sable-400 bg-white touch-none"
        aria-label={etiquette}
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-sm text-encre-doux">
          {signee ? "Signature enregistrée." : "Signez avec le doigt dans le cadre."}
        </p>
        <button type="button" onClick={effacer} className="text-sm font-semibold text-terre-fonce">
          Effacer
        </button>
      </div>
    </div>
  );
}
