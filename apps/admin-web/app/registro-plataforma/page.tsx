import Link from "next/link";
import { ArrowLeft, Crown, Mail, UserRound } from "lucide-react";
import { AuthExperience } from "@/components/auth-experience";
import { PasswordField } from "@/components/password-field";
import { registerPlatformOwner, resendPlatformConfirmation } from "./actions";

function readableError(value?: string) {
  if (!value) return null;
  if (value.toLowerCase().includes("security purposes")) {
    return "Supabase exige esperar aproximadamente un minuto antes de reenviar otro correo. Espera y vuelve a intentarlo.";
  }
  if (value.toLowerCase().includes("already registered")) {
    return "La cuenta ya fue creada. Reenvía la confirmación o inicia sesión.";
  }
  return value;
}

export default async function PlatformRegistration({
  searchParams,
}: {
  readonly searchParams: Promise<{
    error?: string;
    check_email?: string;
    resent?: string;
  }>;
}) {
  const query = await searchParams;
  const error = readableError(query.error);
  const waitingForResend = Boolean(
    query.check_email ||
    query.error?.toLowerCase().includes("security purposes"),
  );
  return (
    <AuthExperience
      compact
      description="Administra organizaciones, planes y pagos desde un espacio maestro diseñado para tener perspectiva completa."
      eyebrow="Control de plataforma"
      title="Una vista maestra para dirigir CrediCel."
    >
      <section className="auth-form-card platform-register-card">
        <div className="auth-card-heading">
          <span className="auth-card-icon">
            <Crown aria-hidden="true" size={22} />
          </span>
          <div>
            <span className="eyebrow">Propietario de la plataforma</span>
            <h1>Crea tu cuenta maestra</h1>
            <p className="muted">
              Configura el acceso principal sin crear una tienda.
            </p>
          </div>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {waitingForResend ? (
          <div className="platform-confirmation">
            <div className="notice">
              {query.resent
                ? "Enviamos un enlace nuevo."
                : query.error
                  ? "Espera un minuto antes de solicitar otro enlace."
                  : "Revisa tu correo."}{" "}
              Usa augustocolindres1@gmail.com y abre únicamente el mensaje más
              reciente.
            </div>
            <form action={resendPlatformConfirmation}>
              <button className="button secondary" type="submit">
                Reenviar confirmación
              </button>
            </form>
          </div>
        ) : (
          <form
            action={registerPlatformOwner}
            className="form auth-platform-form"
          >
            <div className="field">
              <label htmlFor="full_name">Tu nombre</label>
              <div className="auth-control">
                <UserRound aria-hidden="true" size={18} />
                <input
                  id="full_name"
                  name="full_name"
                  defaultValue="Augusto Colindres"
                  required
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="email">Correo maestro</label>
              <div className="auth-control">
                <Mail aria-hidden="true" size={18} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value="augustocolindres1@gmail.com"
                  readOnly
                />
              </div>
            </div>
            <div className="full-field">
              <PasswordField
                id="password"
                label="Crea una contraseña"
                name="password"
                minLength={10}
                autoComplete="new-password"
                required
              />
              <small className="auth-field-note">Mínimo 10 caracteres.</small>
            </div>
            <div className="form-actions full-field">
              <button className="button">Crear cuenta maestra</button>
            </div>
          </form>
        )}
        <Link className="auth-back" href="/login">
          <ArrowLeft aria-hidden="true" size={16} /> Volver a iniciar sesión
        </Link>
      </section>
    </AuthExperience>
  );
}
