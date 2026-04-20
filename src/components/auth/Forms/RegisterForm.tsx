import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { logoutUser, registerWithEmail, sendVerificationEmail, isEmailInUse } from "@/services/firebase/firebase_auth";
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
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    defaultValues: { email: "", password: "", name: "", surname: "", birthDate: "" },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });
  const [firebaseError, setFirebaseError] = useState("");

  const maxBirthDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 13);
    return d.toISOString().split("T")[0];
  }, []);

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
      if (firebaseErr.code === "auth/email-already-in-use") {
        setError("email", { message: getFirebaseErrorMessage(firebaseErr.code) });
      } else {
        setFirebaseError(getFirebaseErrorMessage(firebaseErr.code ?? "unknown"));
      }
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

      <GoogleFormInput disabled={isSubmitting} />
      {/* <AppleFormInput disabled={isSubmitting} /> */}

      <form className="auth__form" onSubmit={handleSubmit(onSubmit)}>
        <FormInput
          type="text"
          label={t("auth.namePlaceholder")}
          required
          error={errors.name}
          registration={register("name", { required: t("authErrors.fieldRequired") })}
        />
        <FormInput
          type="text"
          label={t("auth.surnamePlaceholder")}
          required
          error={errors.surname}
          registration={register("surname", { required: t("authErrors.fieldRequired") })}
        />
        <FormInput
          type="date"
          label={t("auth.birthDatePlaceholder")}
          required
          error={errors.birthDate}
          max={maxBirthDate}
          registration={register("birthDate", {
            required: t("authErrors.fieldRequired"),
            validate: (value) => value <= maxBirthDate || t("authErrors.birthDate-min-age"),
          })}
        />
        <FormInput
          type="email"
          label={t("auth.emailPlaceholder")}
          required
          error={errors.email}
          registration={register("email", {
            required: t("authErrors.fieldRequired"),
            maxLength: { value: 254, message: t("authErrors.email-too-long") },
            pattern: { value: /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/, message: t("authErrors.auth/invalid-email") },
            validate: async (value) => {
              const inUse = await isEmailInUse(value);
              return inUse ? t("authErrors.auth/email-already-in-use") : true;
            },
          })}
        />
        <FormInput
          type="password"
          label={t("auth.passwordPlaceholder")}
          required
          hint={t("auth.passwordHint")}
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

      <AuthToggleLink
        text={t("auth.hasAccount")}
        linkText={t("auth.loginLink")}
        onClick={onSwitchToLogin}
      />
    </>
  );
}
