import { compile } from "tailwindcss"
import theme from "./generated/theme"

const HUES = [
  "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky",
  "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose", "slate", "gray", "zinc", "neutral", "stone",
]
const HUE_TOKENS = HUES.map(h => `  --color-${h}: var(--color-${h}-500);`).join("\n")

const cache = new Map<string, string>()
const tokens = `
@custom-variant dark (&:where(.dark, .dark *));
@theme inline {
  --color-background: var(--bg);
  --color-foreground: var(--fg);
  --color-fg: var(--fg);
  --color-page: var(--bg);
  --color-heading: var(--heading);
  --color-accent: var(--accent);
  --color-primary: var(--accent);
  --color-primary-foreground: var(--bg);
  --color-secondary: var(--secondary);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted);
  --color-rule: var(--rule);
  --color-border: var(--rule);
  --color-code: var(--code-bg);
  --font-sans: var(--font-body);
  --font-mono: var(--font-code);
${HUE_TOKENS}
}
@tailwind utilities;
`

const MIRROR_SHADE: Record<string, string> = {
  "50": "950", "100": "900", "200": "800", "300": "700", "400": "600",
  "600": "400", "700": "300", "800": "200", "900": "100", "950": "50",
}

const themeColors: Map<string, string> = (() => {
  const map = new Map<string, string>()
  for (const m of theme.matchAll(/--color-([a-z]+-\d+):\s*([^;]+);/g)) map.set(m[1], m[2].trim())
  return map
})()

function darkMirrorCss(candidates: string[]): string {
  const vars: string[] = []
  const seen = new Set<string>()
  for (const cls of candidates) {
    const m = cls.match(/^(?:[a-z0-9-]+:)*(?:bg|text|border|ring|divide|fill|stroke|from|via|to|accent|decoration|outline)-([a-z]+)-(\d+)(?:\/.*)?$/)
    if (!m) continue
    const [, hue, shade] = m
    const mirrored = MIRROR_SHADE[shade]
    if (!mirrored) continue
    const key = `${hue}-${shade}`
    if (seen.has(key)) continue
    const val = themeColors.get(`${hue}-${mirrored}`)
    if (!val) continue
    seen.add(key)
    vars.push(`--color-${key}:${val}`)
  }
  return vars.length ? `\n.dark .fx-div{${vars.join(";")}}` : ""
}

function softTintCss(candidates: string[]): string {
  const rules: string[] = []
  const seen = new Set<string>()
  const hueSet = new Set(HUES)
  for (const cls of candidates) {
    const m = cls.match(/^(bg|border)-([a-z]+)$/)
    if (!m) continue
    const [, prop, hue] = m
    if (!hueSet.has(hue)) continue
    const key = `${prop}-${hue}`
    if (seen.has(key)) continue
    seen.add(key)
    const cssProp = prop === "bg" ? "background-color" : "border-color"
    const lightPct = prop === "bg" ? "10%" : "35%"
    const darkPct = prop === "bg" ? "15%" : "45%"
    rules.push(`.fx-div.${key}{${cssProp}:color-mix(in srgb,var(--color-${hue}-500) ${lightPct},var(--bg))}`)
    rules.push(`.dark .fx-div.${key}{${cssProp}:color-mix(in srgb,var(--color-${hue}-500) ${darkPct},var(--bg))}`)
  }
  return rules.length ? "\n" + rules.join("\n") : ""
}

/** Compiles real utilities in the isolated renderer, shipping only static CSS. */
export async function utilityCss(html: string): Promise<string> {
  const candidates = [...new Set(Array.from(html.matchAll(/\bclass="([^"]*)"/g)).flatMap(m => m[1].replaceAll("&quot;", '"').replaceAll("&amp;", "&").split(/\s+/)).filter(Boolean))].sort()
  const key = candidates.join("\n")
  const previous = cache.get(key)
  if (previous !== undefined) return previous
  const compiler = await compile(theme + tokens)
  const css = compiler.build(candidates) + darkMirrorCss(candidates) + softTintCss(candidates)
  if (cache.size >= 16) cache.delete(cache.keys().next().value!)
  cache.set(key, css)
  return css
}
