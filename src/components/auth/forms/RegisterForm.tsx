import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { logoutUser, registerWithEmail, sendVerificationEmail, isEmailInUse } from "@/services/firebase/firebaseAuth";
import type { RegisterFormValues } from "@/types/AuthTypes";
import { createUserProfile } from "@/services/firebase/firebaseUsers";
import { getFirebaseErrorMessage } from "@/services/firebase/firebaseErrors";
import FormInput from "@/components/auth/form-components/FormInput";
import GoogleFormInput from "@/components/auth/form-components/GoogleFormInput";
import { CURRENT_TERMS_VERSION } from "@/services/legal/termsVersion";

export default function RegisterForm() {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    defaultValues: { email: "", password: "", name: "", surname: "", birthDate: "", acceptedTerms: false },
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
          email: data.email, 
          name: data.name, 
          surname: data.surname, 
          birthDate: data.birthDate,
          acceptedTermsAt: new Date().toISOString(),
          acceptedTermsVersion: CURRENT_TERMS_VERSION,
        });
      } catch (profileError) {
        await credential.user.delete();
        throw profileError;
      }
      await sendVerificationEmail(credential.user);
      await logoutUser();
      setSentEmail(data.email);
      setVerificationSent(true);
    } catch (error) {
      setFirebaseError(getFirebaseErrorMessage(error));
    }
  }

  if (verificationSent) {
    return (
      <>
        <h2 className="auth__title">{t("auth.verificationSentTitle")}</h2>
        <p className="auth__description">{t("auth.verificationSentBody", { email: sentEmail })}</p>
      </>
    );
  }

  return (
    <>
      <GoogleFormInput disabled={isSubmitting} />

      <form className="auth__form" onSubmit={handleSubmit(onSubmit)}>
        <div className="auth__name-row">
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
        </div>
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
              return inUse ? t("authErrors.email-already-in-use-field") : true;
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

        <label className="auth__remember auth__terms-row">
          <input
            type="checkbox"
            {...register("acceptedTerms", {
              required: t("authErrors.terms-required"),
            })}
          />
          <span>
            <Trans
              i18nKey="auth.acceptTermsLabel"
              components={{
                terms: (
                  <a
                    className="auth__terms-link"
                    href="/legal/terms"
                    target="_blank"
                    rel="noreferrer noopener"
                  />
                ),
                privacy: (
                  <a
                    className="auth__terms-link"
                    href="/legal/privacy"
                    target="_blank"
                    rel="noreferrer noopener"
                  />
                ),
              }}
            />
          </span>
        </label>

        {errors.acceptedTerms && (
          <p className="auth__error" role="alert">{errors.acceptedTerms.message}</p>
        )}

        <button className="auth__btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("auth.registering") : t("auth.registerBtn")}
        </button>

        {firebaseError && <p className="auth__error">{firebaseError}</p>}
      </form>
    </>
  );
}
