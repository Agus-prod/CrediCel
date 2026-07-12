import type { Metadata } from "next"; import "./globals.css";
export const metadata: Metadata={title:"CrediCel | Operaciones",description:"Administración multiestablecimiento de CrediCel"};
export default function RootLayout({children}:{readonly children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
