import { KeyRound, Save } from "lucide-react";
import { AuthExperience } from "@/components/auth-experience";
import { PasswordField } from "@/components/password-field";
import { updatePassword } from "./actions";

export default async function NewPassword({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthExperience
      compact
      description="Crea una nueva clave para volver a tu espacio de trabajo con la misma seguridad de siempre."
      eyebrow="Seguridad de la cuenta"
      title="Una clave nueva. Tu operación intacta."
    >
      <form action={updatePassword} className="auth-form-card">
        <div className="auth-card-heading">
          <span className="auth-card-icon">
            <KeyRound aria-hidden="true" size={22} />
          </span>
          <div>
            <span className="eyebrow">Nueva contraseña</span>
            <h1>Protege tu cuenta</h1>
            <p className="muted">
              Utiliza al menos 10 caracteres difíciles de adivinar.
            </p>
          </div>
        </div>
        {error && (
          <p className="error" role="alert">
            Las contraseñas no coinciden o el enlace ya expiró.
          </p>
        )}
        <PasswordField
          autoComplete="new-password"
          id="password"
          label="Nueva contraseña"
          minLength={10}
          name="password"
          required
        />
        <PasswordField
          autoComplete="new-password"
          id="confirmation"
          label="Confirmar contraseña"
          minLength={10}
          name="confirmation"
          required
        />
        <button className="button wide" type="submit">
          Guardar contraseña <Save aria-hidden="true" size={17} />
        </button>
      </form>
    </AuthExperience>
  );
}
