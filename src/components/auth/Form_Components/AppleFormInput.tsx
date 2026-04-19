import { useState } from "react";
import SignInAppleButton from "@/components/Buttons/SignInAppleButton";
import { useTranslation } from "react-i18next";

type AppleFormInputProps = {
  disabled: boolean;
};

export default function AppleFormInput({ disabled }: AppleFormInputProps) {
  const [appleError, setAppleError] = useState("");
  const { t } = useTranslation();

  return (
    <>
      <div className="auth__divider">{t("auth.dividerOr")}</div>
      <SignInAppleButton disabled={disabled} onError={setAppleError} />
      {appleError && <p className="auth__error">{appleError}</p>}
    </>
  );
}
