import { useState } from "react";
import { useTranslation } from "react-i18next";
import SocialSignInButton from "../sign-in-buttons/SocialSignInButton";

type GoogleFormInputProps = {
  disabled: boolean;
};

export default function GoogleFormInput({ disabled }: GoogleFormInputProps) {
  const [googleError, setGoogleError] = useState("");
  const { t } = useTranslation();

  return (
    <div className="auth__google-group">
      <SocialSignInButton provider="google" disabled={disabled} onError={setGoogleError} />
      {googleError && <p className="auth__error">{googleError}</p>}
      <div className="auth__divider">{t("auth.dividerOr")}</div>
    </div>
  );
}
