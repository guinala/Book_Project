import { useState } from "react";
import AuthDivider from "../AuthDivider/AuthDivider";
import SignInGoogleButton from "../../Buttons/SignInGoogleButton";

type GoogleFormInputProps = {
  disabled: boolean;
};

export default function GoogleFormInput({ disabled }: GoogleFormInputProps) {
  const [googleError, setGoogleError] = useState("");

  return (
    <>
      <AuthDivider />
      <SignInGoogleButton disabled={disabled} onError={setGoogleError} />
      {googleError && <p className="auth__error">{googleError}</p>}
    </>
  );
}
