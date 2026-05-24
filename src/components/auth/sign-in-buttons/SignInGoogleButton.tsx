import { useState } from "react";
import { useTranslation } from "react-i18next";
import { signInWithGoogle } from "@/services/firebase/firebaseAuth";
import { getFirebaseErrorMessage } from "@/services/firebase/firebaseErrors";
import { createUserProfile } from "@/services/firebase/firebaseUsers";

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
      const credential = await signInWithGoogle();
      const [firstName = "", ...rest] = (credential.user.displayName ?? "").split(" ");
      await createUserProfile(credential.user.uid, {
        email: credential.user.email ?? "",
        name: firstName,
        surname: rest.join(" "),
      });
    } catch (error) {
      onError?.(getFirebaseErrorMessage(error));
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
        src="/google-logo.svg"
        alt="Google"
      />
      {t("auth.googleBtn")}
    </button>
  );
}