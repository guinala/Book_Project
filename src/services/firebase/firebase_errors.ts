import i18n from "@/plugins/i18n/i18n";

export function getFirebaseErrorMessage(errorCode: string): string {
  const key = `authErrors.${errorCode}`;
  const translated = i18n.t(key);
  return translated === key
    ? i18n.t("authErrors.default", { code: errorCode })
    : translated;
}