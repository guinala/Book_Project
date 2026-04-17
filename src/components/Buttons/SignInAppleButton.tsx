import { useState } from "react";
import { useTranslation } from "react-i18next";
import { signInWithApple } from "@/services/firebase/firebase_auth";
import { createUserProfile } from "@/services/firebase/firebase_users";
import { getFirebaseErrorMessage } from "@/services/firebase/firebase_errors";

type SignInAppleButtonProps = {
  disabled?: boolean;
  onError?: (message: string) => void;
}

export default function SignInAppleButton({ disabled, onError }: SignInAppleButtonProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleApple() {
    setIsLoading(true);
    try {
      const credential = await signInWithApple();
      await createUserProfile(credential.user.uid, {
        email: credential.user.email ?? "",
        name: credential.user.displayName ?? "",
      });
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      onError?.(getFirebaseErrorMessage(firebaseError.code ?? "unknown"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      className="auth__btn-apple"
      type="button"
      onClick={handleApple}
      disabled={disabled || isLoading}
    >
      <svg width="16" height="16" viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-47.4-150.9-116.1c-51-75.1-92.3-188.6-92.3-296.6 0-164 107.3-250.8 212.8-250.8 56.4 0 103.4 37.2 138.4 37.2 33.4 0 85.7-39.5 148.1-39.5 23.9 0 108.2 2 165.3 80.4zm-160.4-166c31.5-37.3 54.3-88.9 54.3-140.5 0-7.1-.6-14.3-1.9-20.1-51.6 2-112.3 34.4-149.2 77.3-28.5 32.6-55.1 83.5-55.1 135.8 0 7.7 1.3 15.5 1.9 17.9 3.2.6 8.4 1.3 13.6 1.3 46.5 0 102.5-30.9 136.4-71.7z"/>
      </svg>
      {t("auth.appleBtn")}
    </button>
  );
}
