import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { loginWithEmail } from "@/services/firebase/firebase_auth";
import type { LoginFormValues } from "@/types/AuthTypes";
import { getFirebaseErrorMessage } from "@/services/firebase/firebase_errors";
import FormInput from "@/components/auth/Form_Components/FormInput";
import GoogleFormInput from "@/components/auth/Form_Components/GoogleFormInput";
import AuthToggleLink from "@/components/auth/Form_Components/AuthToggleLink";

type LoginFormProps = {
  onSwitchToRegister: () => void;
};

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    defaultValues: { email: "", password: "" },
  });
  const [firebaseError, setFirebaseError] = useState("");

  async function onSubmit(data: LoginFormValues) {
    setFirebaseError("");
    try {
      await loginWithEmail(data.email, data.password);
    } catch (error: unknown) {
      const firebaseErr = error as { code?: string };
      setFirebaseError(getFirebaseErrorMessage(firebaseErr.code ?? "unknown"));
    }
  }

  return (
    <>
      <h2 className="auth__title">{t("auth.loginTitle")}</h2>

      <form className="auth__form" onSubmit={handleSubmit(onSubmit)}>
        <FormInput
          type="email"
          placeholder={t("auth.emailPlaceholder")}
          error={errors.email}
          registration={register("email", {
            required: t("authErrors.fieldRequired"),
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t("authErrors.auth/invalid-email") },
          })}
        />
        <FormInput
          type="password"
          placeholder={t("auth.passwordPlaceholder")}
          error={errors.password}
          registration={register("password", {
            required: t("authErrors.fieldRequired"),
          })}
        />

        <button className="auth__btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("auth.loggingIn") : t("auth.loginBtn")}
        </button>

        {firebaseError && <p className="auth__error">{firebaseError}</p>}
      </form>

      <GoogleFormInput disabled={isSubmitting} />

      <AuthToggleLink
        text={t("auth.noAccount")}
        linkText={t("auth.registerLink")}
        onClick={onSwitchToRegister}
      />
    </>
  );
}
