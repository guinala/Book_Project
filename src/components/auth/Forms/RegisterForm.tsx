import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { logoutUser, registerWithEmail, sendVerificationEmail } from "@/services/firebase/firebase_auth";
import type { RegisterFormValues } from "@/types/AuthTypes";
import { createUserProfile } from "@/services/firebase/firebase_users";
import { getFirebaseErrorMessage } from "@/services/firebase/firebase_errors";
import FormInput from "@/components/auth/Form_Components/FormInput";
import GoogleFormInput from "@/components/auth/Form_Components/GoogleFormInput";
//import AppleFormInput from "@/components/auth/Form_Components/AppleFormInput";
import AuthToggleLink from "@/components/auth/Form_Components/AuthToggleLink";

type RegisterFormProps = {
  onSwitchToLogin: () => void;
};

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    defaultValues: { email: "", password: "", name: "", surname: "", birthDate: "" },
  });
  const [firebaseError, setFirebaseError] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  async function onSubmit(data: RegisterFormValues) {
    setFirebaseError("");
    try {
      const credential = await registerWithEmail(data.email, data.password);
      try {
        await createUserProfile(credential.user.uid, {
          email: data.email, name: data.name, surname: data.surname, birthDate: data.birthDate,
        });
      } catch (profileError) {
        await credential.user.delete();
        throw profileError;
      }
      await sendVerificationEmail(credential.user);
      await logoutUser();
      setSentEmail(data.email);
      setVerificationSent(true);
    } catch (error: unknown) {
      const firebaseErr = error as { code?: string };
      setFirebaseError(getFirebaseErrorMessage(firebaseErr.code ?? "unknown"));
    }
  }

  if (verificationSent) {
    return (
      <>
        <h2 className="auth__title">{t("auth.verificationSentTitle")}</h2>
        <p className="auth__description">{t("auth.verificationSentBody", { email: sentEmail })}</p>
        <button className="auth__btn-secondary" type="button" onClick={onSwitchToLogin}>
          {t("auth.backToLogin")}
        </button>
      </>
    );
  }

  return (
    <>
      <h2 className="auth__title">{t("auth.registerTitle")}</h2>

      <form className="auth__form" onSubmit={handleSubmit(onSubmit)}>
        <FormInput
          type="text"
          label={t("auth.namePlaceholder")}
          placeholder={t("auth.namePlaceholder")}
          error={errors.name}
          registration={register("name", { required: t("authErrors.fieldRequired") })}
        />
        <FormInput
          type="text"
          label={t("auth.surnamePlaceholder")}
          placeholder={t("auth.surnamePlaceholder")}
          error={errors.surname}
          registration={register("surname", { required: t("authErrors.fieldRequired") })}
        />
        <FormInput
          type="date"
          label={t("auth.birthDatePlaceholder")}
          placeholder={t("auth.birthDatePlaceholder")}
          error={errors.birthDate}
          registration={register("birthDate", { required: t("authErrors.fieldRequired") })}
        />
        <FormInput
          type="email"
          label={t("auth.emailPlaceholder")}
          placeholder={t("auth.emailPlaceholder")}
          error={errors.email}
          registration={register("email", {
            required: t("authErrors.fieldRequired"),
            maxLength: { value: 254, message: t("authErrors.email-too-long") },
            pattern: { value: /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/, message: t("authErrors.auth/invalid-email") },
          })}
        />
        <FormInput
          type="password"
          label={t("auth.passwordHint")}
          placeholder={t("auth.passwordHint")}
          error={errors.password}
          registration={register("password", {
            required: t("authErrors.fieldRequired"),
            minLength: { value: 8, message: t("authErrors.auth/weak-password") },
            validate: {
              hasUppercase: (v) => /[A-Z]/.test(v) || t("authErrors.password-no-uppercase"),
              hasNumber: (v) => /[0-9]/.test(v) || t("authErrors.password-no-number"),
            },
          })}
        />

        <button className="auth__btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("auth.registering") : t("auth.registerBtn")}
        </button>

        {firebaseError && <p className="auth__error">{firebaseError}</p>}
      </form>

      <GoogleFormInput disabled={isSubmitting} />
      {/* <AppleFormInput disabled={isSubmitting} /> */}

      <AuthToggleLink
        text={t("auth.hasAccount")}
        linkText={t("auth.loginLink")}
        onClick={onSwitchToLogin}
      />
    </>
  );
}
