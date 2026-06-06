import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as SecureStore from "expo-secure-store";
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

export const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await SecureStore.getItemAsync(LANGUAGE_KEY);
    if (savedLanguage) {
      await i18n.changeLanguage(savedLanguage);
    } else {
      await i18n.changeLanguage("ta");
    }
  } catch (error) {
    console.log("Language load error:", error);
  }
};

export const changeLanguage = async (language: "en" | "ta") => {
  try {
    await i18n.changeLanguage(language);

    await SecureStore.setItemAsync(LANGUAGE_KEY, language);
  } catch (error) {
    console.log(error);
  }
};
export default i18n;
