import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enNavbar from "./locales/en/navbar.json";
import enLanding from "./locales/en/landing.json";
import enAuth from "./locales/en/auth.json";
import enExplore from "./locales/en/explore.json";
import enMyLibrary from "./locales/en/myLibrary.json";
import enBook from "./locales/en/book.json";
import enErrors from "./locales/en/errors.json";
import enFooter from "./locales/en/footer.json";
import enBookDetail from "./locales/en/bookDetail.json";
import enProfile from "./locales/en/profile.json";
import enNotifications from "./locales/en/notifications.json";
import enToasts from "./locales/en/toasts.json";
import enLegal from "./locales/en/legal.json";

import esNavbar from "./locales/es/navbar.json";
import esLanding from "./locales/es/landing.json";
import esAuth from "./locales/es/auth.json";
import esExplore from "./locales/es/explore.json";
import esMyLibrary from "./locales/es/myLibrary.json";
import esBook from "./locales/es/book.json";
import esErrors from "./locales/es/errors.json";
import esFooter from "./locales/es/footer.json";
import esBookDetail from "./locales/es/bookDetail.json";
import esProfile from "./locales/es/profile.json";
import esNotifications from "./locales/es/notifications.json";
import esToasts from "./locales/es/toasts.json";
import esLegal from "./locales/es/legal.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          ...enNavbar,
          ...enLanding,
          ...enAuth,
          ...enExplore,
          ...enMyLibrary,
          ...enBook,
          ...enErrors,
          ...enFooter,
          ...enBookDetail,
          ...enProfile,
          ...enNotifications,
          ...enToasts,
          ...enLegal,
        },
      },
      es: {
        translation: {
          ...esNavbar,
          ...esLanding,
          ...esAuth,
          ...esExplore,
          ...esMyLibrary,
          ...esBook,
          ...esErrors,
          ...esFooter,
          ...esBookDetail,
          ...esProfile,
          ...esNotifications,
          ...esToasts,
          ...esLegal,
        },
      },
    },
    fallbackLng: "es",
    supportedLngs: ["es", "en"],
    load: "languageOnly",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["navigator"],
    },
  });

export default i18n;
