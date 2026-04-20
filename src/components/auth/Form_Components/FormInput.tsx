import { useState } from "react";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

type FormInputProps = {
  type: "text" | "email" | "password" | "date";
  label: string;
  placeholder?: string;
  hint?: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
};

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function FormInput({ type, placeholder, hint, error, registration }: FormInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;
  const inputId = registration.name;

  return (
    <div className="auth__field">
      <label className="auth__label" htmlFor={inputId}>{placeholder}</label>
      <div className={isPassword ? "auth__input-wrapper" : undefined}>
        <input
          id={inputId}
          className="auth__input"
          type={inputType}
          aria-invalid={error ? "true" : undefined}
          {...registration}
        />
        {isPassword && (
          <button
            type="button"
            className="auth__input-toggle"
            onClick={() => setShowPassword(v => !v)}
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeIcon /> : <EyeOffIcon />}
          </button>
        )}
      </div>
      {hint && !error && <p className="auth__hint">{hint}</p>}
      {error && <p className="auth__error">{error.message}</p>}
    </div>
  );
}
