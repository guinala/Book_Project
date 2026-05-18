import { useState } from "react";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";

type FormInputProps = {
  type: "text" | "email" | "password" | "date";
  label: string;
  placeholder?: string;
  hint?: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
  max?: string;
  required?: boolean;
};

export default function FormInput({ type, label, placeholder, hint, error, registration, max, required }: FormInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;
  const inputId = registration.name;

  return (
    <div className="auth__field">
      <label className="auth__label" htmlFor={inputId}>
        {label}{required && <span className="auth__required">*</span>}
      </label>
      <div className={isPassword ? "auth__input-wrapper" : undefined}>
        <input
          id={inputId}
          className="auth__input"
          type={inputType}
          placeholder={placeholder}
          aria-invalid={error ? "true" : undefined}
          max={max}
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
            {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        )}
      </div>
      {hint && !error && <p className="auth__hint">{hint}</p>}
      {error && <p className="auth__error">{error.message}</p>}
    </div>
  );
}
