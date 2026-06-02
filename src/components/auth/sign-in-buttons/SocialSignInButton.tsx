import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { UserCredential } from "firebase/auth";
import {
  signInWithApple,
  signInWithGoogle,
  logoutUser,
  getIsNewUser,
} from "@/services/firebase/firebaseAuth";
import { getFirebaseErrorMessage } from "@/services/firebase/firebaseErrors";
import { createUserProfile, userProfileExists } from "@/services/firebase/firebaseUsers";
import { CURRENT_TERMS_VERSION } from "@/services/legal/termsVersion";
import TermsConsentModal from "@/components/auth/TermsConsentModal";
import { setUsername } from "@/services/firebase/firebaseUsernames";
import UsernameSetupModal from "../UsernameSetupModal";

type Provider = "google" | "apple";

type ProviderConfig = {
  signIn: () => Promise<UserCredential>;
  className: string;
  labelKey: string;
  icon: React.ReactNode;
};

const PROVIDER_CONFIG: Record<Provider, ProviderConfig> = {
  google: {
    signIn: signInWithGoogle,
    className: "auth__btn-google",
    labelKey: "auth.googleBtn",
    icon: <img src="/google-logo.svg" alt="" />,
  },
  apple: {
    signIn: signInWithApple,
    className: "auth__btn-apple",
    labelKey: "auth.appleBtn",
    icon: (
      <svg width="16" height="16" viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-47.4-150.9-116.1c-51-75.1-92.3-188.6-92.3-296.6 0-164 107.3-250.8 212.8-250.8 56.4 0 103.4 37.2 138.4 37.2 33.4 0 85.7-39.5 148.1-39.5 23.9 0 108.2 2 165.3 80.4zm-160.4-166c31.5-37.3 54.3-88.9 54.3-140.5 0-7.1-.6-14.3-1.9-20.1-51.6 2-112.3 34.4-149.2 77.3-28.5 32.6-55.1 83.5-55.1 135.8 0 7.7 1.3 15.5 1.9 17.9 3.2.6 8.4 1.3 13.6 1.3 46.5 0 102.5-30.9 136.4-71.7z"/>
      </svg>
    ),
  },
};

type SocialSignInButtonProps = {
  provider: Provider;
  disabled?: boolean;
  onError?: (message: string) => void;
};

type PendingUser = {
  uid: string;
  email: string;
  firstName: string;
  surname: string;
};

export default function SocialSignInButton({ provider, disabled, onError }: SocialSignInButtonProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [pending, setPending] = useState<PendingUser | null>(null);
  const [step, setStep] = useState<"terms" | "username">("terms");
  const [processing, setProcessing] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const config = PROVIDER_CONFIG[provider];

  async function handleSignIn() {
    setIsLoading(true);
    try {
      const credential = await config.signIn();
      const [firstName = "", ...rest] = (credential.user.displayName ?? "").split(" ");
      const profileExists = await userProfileExists(credential.user.uid);
      const isFirstSignIn = getIsNewUser(credential) || !profileExists;

      if (isFirstSignIn) {
        setStep("terms");
        setUsernameError("");
        setPending({
          uid: credential.user.uid,
          email: credential.user.email ?? "",
          firstName,
          surname: rest.join(" "),
        });
        return;
      }
    } catch (error) {
      onError?.(getFirebaseErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  function handleAcceptTerms() {
    setUsernameError("");
    setStep("username");
  }

  async function handleSubmitUsername(username: string) {
    if (!pending) {
      return;
    }
    setProcessing(true);
    setUsernameError("");

    try {
      await createUserProfile(pending.uid, {
        email: pending.email,
        name: pending.firstName,
        surname: pending.surname,
        acceptedTermsAt: new Date().toISOString(),
        acceptedTermsVersion: CURRENT_TERMS_VERSION,
      });
      await setUsername(pending.uid, username);
      setPending(null);
    } catch (error) {
      if (error instanceof Error && error.message === "USERNAME_TAKEN") {
        setUsernameError(t("authErrors.username-taken"));
      } else {
        onError?.(getFirebaseErrorMessage(error));
      }
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel() {
    setPending(null);
    setUsernameError("");
    try {
      await logoutUser();
    } catch {
      // El usuario sigue logueado pero sin perfil.
    }
  }

  return (
    <>
      <button
        className={config.className}
        type="button"
        onClick={handleSignIn}
        disabled={disabled || isLoading}
      >
        {config.icon}
        {t(config.labelKey)}
      </button>
      <TermsConsentModal
        open={pending !== null && step === "terms"}
        isProcessing={false}
        onAccept={handleAcceptTerms}
        onCancel={handleCancel}
      />
      <UsernameSetupModal
        open={pending !== null && step === "username"}
        uid={pending?.uid ?? ""}
        isProcessing={processing}
        error={usernameError}
        onSubmit={handleSubmitUsername}
        onCancel={handleCancel}
      />
    </>
  );
}
