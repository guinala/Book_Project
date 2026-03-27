import { useTranslation } from "react-i18next";
import { getLangIso3Letters } from "@/utils/langConversion";

export function useCurrentLanguage() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) ?? "es";

  const langIso639_2 = getLangIso3Letters(lang);

  return { lang, langIso639_2 };
}