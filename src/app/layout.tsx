import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";
import { BandeauDemonstration } from "@/components/bandeau-demonstration";

export const metadata: Metadata = {
  title: "laloc — gestion locative",
  description:
    "Gérez vos biens, vos locataires, vos loyers et vos documents, depuis votre téléphone.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "laloc", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icone-apple.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF6EF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <BandeauDemonstration />
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
