import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./workflow.css";
import "./operations.css";
import "./subscription.css";
import "./reports.css";
import "./collections.css";
import "./documents.css";

export const metadata: Metadata = {
  title: "CrediCel | Operaciones",
  description: "Administración multiempresa de ventas a crédito",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "CrediCel" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#087653",
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return <html lang="es-HN"><body>{children}</body></html>;
}
