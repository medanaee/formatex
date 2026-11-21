import React from "react"
import { Icon, formatNumber, hueOf, parseNumeric, resolveDir, textDir, textOf } from "formatex"

function findFirstList(nodes) {
  for (const node of nodes ?? []) {
    if (node.type === "list") return node
    const nested = findFirstList(node.children)
    if (nested) return nested
  }
  return null
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function inlineBody(node, context) {
  const children = node.children ?? []
  if (children.length === 1 && children[0].type === "paragraph") {
    return context.children(children[0])
  }
  return context.children(node)
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const style = p.style === "stars" || p.style === "dots" ? p.style : "bar"
  const parsedMax = parseNumeric(p.max)
  const max = parsedMax !== undefined && parsedMax > 0 ? parsedMax : style === "bar" ? 100 : 5
  const showValues = p.values !== false && p.values !== "false"

  const list = findFirstList(node.children)
  const rows = list
    ? (list.children ?? []).map(item => {
        const raw = textOf(item).trim()
        const match = /^(.*)[:：]\s*([^:：]+)$/.exec(raw)
        if (!match) return { key: item.key, labelText: raw, labelNode: raw, value: 0 }
        const label = match[1].trim()
        const num = parseNumeric(match[2])
        return { key: item.key, labelText: label, labelNode: label, value: num !== undefined && num >= 0 ? num : 0 }
      })
    : (() => {
        const labelText = textOf(node).trim()
        const num = parseNumeric(p.value)
        return [{ key: node.key, labelText, labelNode: labelText ? inlineBody(node, context) : null, value: num !== undefined && num >= 0 ? num : 0 }]
      })()

  const sample = rows.map(row => row.labelText).join(" ")
  const dir = resolveDir(p.dir, sample, context.language)
  const rtl = dir === "rtl"
  const hasLabels = rows.some(row => row.labelText !== "")

  const rawColor = p.color !== undefined && p.color !== null ? String(p.color).trim() : ""
  const tint = rawColor ? hueOf(rawColor, "var(--accent)") : { className: "fx-tint fx-progress-default", style: {} }

  const columns = [
    hasLabels ? "auto" : "",
    style === "bar" ? "minmax(0, 1fr)" : "auto",
    showValues ? "auto" : "",
  ].filter(Boolean).join(" ")

  const formatValue = value => {
    if (style === "bar" && max === 100) return formatNumber(value, rtl, "%")
    if (rtl) return `${formatNumber(value, true)} از ${formatNumber(max, true)}`
    return `${formatNumber(value, false)}/${formatNumber(max, false)}`
  }

  const renderIndicator = row => {
    const frac = clamp(row.value / max, 0, 1)
    if (style === "bar") {
      return (
        <div
          className="fx-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={row.value}
          aria-label={row.labelText || undefined}
        >
          <span className="fx-progress-fill" style={{ width: `${frac * 100}%` }} />
        </div>
      )
    }
    const count = Math.max(1, Math.ceil(max))
    if (style === "dots") {
      return (
        <div className="fx-progress-dots" role="img" aria-label={`${row.labelText ? `${row.labelText}: ` : ""}${row.value}/${max}`}>
          {Array.from({ length: count }, (_, i) => {
            const share = clamp(row.value - i, 0, 1)
            return (
              <span key={i} className={`fx-progress-dot${row.value - i > 0 ? " fx-progress-dot-on" : ""}`}>
                <span className="fx-progress-dot-fill" style={{ width: `${share * 100}%` }} />
              </span>
            )
          })}
        </div>
      )
    }
    return (
      <div className="fx-progress-stars" role="img" aria-label={`${row.labelText ? `${row.labelText}: ` : ""}${row.value}/${max}`}>
        {Array.from({ length: count }, (_, i) => {
          const pct = clamp(row.value - i, 0, 1) * 100
          const clip = rtl ? `inset(0 0 0 ${100 - pct}%)` : `inset(0 ${100 - pct}% 0 0)`
          return (
            <span key={i} className="fx-progress-star">
              <span className="fx-progress-star-bg"><Icon name="star" solid /></span>
              {pct > 0 && (
                <span className="fx-progress-star-fg" style={{ clipPath: clip }}>
                  <Icon name="star" solid />
                </span>
              )}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div
      id={p.id ? String(p.id) : undefined}
      dir={dir}
      className={`fx-progress fx-progress-mode-${style} ${tint.className}`}
      style={{ ...tint.style, gridTemplateColumns: columns }}
    >
      {rows.map(row => (
        <React.Fragment key={row.key}>
          {hasLabels && (
            <div className="fx-progress-label">
              <span dir={row.labelText ? (textDir(row.labelText) ?? dir) : dir}>{row.labelNode}</span>
            </div>
          )}
          {renderIndicator(row)}
          {showValues && <div className="fx-progress-value">{formatValue(row.value)}</div>}
        </React.Fragment>
      ))}
    </div>
  )
}
