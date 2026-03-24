import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { registerWithEmail } from "../../../services/firebase/firebase_auth";
import type { RegisterFormValues } from "../../../types/AuthTypes";
import { createUserProfile } from "../../../services/firebase/firebase_users";
import { getFirebaseErrorMessage } from "../../../services/firebase/firebase_errors";
import FormInput from "../Form_Components/FormInput";
import GoogleFormInput from "../Form_Components/GoogleFormInput";
import AuthToggleLink from "../Form_Components/AuthToggleLink";

type RegisterFormProps = {
  onSwitchToLogin: () => void;
};

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    defaultValues: { email: "", password: "", name: "", surname: "", birthDate: "" },
  });
  const [firebaseError, setFirebaseError] = useState("");

  async function onSubmit(data: RegisterFormValues) {
    setFirebaseError("");
    try {
      const credential = await registerWithEmail(data.email, data.password);
      try {
        await createUserProfile(credential.user.uid, {
          email: data.email,
          name: data.name,
          surname: data.surname,
          birthDate: data.birthDate,
        });
      } catch (profileError) {
        await credential.user.delete();
        throw profileError;
      }
    } catch (error: unknown) {
      const firebaseErr = error as { code?: string };
      setFirebaseError(getFirebaseErrorMessage(firebaseErr.code ?? "unknown"));
    }
  }

  return (
    <>
      <h2 className="auth__title">{t("auth.registerTitle")}</h2>

      <form className="auth__form" onSubmit={handleSubmit(onSubmit)}>
        <FormInput
          type="text"
          placeholder={t("auth.namePlaceholder")}
          error={errors.name}
          registration={register("name", { required: t("authErrors.fieldRequired") })}
        />
        <FormInput
          type="text"
          placeholder={t("auth.surnamePlaceholder")}
          error={errors.surname}
          registration={register("surname", { required: t("authErrors.fieldRequired") })}
        />
        <FormInput
          type="date"
          placeholder={t("auth.birthDatePlaceholder")}
          error={errors.birthDate}
          registration={register("birthDate", { required: t("authErrors.fieldRequired") })}
        />
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
          placeholder={t("auth.passwordHint")}
          error={errors.password}
          registration={register("password", {
            required: t("authErrors.fieldRequired"),
            minLength: { value: 6, message: t("authErrors.auth/weak-password") },
          })}
        />

        <button className="auth__btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("auth.registering") : t("auth.registerBtn")}
        </button>

        {firebaseError && <p className="auth__error">{firebaseError}</p>}
      </form>

      <GoogleFormInput disabled={isSubmitting} />

      <AuthToggleLink
        text={t("auth.hasAccount")}
        linkText={t("auth.loginLink")}
        onClick={onSwitchToLogin}
      />
    </>
  );
}
