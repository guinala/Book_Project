import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import es from "./locales/es.json";
import en from "./locales/en.json";

i18n
  .use(LanguageDetector)       // detecta idioma del navegador
  .use(initReactI18next)       // conecta con React
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    fallbackLng: "es",         // si el navegador tiene "fr", "de", etc. → español
    supportedLngs: ["es", "en"],
    interpolation: {
      escapeValue: false,      // React ya escapa por defecto
    },
    detection: {
      order: ["navigator"],    // solo mira el idioma del navegador
    },
  });

export default i18n;