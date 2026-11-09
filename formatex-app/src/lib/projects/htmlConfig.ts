import { getValue } from "@/lib/editor/tomlEdit"

/** What the HTML output has: the `[html]` table of config.toml starts the live preview and the export dialog; the dialog can change it for one export. */
export interface HtmlExportOptions {
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
}

/** The `[html]` keys of config.toml, by option. */
const KEYS: Record<keyof HtmlExportOptions, string> = { embedFonts: "embed-fonts", copyCode: "copy-code", toolbar: "toolbar", progress: "progress", outline: "outline" }

export const DEFAULT_HTML_OPTIONS: HtmlExportOptions = { embedFonts: true, copyCode: true, toolbar: true, progress: true, outline: true }

/** The options `config.toml` sets in `[html]`; a key it does not set (or sets to something that is not true / false) has its default. */
export function htmlOptionsFromConfig(config: string): HtmlExportOptions {
  const options = { ...DEFAULT_HTML_OPTIONS }
  for (const option of Object.keys(KEYS) as (keyof HtmlExportOptions)[]) {
    const value = getValue(config, "html", KEYS[option])
    if (value?.kind === "bool") options[option] = value.value
  }
  return options
}
