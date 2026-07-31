import Link from "next/link";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { AuthExperience } from "@/components/auth-experience";
import { requestReset } from "./actions";

export default async function Reset({
  searchParams,
}: {
  readonly searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <AuthExperience
      compact
      description="Recupera tu acceso sin perder el ritmo de tu operación. Te enviaremos un enlace de un solo uso."
      eyebrow="Recuperación protegida"
      title="Volver a entrar debe ser sencillo."
    >
      <form action={requestReset} className="auth-form-card">
        <div className="auth-card-heading">
          <span className="auth-card-icon">
            <Mail aria-hidden="true" size={22} />
          </span>
          <div>
            <span className="eyebrow">Recuperar acceso</span>
            <h1>Restablece tu contraseña</h1>
            <p className="muted">
              Te enviaremos instrucciones seguras a tu correo.
            </p>
          </div>
        </div>
        {sent && (
          <p className="success" role="status">
            Si el correo está registrado, recibirás las instrucciones en unos
            minutos.
          </p>
        )}
        <div className="field">
          <label htmlFor="email">Correo</label>
          <div className="auth-control">
            <Mail aria-hidden="true" size={18} />
            <input
              autoComplete="email"
              id="email"
              name="email"
              placeholder="tu@empresa.com"
              required
              type="email"
            />
          </div>
        </div>
        <button className="button wide" type="submit">
          Enviar enlace <Send aria-hidden="true" size={17} />
        </button>
        <Link className="auth-back" href="/login">
          <ArrowLeft aria-hidden="true" size={16} /> Volver al acceso
        </Link>
      </form>
    </AuthExperience>
  );
}
