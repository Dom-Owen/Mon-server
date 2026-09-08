const PAYS = [
  { code: "237", nom: "Cameroun", drapeau: "🇨🇲" },
  { code: "33", nom: "France", drapeau: "🇫🇷" },
  { code: "1", nom: "États-Unis / Canada", drapeau: "🇺🇸" },
  { code: "44", nom: "Royaume-Uni", drapeau: "🇬🇧" },
  { code: "32", nom: "Belgique", drapeau: "🇧🇪" },
  { code: "49", nom: "Allemagne", drapeau: "🇩🇪" },
  { code: "241", nom: "Gabon", drapeau: "🇬🇦" },
  { code: "225", nom: "Côte d'Ivoire", drapeau: "🇨🇮" },
  { code: "235", nom: "Tchad", drapeau: "🇹🇩" },
  { code: "236", nom: "Centrafrique", drapeau: "🇨🇫" },
];

/**
 * Le numéro est l'identifiant réel des gens au Cameroun. L'indicatif +237 est
 * pré-rempli, le sélecteur de pays reste disponible pour la diaspora.
 */
export function ChampTelephone({
  nom = "telephone",
  defaut = "",
  autoFocus = false,
  etiquette = "Numéro de téléphone",
  aide,
}: {
  nom?: string;
  defaut?: string;
  autoFocus?: boolean;
  etiquette?: string;
  aide?: string;
}) {
  return (
    <div>
      <label className="etiquette" htmlFor={nom}>
        {etiquette}
      </label>
      <div className="flex gap-2">
        <select
          name="indicatif"
          defaultValue="237"
          aria-label="Indicatif du pays"
          className="champ w-[7.5rem] shrink-0 pr-2"
        >
          {PAYS.map((p) => (
            <option key={p.code} value={p.code}>
              {p.drapeau} +{p.code}
            </option>
          ))}
        </select>
        <input
          id={nom}
          name={nom}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          autoFocus={autoFocus}
          defaultValue={defaut}
          placeholder="6 91 23 45 67"
          className="champ flex-1"
          required
        />
      </div>
      <p className="aide">{aide ?? "Un mobile camerounais a 9 chiffres et commence par 6."}</p>
    </div>
  );
}
