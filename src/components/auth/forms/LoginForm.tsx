import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { loginWithEmail, logoutUser, resetPassword, sendVerificationEmail } from "@/services/firebase/firebaseAuth";
import type { LoginFormValues } from "@/types/AuthTypes";
import { getFirebaseErrorMessage } from "@/services/firebase/firebaseErrors";
import FormInput from "@/components/auth/form-components/FormInput";
import GoogleFormInput from "@/components/auth/form-components/GoogleFormInput";

type LoginFormProps = {
  onSwitchToRegister?: () => void;
};

export default function LoginForm({ onSwitchToRegister: _unused }: LoginFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });
  const [firebaseError, setFirebaseError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  async function onSubmit(data: LoginFormValues) {
    setFirebaseError("");
    try {
      const credential = await loginWithEmail(data.email, data.password, rememberMe);
      if (!credential.user.emailVerified) {
        await sendVerificationEmail(credential.user);
        await logoutUser();
        throw { code: "auth/email-not-verified" };
      }
      navigate("/explore", { replace: true });
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
      <GoogleFormInput disabled={isSubmitting} />
      {/* <AppleFormInput disabled={isSubmitting} /> */}

      <form className="auth__form" onSubmit={handleSubmit(onSubmit)}>
        <FormInput
          type="email"
          label={t("auth.emailPlaceholder")}
          error={errors.email}
          registration={register("email", {
            required: t("authErrors.fieldRequired"),
            maxLength: { value: 254, message: t("authErrors.email-too-long") },
            pattern: { value: /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/, message: t("authErrors.auth/invalid-email") },
          })}
        />
        <FormInput
          type="password"
          label={t("auth.passwordPlaceholder")}
          error={errors.password}
          registration={register("password", {
            required: t("authErrors.fieldRequired"),
          })}
        />

        <div className="auth__remember-row">
          <div className="auth__remember">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="rememberMe">{t("auth.rememberMe")}</label>
          </div>
          <button type="button" className="auth__link" onClick={() => setShowReset(v => !v)}>
            {t("auth.forgotPassword")}
          </button>
        </div>

        <button className="auth__btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("auth.loggingIn") : t("auth.loginBtn")}
        </button>

        {firebaseError && <p className="auth__error">{firebaseError}</p>}
      </form>

      {showReset && (
        <div className="auth__reset">
          {!resetSent ? (
            <>
              <p className="auth__reset-hint">{t("auth.resetInstructions")}</p>
              <label className="auth__label" htmlFor="resetEmail">{t("auth.emailPlaceholder")}</label>
              <input
                id="resetEmail"
                type="email"
                className="auth__input"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
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
    </>
  );
}
