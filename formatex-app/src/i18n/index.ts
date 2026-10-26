import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { readPersistedSettings } from "@/lib/persistedSettings"
import enLocale from "./locales/en.json"
import faLocale from "./locales/fa.json"
import { DEFAULT_LANGUAGE, directionOf, isSupportedLanguage, type AppLanguage } from "./languages"

export * from "./languages"

/** Saved choice, else the browser's language when we have it, else the default. */
function detectInitialLanguage(): AppLanguage {
  const saved = readPersistedSettings().language
  if (isSupportedLanguage(saved)) return saved
  const browser = typeof navigator !== "undefined" ? navigator.language.split("-")[0] : ""
  return isSupportedLanguage(browser) ? browser : DEFAULT_LANGUAGE
}

/** Keeps the document's direction and `lang` attribute in step with the interface language. */
export function applyLanguageSettings(language: AppLanguage): void {
  if (typeof document === "undefined") return
  document.documentElement.dir = directionOf(language)
  document.documentElement.lang = language
}

const initialLanguage = detectInitialLanguage()

void i18n.use(initReactI18next).init({
  resources: {
    fa: { translation: faLocale },
    en: { translation: enLocale },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
})

applyLanguageSettings(initialLanguage)
i18n.on("languageChanged", (language) => {
  if (isSupportedLanguage(language)) applyLanguageSettings(language)
})

export default i18n
