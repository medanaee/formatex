import { schema } from "./schema"

/** The colors of a document theme, named as in the engine's `src/themes.typ`. */
export const THEME_COLORS = ["bg", "fg", "heading", "muted", "accent", "secondary", "rule", "code-bg", "code-stroke"] as const
export type ThemeColor = (typeof THEME_COLORS)[number]

export type ThemeDefinition = { dark: boolean } & Record<ThemeColor, string>

/** The themes the engine ships with, from its schema (`engine/tags.json`, written by `npm run engine:sync`; no user themes in it). */
export const BUILTIN_THEMES = (schema.themes ?? {}) as Record<string, ThemeDefinition>

export const BUILTIN_THEME_NAMES: readonly string[] = Object.keys(BUILTIN_THEMES)

/** A theme name as written in a `[themes.<name>]` header: letters, digits, `-` and `_`. */
export const isThemeName = (name: string): boolean => /^[A-Za-z][\w-]*$/.test(name) && !(name in BUILTIN_THEMES)

/** A theme the user made, kept with the app settings and available in every project. */
export interface CustomTheme {
  /** The built-in theme the colors that are not set come from. */
  base: string
  dark: boolean
  colors: Partial<Record<ThemeColor, string>>
}

/** The colors a custom theme shows: its own, and for the ones it leaves out those of its base. */
export function resolveTheme(theme: CustomTheme): Record<ThemeColor, string> {
  const base = BUILTIN_THEMES[theme.base] ?? BUILTIN_THEMES.paper
  return Object.fromEntries(THEME_COLORS.map((key) => [key, theme.colors[key] ?? base[key]])) as Record<ThemeColor, string>
}
