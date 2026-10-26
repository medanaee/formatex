import { PALETTE, SHADES } from "./palette"

/** Colors as the engine reads them: a preset (`blue`, `blue-200`) or a hex color (`#3366ff`, `#36f`, `#3366ff80`). */

export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Hsv {
  h: number
  s: number
  v: number
}

/** The names of the preset colors, in the engine's order. */
export const PRESET_NAMES: readonly string[] = Object.keys(PALETTE)

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const byte = (value: number) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0")

/** `#rgb`, `#rrggbb` or `#rrggbbaa` to a `#rrggbb` (the alpha is dropped); `null` when it is none of them. */
export function normalizeHex(text: string): string | null {
  const match = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(text.trim())
  if (!match) return null
  const digits = match[1].toLowerCase()
  if (digits.length <= 4) return `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`
  return `#${digits.slice(0, 6)}`
}

/** The hex color of a value written in the document: a preset name, a shade (`blue-200`) or a hex. */
export function resolveColor(value: string): string | null {
  const text = value.trim().toLowerCase()
  const hex = normalizeHex(text)
  if (hex) return hex
  const shade = /^([a-z]+)(?:-(\d{2,3}))?$/.exec(text)
  if (!shade || !(shade[1] in PALETTE)) return null
  const index = shade[2] === undefined ? 5 : SHADES.indexOf(Number(shade[2]) as (typeof SHADES)[number])
  return index < 0 ? null : PALETTE[shade[1]][index]
}

export function hexToRgb(hex: string): Rgb {
  const clean = normalizeHex(hex) ?? "#000000"
  return { r: parseInt(clean.slice(1, 3), 16), g: parseInt(clean.slice(3, 5), 16), b: parseInt(clean.slice(5, 7), 16) }
}

export const rgbToHex = ({ r, g, b }: Rgb): string => `#${byte(r)}${byte(g)}${byte(b)}`

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const delta = max - Math.min(rn, gn, bn)
  let h = 0
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
  }
  return { h: (h * 60 + 360) % 360, s: max === 0 ? 0 : delta / max, v: max }
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 }
}

/** The preset names that start with what was typed (a shade name too once a `-` is typed), the plain names first. */
export function presetMatches(typed: string, limit = 12): string[] {
  const text = typed.trim().toLowerCase()
  if (text.startsWith("#")) return []
  const [name, shade] = text.split("-")
  if (shade !== undefined) return name in PALETTE ? SHADES.map((s) => `${name}-${s}`).filter((candidate) => candidate.startsWith(text)).slice(0, limit) : []
  return PRESET_NAMES.filter((candidate) => candidate.startsWith(text)).slice(0, limit)
}

/**
 * Hex colors in text: `#rrggbb` and `#rrggbbaa` anywhere, `#rgb` only inside quotes (elsewhere `#abc` is more likely an id).
 * Not preceded by a word character, so the `#` of `a#bcdef0` is no color.
 */
export const HEX_COLOR = /(?<![\w&])(["']?)#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w])/g

/** The colors found in a piece of text: where each hex is (the `#` included) and the value. */
export function findHexColors(text: string): { from: number; to: number; value: string }[] {
  const found: { from: number; to: number; value: string }[] = []
  for (const match of text.matchAll(HEX_COLOR)) {
    const [whole, quote, digits] = match
    if (digits.length === 3 && !quote) continue
    const from = match.index + quote.length
    found.push({ from, to: match.index + whole.length, value: `#${digits}` })
  }
  return found
}
