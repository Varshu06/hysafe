import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "./locales/en.json";
import ta from "./locales/ta.json";

const LANGUAGE_KEY = "language";

const resources = {
  en: {
    translation: en,
  },
  ta: {
    translation: ta,
  },
};

i18n.use(initReactI18next).init({
  compatibilityJSON: "v4",

  resources,

  lng: "ta",
  fallbackLng: "ta",

  interpolation: {
    escapeValue: false,
  },
});

export const getSavedLanguage = async () => {
  return await AsyncStorage.getItem(LANGUAGE_KEY);
};

export const changeLanguage = async (language: "en" | "ta") => {
  await i18n.changeLanguage(language);

  await AsyncStorage.setItem(LANGUAGE_KEY, language);
};
export default i18n;
