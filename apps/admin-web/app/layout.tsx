import type { Metadata } from "next";
import "./globals.css";
import "./workflow.css";
export const metadata: Metadata={title:"CrediCel | Operaciones",description:"Administración multiempresa de ventas a crédito"};
export default function RootLayout({children}:{readonly children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
