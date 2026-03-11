import { useTranslation } from "react-i18next";
import { getLangIso639_2 } from "../../utils/langConversion";

export function useCurrentLanguage() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) ?? "es";

  const langIso639_2 = getLangIso639_2(lang);

  return { lang, langIso639_2 };
}