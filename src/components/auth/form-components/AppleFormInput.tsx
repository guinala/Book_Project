import { useState } from "react";
import { useTranslation } from "react-i18next";
import SocialSignInButton from "../sign-in-buttons/SocialSignInButton";

type AppleFormInputProps = {
  disabled: boolean;
};

export default function AppleFormInput({ disabled }: AppleFormInputProps) {
  const [appleError, setAppleError] = useState("");
  const { t } = useTranslation();

  return (
    <>
      <div className="auth__divider">{t("auth.dividerOr")}</div>
      <SocialSignInButton provider="apple" disabled={disabled} onError={setAppleError} />
      {appleError && <p className="auth__error">{appleError}</p>}
    </>
  );
}
