import Link from "next/link";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Store,
  UsersRound,
} from "lucide-react";

const highlights = [
  { icon: BarChart3, text: "Ventas y cartera visibles en un solo lugar" },
  { icon: Store, text: "Tiendas, inventario y traslados conectados" },
  { icon: UsersRound, text: "Roles claros para cada integrante del equipo" },
] as const;

export function AuthExperience({
  children,
  compact = false,
  description = "Convierte cada venta a crédito en una operación ordenada, medible y fácil de seguir.",
  eyebrow = "Gestión de crédito inteligente",
  title = "Tu operación avanza con claridad.",
}: {
  readonly children: React.ReactNode;
  readonly compact?: boolean;
  readonly description?: string;
  readonly eyebrow?: string;
  readonly title?: string;
}) {
  return (
    <main
      className={`auth-experience${compact ? " auth-experience-compact" : ""}`}
    >
      <div aria-hidden="true" className="auth-glow auth-glow-one" />
      <div aria-hidden="true" className="auth-glow auth-glow-two" />
      <section className="auth-showcase">
        <Link aria-label="CrediCel" className="auth-brand" href="/login">
          <span className="auth-brand-mark">
            <CreditCard aria-hidden="true" size={22} strokeWidth={2.2} />
          </span>
          <span className="logo">
            Credi<span>Cel</span>
          </span>
        </Link>

        <div className="auth-showcase-copy">
          <span className="auth-kicker">
            <Activity aria-hidden="true" size={14} />
            {eyebrow}
          </span>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="auth-highlights">
            {highlights.map(({ icon: Icon, text }) => (
              <div className="auth-highlight" key={text}>
                <span>
                  <Icon aria-hidden="true" size={17} />
                </span>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-pulse-card">
          <div className="auth-pulse-heading">
            <div>
              <small>Centro de operaciones</small>
              <strong>Todo sincronizado</strong>
            </div>
            <span>
              <i /> En línea
            </span>
          </div>
          <div aria-hidden="true" className="auth-pulse-bars">
            <span style={{ "--fill": "82%" } as React.CSSProperties} />
            <span style={{ "--fill": "64%" } as React.CSSProperties} />
            <span style={{ "--fill": "91%" } as React.CSSProperties} />
          </div>
          <div className="auth-pulse-footer">
            <ShieldCheck aria-hidden="true" size={17} />
            <span>Información protegida y accesos por rol</span>
            <CheckCircle2 aria-hidden="true" size={16} />
          </div>
        </div>
      </section>

      <section className="auth-form-zone">{children}</section>
    </main>
  );
}
