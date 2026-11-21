import type { CSSProperties, ReactNode } from "react"
import { textOf, type Settings } from "@formatex/core"

export { textOf }

/** PDF body is 10pt, so a point length is 0.1em of the surrounding text. */
export function lengthCss(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined
  const match = /^\s*([0-9]*\.?[0-9]+)\s*(pt|mm|cm|in|em|%|px)?\s*$/.exec(String(value))
  if (!match) return undefined
  const n = Number(match[1])
  const unit = match[2]
  if (!unit || unit === "pt") return `${n / 10}em`
  return `${n}${unit}`
}

export function radiusStyle(value: unknown): CSSProperties {
  const css = lengthCss(value)
  return css ? { borderRadius: css } : {}
}

export function flowDir(value: unknown): "rtl" | "ltr" | "auto" | undefined {
  const dir = String(value ?? "")
  return dir === "rtl" || dir === "ltr" || dir === "auto" ? dir : undefined
}

const PERSIAN = "۰۱۲۳۴۵۶۷۸۹"
export function digits(value: number, persian: boolean): string {
  const text = String(value)
  return persian ? text.replace(/\d/g, digit => PERSIAN[Number(digit)] ?? digit) : text
}

export function arabicScript(text: string): boolean {
  const letter = text.match(/\p{L}/u)?.[0] ?? ""
  return /\p{Script=Arabic}/u.test(letter)
}

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const PALETTE: Record<string, string> = {
  slate: "f8fafc f1f5f9 e2e8f0 cbd5e1 94a3b8 64748b 475569 334155 1e293b 0f172a 020617",
  gray: "f9fafb f3f4f6 e5e7eb d1d5db 9ca3af 6b7280 4b5563 374151 1f2937 111827 030712",
  zinc: "fafafa f4f4f5 e4e4e7 d4d4d8 a1a1aa 71717a 52525b 3f3f46 27272a 18181b 09090b",
  neutral: "fafafa f5f5f5 e5e5e5 d4d4d4 a3a3a3 737373 525252 404040 262626 171717 0a0a0a",
  stone: "fafaf9 f5f5f4 e7e5e4 d6d3d1 a8a29e 78716c 57534e 44403c 292524 1c1917 0c0a09",
  red: "fef2f2 fee2e2 fecaca fca5a5 f87171 ef4444 dc2626 b91c1c 991b1b 7f1d1d 450a0a",
  orange: "fff7ed ffedd5 fed7aa fdba74 fb923c f97316 ea580c c2410c 9a3412 7c2d12 431407",
  amber: "fffbeb fef3c7 fde68a fcd34d fbbf24 f59e0b d97706 b45309 92400e 78350f 451a03",
  yellow: "fefce8 fef9c3 fef08a fde047 facc15 eab308 ca8a04 a16207 854d0e 713f12 422006",
  lime: "f7fee7 ecfccb d9f99d bef264 a3e635 84cc16 65a30d 4d7c0f 3f6212 365314 1a2e05",
  green: "f0fdf4 dcfce7 bbf7d0 86efac 4ade80 22c55e 16a34a 15803d 166534 14532d 052e16",
  emerald: "ecfdf5 d1fae5 a7f3d0 6ee7b7 34d399 10b981 059669 047857 065f46 064e3b 022c22",
  teal: "f0fdfa ccfbf1 99f6e4 5eead4 2dd4bf 14b8a6 0d9488 0f766e 115e59 134e4a 042f2e",
  cyan: "ecfeff cffafe a5f3fc 67e8f9 22d3ee 06b6d4 0891b2 0e7490 155e75 164e63 083344",
  sky: "f0f9ff e0f2fe bae6fd 7dd3fc 38bdf8 0ea5e9 0284c7 0369a1 075985 0c4a6e 082f49",
  blue: "eff6ff dbeafe bfdbfe 93c5fd 60a5fa 3b82f6 2563eb 1d4ed8 1e40af 1e3a8a 172554",
  indigo: "eef2ff e0e7ff c7d2fe a5b4fc 818cf8 6366f1 4f46e5 4338ca 3730a3 312e81 1e1b4b",
  violet: "f5f3ff ede9fe ddd6fe c4b5fd a78bfa 8b5cf6 7c3aed 6d28d9 5b21b6 4c1d95 2e1065",
  purple: "faf5ff f3e8ff e9d5ff d8b4fe c084fc a855f7 9333ea 7e22ce 6b21a8 581c87 3b0764",
  fuchsia: "fdf4ff fae8ff f5d0fe f0abfc e879f9 d946ef c026d3 a21caf 86198f 701a75 4a044e",
  pink: "fdf2f8 fce7f3 fbcfe8 f9a8d4 f472b6 ec4899 db2777 be185d 9d174d 831843 500724",
  rose: "fff1f2 ffe4e6 fecdd3 fda4af fb7185 f43f5e e11d48 be123c 9f1239 881337 4c0519",
}

