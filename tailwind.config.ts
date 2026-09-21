import type { Config } from "tailwindcss";

/**
 * Charte laloc : beige, sobre, avec un accent chaud terre cuite.
 * Aucun bleu corporate. Contrastes forts, typographie généreuse.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sable: {
          50: "#FDFBF7",
          100: "#FAF6EF",
          200: "#F2EADC",
          300: "#E7DAC5",
          400: "#D8C6AA",
          500: "#C4AC8A",
          600: "#A88F6E",
        },
        encre: {
          DEFAULT: "#2E2721",
          doux: "#6B5D4F",
          pale: "#9C8E7E",
        },
        terre: {
          DEFAULT: "#B0662F",
          fonce: "#8A4E22",
          clair: "#D89B63",
          pale: "#F6E8DA",
        },
        vert: { DEFAULT: "#4C7A46", pale: "#E6F0E3" },
        brique: { DEFAULT: "#A8402C", pale: "#F8E5E1" },
        ocre: { DEFAULT: "#B8892B", pale: "#FBF0D9" },
      },
      fontFamily: {
        sans: ["var(--police-texte)", "system-ui", "sans-serif"],
        titre: ["var(--police-titre)", "Georgia", "serif"],
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.25rem" },
      boxShadow: {
        carte: "0 1px 2px rgba(46,39,33,.05), 0 4px 16px rgba(46,39,33,.05)",
        pose: "0 2px 4px rgba(46,39,33,.06), 0 12px 32px rgba(46,39,33,.10)",
      },
    },
  },
  plugins: [],
} satisfies Config;
