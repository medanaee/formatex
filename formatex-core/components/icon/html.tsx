import type { CSSProperties } from "react"
import { Icon, hasIcon, lengthCss, presetHex } from "formatex"

function resolveIconColor(color: unknown): string | undefined {
  const raw = String(color ?? "").trim()
  if (!raw) return undefined
  if (raw === "accent" || raw === "secondary" || raw === "heading" || raw === "muted") return `var(--${raw})`
  if (raw === "fg" || raw === "primary") return "var(--fg)"
  if (raw.startsWith("#")) return raw
  return presetHex(raw) ?? raw
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const name = String(p.name ?? "").trim()
  const solid = p.solid === true || p.solid === "true"
  const size = lengthCss(p.size)
  const color = resolveIconColor(p.color)
  const style: CSSProperties = {
    fontSize: size,
    color,
  }
  return (
    <span id={p.id ? String(p.id) : undefined} className="fx-icon" style={style} aria-hidden="true">
      {hasIcon(name) ? <Icon name={name} solid={solid} /> : "•"}
    </span>
  )
}
