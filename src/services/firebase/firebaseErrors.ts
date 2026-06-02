import { FirebaseError } from "firebase/app";
import i18n from "@/plugins/i18n/i18n";

function extractErrorCode(error: unknown): string {
  if (error instanceof FirebaseError) return error.code;
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return "unknown";
}

export function getFirebaseErrorMessage(error: unknown): string {
  const code = extractErrorCode(error);
  const key = `authErrors.${code}`;
  const translated = i18n.t(key);
  return translated === key
    ? i18n.t("authErrors.default", { code })
    : translated;
}

export class EmailNotVerifiedError extends Error {
  readonly code = "auth/email-not-verified" as const;
  constructor() {
    super("Email not verified");
    this.name = "EmailNotVerifiedError";
  }
}
