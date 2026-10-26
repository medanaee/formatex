/**
 * The languages of the interface. To add one: add it here, add `locales/<code>.json` with the same keys as `en.json`
 * (a test checks that), and register it in `i18n/index.ts`. Direction comes from this table, never from a language code check.
 */
export const LANGUAGES = {
  fa: { label: "فارسی", dir: "rtl" },
  en: { label: "English", dir: "ltr" },
} as const

export type AppLanguage = keyof typeof LANGUAGES
export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES) as AppLanguage[]
export const DEFAULT_LANGUAGE: AppLanguage = "fa"

export const isSupportedLanguage = (value: unknown): value is AppLanguage =>
  typeof value === "string" && value in LANGUAGES

export const directionOf = (language: AppLanguage): "rtl" | "ltr" => LANGUAGES[language].dir
