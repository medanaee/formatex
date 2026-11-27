import { getValue } from "@/lib/editor/tomlEdit"
import { record, type Settings } from "@formatex/core"

export type HtmlOptionKey = "embedFonts" | "copyCode" | "toolbar" | "progress" | "outline" | "magnifier" | "katexMath"

/** What the HTML output has: the `[html]` table of config.toml starts the live preview and the export dialog; the dialog can change it for one export. */
export interface HtmlExportOptions {
  /** Only switches explicitly changed in the export dialog override author settings. */
  operationOverrides?: Partial<Record<HtmlOptionKey, boolean>>
  /** Put the font files in the HTML (a few MB bigger) so it looks the same on any machine; off: the reader's own fonts are used. */
  embedFonts: boolean
  /** A copy button on every code block. */
  copyCode: boolean
  /** A slim toolbar: zoom, theme and feel. */
  toolbar: boolean
  /** A reading-progress line (and the percent in the toolbar). */
  progress: boolean
  /** An outline of the headings in a sidebar on the right (a drawer on a phone). */
  outline: boolean
  /** A fun magnifying glass button in the toolbar. */
  magnifier: boolean
  /** Render math formulas with KaTeX (off: standard HTML/SVG math). */
  katexMath: boolean
  /** Preview-only override for block Typst graphic width when toggled in the viewer toolbar. */
  graphicWidth?: "narrow" | "standard" | "wide"
}

/** The `[html]` keys of config.toml, by boolean option. */
const KEYS: Record<Exclude<HtmlOptionKey, "katexMath">, string> = {
  embedFonts: "embed-fonts",
  copyCode: "copy-button",
  toolbar: "toolbar",
  progress: "progress",
  outline: "outline",
  magnifier: "magnifier",
}

export function htmlOptionsFromSettings(settings: Settings, fallback: HtmlExportOptions = DEFAULT_HTML_OPTIONS): HtmlExportOptions {
  const root = record(settings.html) ? settings.html : {}
  const code = record(root.code) ? root.code : {}
  const out = { ...fallback }
  for (const key of Object.keys(KEYS) as (keyof typeof KEYS)[]) {
    const value = key === "copyCode" ? code["copy-button"] : root[KEYS[key]]
    if (typeof value === "boolean") out[key] = value
  }
  if (root.math === "katex" || root.math === "native") out.katexMath = root.math === "katex"
  return { ...out, ...fallback.operationOverrides }
}

export const DEFAULT_HTML_OPTIONS: HtmlExportOptions = {
  embedFonts: true,
  copyCode: true,
  toolbar: true,
  progress: true,
  outline: true,
  magnifier: true,
  katexMath: true,
}

/** The options `config.toml` sets in `[html]`; a key it does not set (or sets to something that is not true / false) has its default. */
export function htmlOptionsFromConfig(config: string): HtmlExportOptions {
  const options = { ...DEFAULT_HTML_OPTIONS }
  for (const option of Object.keys(KEYS) as (keyof typeof KEYS)[]) {
    const value = getValue(config, option === "copyCode" ? "html.code" : "html", KEYS[option])
    if (value?.kind === "bool") options[option] = value.value
  }
  const mathVal = getValue(config, "html", "math")
  if (mathVal?.kind === "string") {
    options.katexMath = mathVal.value === "katex"
  }
  return options
}
