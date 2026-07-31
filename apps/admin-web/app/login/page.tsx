import Link from "next/link";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { AuthExperience } from "@/components/auth-experience";
import { PasswordField } from "@/components/password-field";
import { login } from "./actions";

export default async function Login({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthExperience>
      <form action={login} className="auth-form-card auth-login-card">
        <div className="auth-card-heading">
          <span className="auth-card-icon">
            <LockKeyhole aria-hidden="true" size={22} />
          </span>
          <div>
            <span className="eyebrow">Acceso seguro</span>
            <h1>Qué gusto verte</h1>
            <p className="muted">
              Ingresa al centro de operaciones de tu negocio.
            </p>
          </div>
        </div>
        {error ? (
          <p className="error" role="alert">
            Correo o contraseña incorrectos.
          </p>
        ) : null}
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
        <PasswordField
          autoComplete="current-password"
          id="password"
          label="Contraseña"
          name="password"
          required
        />
        <Link className="forgot" href="/recuperar-contrasena">
          ¿Olvidaste tu contraseña?
        </Link>
        <button className="button wide" type="submit">
          Entrar a CrediCel
          <ArrowRight aria-hidden="true" size={18} />
        </button>
        <div className="login-divider">
          <span>¿Primera vez aquí?</span>
        </div>
        <Link className="register-link" href="/registro-organizacion">
          Crear una organización
        </Link>
        <p className="login-help">
          <ShieldCheck aria-hidden="true" size={14} />
          Acceso protegido por roles y permisos
        </p>
      </form>
    </AuthExperience>
  );
}
