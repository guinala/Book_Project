import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

type FormInputProps = {
  type: "text" | "email" | "password" | "date";
  placeholder: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
};

export default function FormInput({ type, placeholder, error, registration }: FormInputProps) {
  return (
    <>
      <input
        className="auth__input"
        type={type}
        placeholder={placeholder}
        aria-invalid={error ? "true" : undefined}
        {...registration}
      />
      {error && <p className="auth__error">{error.message}</p>}
    </>
  );
}