/** Tailwind preset used by PDF `color-presets`. Bare names are shade 500. */
export function presetHex(name: string): string | undefined {
  const dash = name.lastIndexOf("-")
  const family = dash > 0 ? name.slice(0, dash) : name
  const row = PALETTE[family]
  if (!row) return undefined
  const parts = row.split(" ")
  const shade = dash > 0 ? Number(name.slice(dash + 1)) : 500
  const index = SHADES.indexOf(shade)
  return index >= 0 && parts[index] ? `#${parts[index]}` : undefined
}

export function isPresetColor(color: unknown): boolean {
  if (color === undefined || color === null || color === "") return false
  const value = String(color)
  return !value.startsWith("#") && !!presetHex(value)
}

/** Hue goes in `--fx-paint`. CSS mixes it with the live theme, including a reader theme change. */
export function paintOf(color: unknown): { className: string; style: CSSProperties } {
  if (color === undefined || color === null || color === "") return { className: "fx-tint fx-tint-muted", style: {} }
  const value = String(color)
  if (value.startsWith("#")) return { className: "fx-tint fx-tint-hex", style: { ["--fx-paint" as string]: value } }
  const hex = presetHex(value)
  if (!hex) return { className: "fx-tint fx-tint-muted", style: {} }
  return { className: "fx-tint", style: { ["--fx-paint" as string]: hex } }
}

/** Resolves a preset, theme role or hex color as `--fx-paint` so `fx-tint` mixes it with `--bg`. */
export function hueOf(color: unknown, fallback: string): { className: string; style: CSSProperties } {
  const raw = color === undefined || color === null ? "" : String(color).trim()
  let resolved = fallback
  if (raw === "accent") resolved = "var(--accent)"
  else if (raw === "secondary") resolved = "var(--secondary)"
  else if (raw === "heading") resolved = "var(--heading)"
  else if (raw.startsWith("#")) resolved = raw
  else if (raw) resolved = presetHex(raw) ?? fallback
  return { className: "fx-tint", style: { ["--fx-paint" as string]: resolved } }
}

export function textDir(text: string): "rtl" | "ltr" | undefined {
  const match = /[\p{L}\u200F\u061C\u200E]/u.exec(text)
  if (!match) return undefined
  return /[\p{Script=Arabic}\u200F\u061C]/u.test(match[0]) ? "rtl" : "ltr"
}

export function resolveDir(given: unknown, sample: string, language?: string): "rtl" | "ltr" {
  if (given === "rtl") return "rtl"
  if (given === "ltr") return "ltr"
  return textDir(sample) ?? (language === "fa" ? "rtl" : "ltr")
}

const DIGIT_MAP: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
}

