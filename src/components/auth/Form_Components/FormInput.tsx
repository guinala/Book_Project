import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

type FormInputProps = {
  type: "text" | "email" | "password" | "date";
  label: string;
  placeholder?: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
};

export default function FormInput({ type, label, placeholder, error, registration }: FormInputProps) {
  return (
    <div className="auth__field">
      <label htmlFor={registration.name} className="auth__label">{label}</label>
      <input
        id={registration.name}
        className="auth__input"
        type={type}
        placeholder={placeholder}
        aria-invalid={error ? "true" : undefined}
        {...registration}
      />
      {error && <p className="auth__error" role="alert">{error.message}</p>}
    </div>
  );
}
