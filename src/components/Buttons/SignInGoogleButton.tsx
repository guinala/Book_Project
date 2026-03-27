import { useState } from "react";
import { useTranslation } from "react-i18next";
import { loginWithGoogle } from "@/services/firebase/firebase_auth";
import { getFirebaseErrorMessage } from "@/services/firebase/firebase_errors";

type SignInGoogleButtonProps = {
  disabled?: boolean;
  onError?: (message: string) => void;
}

export default function SignInGoogleButton({ disabled, onError }: SignInGoogleButtonProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleGoogle() {
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      onError?.(getFirebaseErrorMessage(firebaseError.code ?? "unknown"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      className="auth__btn-google"
      type="button"
      onClick={handleGoogle}
      disabled={disabled || isLoading}
    >
      <img
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google"
      />
      {t("auth.googleBtn")}
    </button>
  );
}