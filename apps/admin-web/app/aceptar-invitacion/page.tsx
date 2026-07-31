import { ArrowRight, Mail, UserRoundPlus } from "lucide-react";
import { AuthExperience } from "@/components/auth-experience";
import { PasswordField } from "@/components/password-field";
import { createServerSupabase } from "@/lib/supabase/server";
import { acceptInvitation } from "./actions";

export default async function AcceptInvite({
  searchParams,
}: {
  readonly searchParams: Promise<{
    token?: string;
    error?: string;
    sent?: string;
  }>;
}) {
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthExperience
      compact
      description="Tu invitación conecta el rol y las tiendas que necesitas para comenzar con el contexto correcto."
      eyebrow="Tu equipo te espera"
      title="Entra con todo listo para trabajar."
    >
      <section className="auth-form-card">
        <div className="auth-card-heading">
          <span className="auth-card-icon">
            <UserRoundPlus aria-hidden="true" size={22} />
          </span>
          <div>
            <span className="eyebrow">Invitación de equipo</span>
            <h1>Únete a CrediCel</h1>
            <p className="muted">
              Activa el acceso seguro a tu organización y tiendas asignadas.
            </p>
          </div>
        </div>
        {query.error && (
          <div className="error" role="alert">
            {query.error}
          </div>
        )}
        {query.sent && (
          <div className="notice" role="status">
            Revisa tu correo, confirma la cuenta y vuelve a abrir la invitación.
          </div>
        )}
        <form action={acceptInvitation} className="auth-inner-form">
          <input name="token" type="hidden" value={query.token ?? ""} />
          {!user && (
            <>
              <div className="field">
                <label htmlFor="email">Correo invitado</label>
                <div className="auth-control">
                  <Mail aria-hidden="true" size={18} />
                  <input
                    autoComplete="email"
                    id="email"
                    name="email"
                    required
                    type="email"
                  />
                </div>
              </div>
              <PasswordField
                autoComplete="new-password"
                id="password"
                label="Crea una contraseña"
                minLength={8}
                name="password"
                required
              />
            </>
          )}
          <button className="button wide" type="submit">
            {user ? "Aceptar invitación" : "Crear cuenta y continuar"}
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </form>
      </section>
    </AuthExperience>
  );
}
