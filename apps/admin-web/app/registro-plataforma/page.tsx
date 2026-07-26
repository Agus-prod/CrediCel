import Link from "next/link";
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
  readonly searchParams: Promise<{ error?: string; check_email?: string; resent?: string }>;
}) {
  const query = await searchParams;
  const error = readableError(query.error);
  const waitingForResend = Boolean(
    query.check_email || query.error?.toLowerCase().includes("security purposes"),
  );
  return (
    <main className="auth-shell">
      <section className="auth-card platform-register-card">
        <div className="logo">Credi<span>Cel</span></div>
        <span className="eyebrow">Propietario de la plataforma</span>
        <h1>Crea tu cuenta maestra</h1>
        <p className="muted">Administra organizaciones, planes y pagos sin crear una tienda.</p>
        {error && <div className="error">{error}</div>}
        {waitingForResend ? (
          <div className="platform-confirmation">
            <div className="notice">
              {query.resent
                ? "Enviamos un enlace nuevo."
                : query.error
                  ? "Espera un minuto antes de solicitar otro enlace."
                  : "Revisa tu correo."}{" "}
              Usa augustocolindres1@gmail.com y abre únicamente el mensaje más reciente.
            </div>
            <form action={resendPlatformConfirmation}>
              <button className="button secondary" type="submit">Reenviar confirmación</button>
            </form>
          </div>
        ) : (
          <form action={registerPlatformOwner} className="form">
            <div className="field"><label htmlFor="full_name">Tu nombre</label><input id="full_name" name="full_name" defaultValue="Augusto Colindres" required /></div>
            <div className="field"><label htmlFor="email">Correo maestro</label><input id="email" name="email" type="email" value="augustocolindres1@gmail.com" readOnly /></div>
            <div className="field full-field"><label htmlFor="password">Crea una contraseña</label><input id="password" name="password" type="password" minLength={10} autoComplete="new-password" required /><small>Mínimo 10 caracteres.</small></div>
            <div className="form-actions full-field"><button className="button">Crear cuenta maestra</button></div>
          </form>
        )}
        <Link className="auth-back" href="/login">Volver a iniciar sesión</Link>
      </section>
    </main>
  );
}
