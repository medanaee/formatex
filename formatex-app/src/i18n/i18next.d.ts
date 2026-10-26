import "i18next"
import type enLocale from "./locales/en.json"

// Makes `t("...")` check its key against en.json at compile time
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation"
    resources: { translation: typeof enLocale }
  }
}
