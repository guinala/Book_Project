import { useTranslation } from "react-i18next";

export function useCurrentLanguage() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) ?? "es";

  const langIso639_2 = lang === "en" ? "eng" : "spa";

  return { lang, langIso639_2 };
}