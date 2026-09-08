import { Marque } from "./ui";

export function CadrePublic({
  titre,
  sousTitre,
  children,
  bas,
}: {
  titre: string;
  sousTitre?: string;
  children: React.ReactNode;
  bas?: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-10 bg-sable-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <Marque taille="grand" />
          <p className="sous-titre mt-1.5 text-[15px]">
            Vos biens, vos loyers, vos papiers. Depuis votre téléphone.
          </p>
        </div>

        <div className="carte p-6 sm:p-7">
          <h1 className="text-xl font-bold mb-1">{titre}</h1>
          {sousTitre && <p className="sous-titre text-[15px] mb-5">{sousTitre}</p>}
          {!sousTitre && <div className="mb-5" />}
          {children}
        </div>

        {bas && <div className="mt-5 text-center text-[15px]">{bas}</div>}
      </div>
    </div>
  );
}
