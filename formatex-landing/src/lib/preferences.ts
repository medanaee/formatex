import { useCallback, useEffect, useState } from "react"
import type { Lang } from "@/content"

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // A private window may refuse storage: the choice just lasts until the page closes
  }
}

/** The language of the page (English first, Persian on the toggle) and its direction on `<html>`. */
export function useLang(): [Lang, () => void] {
  const [lang, setLang] = useState<Lang>(() => (read("formatex-landing-lang") === "fa" ? "fa" : "en"))
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr"
    document.title = lang === "fa" ? "فرمتکس: مارک‌داون به PDF دوزبانه" : "Formatex: Markdown to bilingual PDF"
    write("formatex-landing-lang", lang)
  }, [lang])
  return [lang, useCallback(() => setLang((current) => (current === "fa" ? "en" : "fa")), [])]
}
