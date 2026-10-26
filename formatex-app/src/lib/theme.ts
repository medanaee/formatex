import { readPersistedSettings } from "./persistedSettings"

export type ThemePreference = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

const DARK_QUERY = "(prefers-color-scheme: dark)"

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system"

const systemPrefersDark = (): boolean =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches

export const resolveTheme = (preference: ThemePreference): ResolvedTheme =>
  preference === "system" ? (systemPrefersDark() ? "dark" : "light") : preference

/** Puts the `dark` class on <html>; every colour in the app is a CSS variable that the class switches. */
export function applyTheme(preference: ThemePreference): void {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", resolveTheme(preference) === "dark")
}

let stopWatching: (() => void) | null = null

/** While the preference is "system", follows the operating system's light / dark switch live. */
export function watchSystemTheme(preference: ThemePreference): void {
  stopWatching?.()
  stopWatching = null
  if (preference !== "system" || typeof window === "undefined" || typeof window.matchMedia !== "function") return
  const list = window.matchMedia(DARK_QUERY)
  const onChange = () => applyTheme("system")
  list.addEventListener("change", onChange)
  stopWatching = () => list.removeEventListener("change", onChange)
}

/** Runs before React renders, so the first paint already has the right theme (no light flash in dark mode). */
export function initTheme(): void {
  const saved = readPersistedSettings().theme
  const preference = isThemePreference(saved) ? saved : "system"
  applyTheme(preference)
  watchSystemTheme(preference)
}
