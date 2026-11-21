import { flowDir, lengthCss, presetHex, resolveDir, textOf } from "formatex"

const WEIGHTS = {
  thin: 100,
  extralight: 200,
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
}

const ALIGNS = new Set(["center", "left", "right", "start", "end"])

function parsePercent(value) {
  if (value === undefined || value === null || value === "") return undefined
  const m = /^\s*(-?\d*\.?\d+)\s*%?\s*$/.exec(String(value))
  return m ? Number(m[1]) : undefined
}

function resolveColor(value) {
  if (value === undefined || value === null || value === "") return undefined
  const raw = String(value).trim()
  if (!raw) return undefined
  if (raw === "accent") return "var(--accent)"
  if (raw === "secondary") return "var(--secondary)"
  if (raw === "heading") return "var(--heading)"
  if (raw === "muted") return "var(--muted)"
  if (raw.startsWith("#")) return raw
  return presetHex(raw) ?? raw
}

function parseLength(value) {
  if (value === undefined || value === null || value === "") return undefined
  const s = String(value).trim()
  if (s === "full" || s === "fill") return "100%"
  if (s === "auto") return "auto"
  if (/^-?\d+(\.\d+)?$/.test(s)) return `${s}px`
  return lengthCss(s)
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const dirAttr = flowDir(p.dir)
  const dir = dirAttr === "rtl" || dirAttr === "ltr"
    ? dirAttr
    : resolveDir("auto", textOf(node), context.language)

  const justify = p.justify === true || p.justify === "true"
  const alignRaw = p.align ? String(p.align).trim().toLowerCase() : ""
  const textAlign = justify ? "justify" : (ALIGNS.has(alignRaw) ? alignRaw : undefined)
  const weightKey = p.weight ? String(p.weight).trim().toLowerCase() : ""
  const fontWeight = weightKey ? (WEIGHTS[weightKey] ?? weightKey) : undefined
  const linePct = parsePercent(p["line-spacing"])
  const letterPct = parsePercent(p["letter-spacing"])
  const wordPct = parsePercent(p["word-spacing"])

  const style = {
    fontFamily: p.font ? String(p.font) : undefined,
    fontSize: parseLength(p.size),
    fontWeight,
    color: resolveColor(p.color),
    textAlign,
    textIndent: parseLength(p.indent),
    marginBlockStart: parseLength(p.above),
    marginBlockEnd: parseLength(p.below),
    lineHeight: linePct !== undefined && p["line-spacing"] !== undefined ? Number((1 + 0.42 * linePct / 100).toFixed(3)) : undefined,
    letterSpacing: letterPct !== undefined && p["letter-spacing"] !== undefined && letterPct !== 0 ? `${letterPct / 100}em` : undefined,
    wordSpacing: wordPct !== undefined && p["word-spacing"] !== undefined && wordPct !== 100 ? `${wordPct - 100}%` : undefined,
  }

  return (
    <div id={p.id ? String(p.id) : undefined} dir={dir} className="fx-paragraph" style={style}>
      {context.children(node)}
    </div>
  )
}
