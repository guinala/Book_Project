import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { loginWithEmail, logoutUser, resetPassword, sendVerificationEmail } from "@/services/firebase/firebase_auth";
import type { LoginFormValues } from "@/types/AuthTypes";
import { getFirebaseErrorMessage } from "@/services/firebase/firebase_errors";
import FormInput from "@/components/auth/Form_Components/FormInput";
import GoogleFormInput from "@/components/auth/Form_Components/GoogleFormInput";
//import AppleFormInput from "@/components/Auth/Form_Components/AppleFormInput";
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
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  async function onSubmit(data: LoginFormValues) {
    setFirebaseError("");
    try {
      const credential = await loginWithEmail(data.email, data.password);
      if (!credential.user.emailVerified) {
        await sendVerificationEmail(credential.user); 
        await logoutUser();
        throw { code: "auth/email-not-verified" };
      }
    } catch (error: unknown) {
      const firebaseErr = error as { code?: string };
      setFirebaseError(getFirebaseErrorMessage(firebaseErr.code ?? "unknown"));
    }
  }

  async function handleReset() {
    if (!resetEmail) return;
    setResetLoading(true);
    setResetError("");
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch (error: unknown) {
      const e = error as { code?: string };
      setResetError(getFirebaseErrorMessage(e.code ?? "unknown"));
    } finally {
      setResetLoading(false);
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
            maxLength: { value: 254, message: t("authErrors.email-too-long") },
            pattern: { value: /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/, message: t("authErrors.auth/invalid-email") },
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
        
        <button type="button" className="auth__link" onClick={() => setShowReset(v => !v)}>
          {t("auth.forgotPassword")}
        </button>
      </form>

      {showReset && (
        <div className="auth__reset">
          {!resetSent ? (
            <>
              <p className="auth__reset-hint">{t("auth.resetInstructions")}</p>
              <input
                type="email"
                className="auth__input"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
              />
              <button type="button" className="auth__btn-secondary" onClick={handleReset} disabled={resetLoading}>
                {resetLoading ? t("auth.sending") : t("auth.sendResetEmail")}
              </button>
              {resetError && <p className="auth__error">{resetError}</p>}
            </>
          ) : (
            <p className="auth__success">{t("auth.resetPasswordSent")}</p>
          )}
        </div>
      )}

      <GoogleFormInput disabled={isSubmitting} />
      {/* <AppleFormInput disabled={isSubmitting} /> */}

      <AuthToggleLink
        text={t("auth.noAccount")}
        linkText={t("auth.registerLink")}
        onClick={onSwitchToRegister}
      />
    </>
  );
}
