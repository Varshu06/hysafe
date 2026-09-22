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

  lng: "en",
  fallbackLng: "en",

  interpolation: {
    escapeValue: false,
  },
});

export const getSavedLanguage = async () => {
  return await AsyncStorage.getItem(LANGUAGE_KEY);
};

export const loadSavedLanguage = async () => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved === "en" || saved === "ta") {
      await i18n.changeLanguage(saved);
      return saved;
    }
  } catch (error) {
    console.warn("[i18n] Failed to load saved language:", error);
  }
  return i18n.language;
};

// Immediately attempt to load saved language on module load
loadSavedLanguage();

export const changeLanguage = async (language: "en" | "ta") => {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
};
export default i18n;
