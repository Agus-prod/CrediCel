import Link from "next/link";
import { logout } from "@/app/login/actions";

const links = [
  { href: "/operacion", label: "Resumen" },
  { href: "/operacion/suscripciones", label: "Pagos y suscripciones" },
] as const;

export function PlatformShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="platform-shell">
      <header className="platform-nav">
        <Link className="logo" href="/operacion" aria-label="CrediCel, administración de plataforma">
          Credi<span>Cel</span>
        </Link>
        <nav aria-label="Administración de plataforma">
          {links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
        </nav>
        <form action={logout}><button className="button secondary" type="submit">Cerrar sesión</button></form>
      </header>
      <main className="platform-console" id="main-content">{children}</main>
    </div>
  );
}
