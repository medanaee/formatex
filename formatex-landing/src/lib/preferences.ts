import { useCallback, useEffect, useState } from "react"
import type { Lang } from "@/content"

type Theme = "light" | "dark"

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

/** The language of the page (Persian first, English when the browser asks for it) and its direction on `<html>`. */
export function useLang(): [Lang, () => void] {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = read("formatex-landing-lang")
    if (stored === "fa" || stored === "en") return stored
    return typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("en") ? "en" : "fa"
  })
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr"
    document.title = lang === "fa" ? "فرمتکس: مارک‌داون به PDF دوزبانه" : "Formatex: Markdown to bilingual PDF"
    write("formatex-landing-lang", lang)
  }, [lang])
  return [lang, useCallback(() => setLang((current) => (current === "fa" ? "en" : "fa")), [])]
}

/** Light or dark, from the choice made before, else from the system; the class on `<html>` is what the styles read. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = read("formatex-landing-theme")
    if (stored === "light" || stored === "dark") return stored
    return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  })
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    write("formatex-landing-theme", theme)
  }, [theme])
  return [theme, useCallback(() => setTheme((current) => (current === "dark" ? "light" : "dark")), [])]
}
