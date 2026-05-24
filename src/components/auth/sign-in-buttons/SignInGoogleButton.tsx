import { useState } from "react";
import { useTranslation } from "react-i18next";
import { signInWithGoogle, logoutUser, getIsNewUser } from "@/services/firebase/firebaseAuth";
import { getFirebaseErrorMessage } from "@/services/firebase/firebaseErrors";
import { createUserProfile, userProfileExists } from "@/services/firebase/firebaseUsers";
import { CURRENT_TERMS_VERSION } from "@/services/legal/termsVersion";
import TermsConsentModal from "@/components/auth/TermsConsentModal";
import googleLogo from "../../../../public/google-logo.svg";

type SignInGoogleButtonProps = {
  disabled?: boolean;
  onError?: (message: string) => void;
}

type PendingUser = {
  uid: string;
  email: string;
  firstName: string;
  surname: string;
};

export default function SignInGoogleButton({ disabled, onError }: SignInGoogleButtonProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [pending, setPending] = useState<PendingUser | null>(null);
  const [accepting, setAccepting] = useState(false);

  async function handleGoogle() {
    setIsLoading(true);
    try {
      const credential = await signInWithGoogle();
      const [firstName = "", ...rest] = (credential.user.displayName ?? "").split(" ");
      const profileExists = await userProfileExists(credential.user.uid);
      const isFirstSignIn = getIsNewUser(credential) || !profileExists;

      if (isFirstSignIn) {
        setPending({
          uid: credential.user.uid,
          email: credential.user.email ?? "",
          firstName,
          surname: rest.join(" "),
        });
        return;
      }
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      onError?.(getFirebaseErrorMessage(firebaseError.code ?? "unknown"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAccept() {
    if (!pending) return;
    setAccepting(true);
    try {
      await createUserProfile(pending.uid, {
        email: pending.email,
        name: pending.firstName,
        surname: pending.surname,
        acceptedTermsAt: new Date().toISOString(),
        acceptedTermsVersion: CURRENT_TERMS_VERSION,
      });
      setPending(null);
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      onError?.(getFirebaseErrorMessage(firebaseError.code ?? "unknown"));
    } finally {
      setAccepting(false);
    }
  }

  async function handleCancel() {
    setPending(null);
    try {
      await logoutUser();
    } catch {
      // El usuario sigue logueado pero sin perfil.
    }
  }


  return (
    <>
      <button
        className="auth__btn-google"
        type="button"
        onClick={handleGoogle}
        disabled={disabled || isLoading}
      >
        <img src={googleLogo} alt="Google" />
        {t("auth.googleBtn")}
      </button>
      <TermsConsentModal
        open={pending !== null}
        isProcessing={accepting}
        onAccept={handleAccept}
        onCancel={handleCancel}
      />
    </>
  );
}