export function parseNumeric(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (value === undefined || value === null) return undefined
  const normalized = String(value)
    .trim()
    .replace(/[۰-۹٠-٩]/g, ch => DIGIT_MAP[ch] ?? ch)
    .replaceAll("٫", ".")
    .replaceAll("−", "-")
    .replace(/[,٬\s%٪]/g, "")
  if (!normalized || !/^-?\d*\.?\d+$/.test(normalized)) return undefined
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function formatNumber(value: number, persian: boolean, unit?: string): string {
  const rounded = Math.abs(value - Math.round(value)) < 1e-9
    ? String(Math.round(value))
    : String(Number(value.toFixed(3)))
  let out = rounded.replaceAll("-", "−")
  if (persian) out = out.replace(/\d/g, d => PERSIAN[Number(d)] ?? d).replaceAll(".", "٫")
  if (!unit) return out
  return out + (persian && unit === "%" ? "٪" : unit)
}

export function edgeOf(color: unknown): { className: string; style: CSSProperties } {
  const value = String(color ?? "")
  if (value.startsWith("#")) return { className: "fx-edge fx-edge-hex", style: { ["--fx-edge-hue" as string]: value } }
  const hex = presetHex(value)
  if (!hex) return { className: "", style: {} }
  return { className: "fx-edge", style: { ["--fx-edge-hue" as string]: hex } }
}

export const alertTypes: Record<string, { color: string; icon: string }> = {
  note: { color: "purple", icon: "note-sticky" },
  info: { color: "blue", icon: "circle-info" },
  tip: { color: "teal", icon: "lightbulb" },
  success: { color: "green", icon: "circle-check" },
  warning: { color: "yellow", icon: "triangle-exclamation" },
  danger: { color: "red", icon: "circle-xmark" },
  important: { color: "pink", icon: "circle-exclamation" },
}

const ICONS: Record<string, string> = {
  "note-sticky": "M7 4.2h6.6L18 8.4V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5.2a1 1 0 0 1 1-1zM13.4 4.5V8.2H17.2M8.3 12h7M8.3 15.2h4.8",
  "circle-info": "M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM12 10.7V16.4M12 7.7h.01",
  lightbulb: "M9.2 18.2h5.6M10 20.4h4M12 3a5.5 5.5 0 0 0-3 10.1c.5.35.8.9.8 1.5V16h4.4v-1.4c0-.6.3-1.15.8-1.5A5.5 5.5 0 0 0 12 3z",
  "circle-check": "M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM8.2 12.2l2.6 2.6 5-5.2",
  "triangle-exclamation": "M12 3.5 3.1 19.6h17.8L12 3.5zM12 9.3V14M12 16.5h.01",
  "circle-xmark": "M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM9.1 9.1l5.8 5.8M14.9 9.1l-5.8 5.8",
  "circle-exclamation": "M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM12 8v5.2M12 16.4h.01",
  check: "M5 12.4 9.2 16.6 19 7.2",
  xmark: "M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5",
  code: "M9.2 16.6 4.6 12 9.2 7.4M14.8 16.6 19.4 12 14.8 7.4",
  "thumbs-up": "M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z",
  "thumbs-down": "M7 14V2M15 18.12 14 14h5.83a2 2 0 0 0 1.92-2.56l-2.33-8A2 2 0 0 0 17.5 2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.76a2 2 0 0 1 1.79 1.11L12 22a3.13 3.13 0 0 0 3-3.88Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0",
  robot: "M12 3v3M9.5 3h5M5 9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V9zM9.2 12h.01M14.8 12h.01M9.2 15.6h5.6M3 12h2M19 12h2",
  comments: "M4 6.5A2.5 2.5 0 0 1 6.5 4h7A2.5 2.5 0 0 1 16 6.5v4A2.5 2.5 0 0 1 13.5 13H9l-3.5 2.5V13A2.5 2.5 0 0 1 4 10.5v-4zM16 9h1.5A2.5 2.5 0 0 1 20 11.5v4a2.5 2.5 0 0 1-2.5 2.5H17v2.2L13.8 18H11a2 2 0 0 1-1.9-1.4",
  comment: "M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3A2.5 2.5 0 0 1 5 13.5v-8z",
  star: "M12 2.4l2.92 5.92 6.53.95-4.72 4.6 1.11 6.5L12 17.3l-5.84 3.07 1.11-6.5-4.72-4.6 6.53-.95L12 2.4z",
  terminal: "M4 17l6-5-6-5M12 19h8",
  sparkles: "M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z",
  heart: "M12 20.2s-7.5-4.7-7.5-10.2A4.3 4.3 0 0 1 12 6.8a4.3 4.3 0 0 1 7.5 3.2c0 5.5-7.5 10.2-7.5 10.2z",
  rocket: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",
  bug: "M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3 3 0 1 1 6 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4",
  "code-branch": "M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9",
  book: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20",
}

export function hasIcon(name: unknown): boolean {
  return !!name && !!ICONS[String(name)]
}

export function Icon({ name, solid = false }: { name?: unknown; solid?: boolean }): ReactNode {
  const d = ICONS[String(name ?? "")]
  if (!d) return null
  return (
    <svg className="fx-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {solid
        ? <path fill="currentColor" stroke="none" d={d} />
        : <path fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" d={d} />}
    </svg>
  )
}

function groupValue(settings: Settings, group: string, key: string): unknown {
  const table = settings[group]
  if (!table || typeof table !== "object" || Array.isArray(table)) return undefined
  return (table as Settings)[key]
}

/** A captioned figure is numbered from its own `numbering`, or from the group default only when it has a caption. */
export function captionedNumber(settings: Settings, group: string, local: Settings): boolean {
  const own = local.numbering
  if (own === false || own === "false") return false
  if (own === true || own === "true") return true
  const global = groupValue(settings, group, "numbering")
  const caption = local.caption
  return (global === true || global === "true") && caption !== undefined && caption !== null && String(caption) !== ""
}

export function captionPosition(settings: Settings, group: string, props: Settings, fallback: "above" | "below"): "above" | "below" {
  const own = props["caption-position"]
  const value = own === undefined || own === null || own === "" ? groupValue(settings, group, "caption-position") : own
  if (value === "above" || value === "below") return value
  return fallback
}

/** PDF numbers a listing from the item's own `numbering`, or from `[code] numbering` only when that listing has a caption. */
export function codeIsNumbered(settings: Settings, local: Settings): boolean {
  return captionedNumber(settings, "code", local)
}

export function codeCaptionPosition(settings: Settings, props: Settings): "above" | "below" {
  return captionPosition(settings, "code", props, "above")
}

const LANGUAGE_NAMES: Record<string, string> = {
  python: "Python", javascript: "JavaScript", typescript: "TypeScript", java: "Java", c: "C", cpp: "C++",
  csharp: "C#", go: "Go", rust: "Rust", php: "PHP", ruby: "Ruby", swift: "Swift", kotlin: "Kotlin",
  julia: "Julia", r: "R", matlab: "MATLAB", bash: "Bash", powershell: "PowerShell", sql: "SQL",
  html: "HTML", css: "CSS", json: "JSON", yaml: "YAML", toml: "TOML", xml: "XML", markdown: "Markdown",
  latex: "LaTeX", typst: "Typst", dockerfile: "Dockerfile", nginx: "Nginx",
}
const LANGUAGE_ALIASES: Record<string, string> = {
  py: "python", js: "javascript", ts: "typescript", "c++": "cpp", cs: "csharp", "c#": "csharp",
  golang: "go", rs: "rust", rb: "ruby", kt: "kotlin", sh: "bash", shell: "bash", zsh: "bash",
  ps1: "powershell", pwsh: "powershell", yml: "yaml", md: "markdown", tex: "latex", typ: "typst",
  docker: "dockerfile",
}

export function codeLanguage(lang: unknown): string | undefined {
  const raw = String(lang ?? "").trim()
  if (!raw) return undefined
  const key = LANGUAGE_ALIASES[raw.toLowerCase()] ?? raw.toLowerCase()
  return LANGUAGE_NAMES[key] ?? raw
}
