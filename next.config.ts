import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 et pdfkit sont des modules natifs / lisant des fichiers sur disque :
  // ils doivent rester en dehors du bundle et être chargés par Node normalement.
  serverExternalPackages: ["better-sqlite3", "pdfkit"],
};

export default nextConfig;
