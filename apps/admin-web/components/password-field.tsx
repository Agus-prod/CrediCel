"use client";

import type { InputHTMLAttributes } from "react";
import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

interface PasswordFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "name" | "type"
> {
  readonly id: string;
  readonly label: string;
  readonly name: string;
}

export function PasswordField({
  id,
  label,
  name,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-control auth-control-password">
        <LockKeyhole aria-hidden="true" size={18} />
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          {...props}
        />
        <button
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="auth-password-toggle"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? (
            <EyeOff aria-hidden="true" size={18} />
          ) : (
            <Eye aria-hidden="true" size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
