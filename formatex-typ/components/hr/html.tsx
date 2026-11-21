import type { CSSProperties } from "react"
import { useId } from "react"
import { lengthCss, presetHex } from "formatex"

function resolveHrColor(color: unknown): string {
  const raw = String(color ?? "").trim()
  if (!raw || raw === "rule") return "var(--rule)"
  if (raw === "accent" || raw === "secondary" || raw === "heading" || raw === "muted") return `var(--${raw})`
  if (raw.startsWith("#")) return raw
  return presetHex(raw) ?? "var(--rule)"
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const style = String(p.style ?? "solid")
  const width = lengthCss(p.width) ?? "100%"
  const thickness = lengthCss(p.thickness) ?? "0.1em"
  const gap = lengthCss(p.gap) ?? "0.8em"
  const color = resolveHrColor(p.color)
  const waveId = useId().replace(/[^a-zA-Z0-9_-]/g, "")

  const wrapStyle = {
    ["--fx-hr-gap" as string]: gap,
    color,
  } as CSSProperties

  if (style === "wavy") {
    return (
      <div className="fx-hr-wrap" style={wrapStyle} role="separator">
        <svg className="fx-hr-svg fx-hr-wavy" style={{ width }} height="10" aria-hidden="true">
          <defs>
            <pattern id={`fx-wave-${waveId}`} width="16" height="10" patternUnits="userSpaceOnUse">
              <path
                d="M0 5 Q4 1 8 5 T16 5"
                fill="none"
                stroke="currentColor"
                strokeWidth={thickness}
                strokeLinecap="round"
              />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="10" fill={`url(#fx-wave-${waveId})`} />
        </svg>
      </div>
    )
  }

  if (style === "dash-dot") {
    return (
      <div className="fx-hr-wrap" style={wrapStyle} role="separator">
        <svg className="fx-hr-svg" style={{ width }} height="6" aria-hidden="true">
          <line
            x1="0"
            y1="50%"
            x2="100%"
            y2="50%"
            stroke="currentColor"
            strokeWidth={thickness}
            strokeDasharray="8 4 2 4"
          />
        </svg>
      </div>
    )
  }

  const borderWidth = style === "double" ? `max(3px, calc(${thickness} * 3))` : thickness
  const hrStyle: CSSProperties = {
    width,
    borderBlockStartStyle: style as CSSProperties["borderBlockStartStyle"],
    borderBlockStartWidth: borderWidth,
    borderBlockStartColor: color,
  }
  return (
    <div className="fx-hr-wrap" style={wrapStyle}>
      <hr id={p.id ? String(p.id) : undefined} className="fx-hr" style={hrStyle} />
    </div>
  )
}
