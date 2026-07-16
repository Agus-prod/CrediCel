import type { Metadata } from "next";
import "./globals.css";
import "./portal-workflow.css";
export const metadata: Metadata = {
  title: "Mi crédito | CrediCel",
  description: "Portal seguro de pagos CrediCel",
};
export default function Layout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <a className="skip-link" href="#main-content">
          Saltar al contenido principal
        </a>
        <header className="header">
          Credi<span>Cel</span>
          <small>Portal del cliente</small>
        </header>
        {children}
      </body>
    </html>
  );
}
