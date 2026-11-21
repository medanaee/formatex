import { Icon, alertTypes, flowDir, hasIcon, paintOf, radiusStyle } from "formatex"

export default function Component({ node, context }) {
  const p = context.props(node)
  const kind = alertTypes[String(p.type ?? "")]
  const paint = paintOf(p.color ?? kind?.color ?? "")
  const icon = p.icon !== undefined && p.icon !== null && p.icon !== "" ? String(p.icon) : kind?.icon
  const shown = hasIcon(icon) ? String(icon) : ""
  const dir = flowDir(p.dir)
  return (
    <aside id={p.id ? String(p.id) : undefined} dir={dir} className={`fx-alert ${paint.className}${shown ? " fx-alert-iconed" : ""}`} style={{ ...paint.style, ...radiusStyle(p.radius) }}>
      {shown && <span className="fx-alert-icon"><Icon name={shown} /></span>}
      <div className="fx-alert-body">{context.children(node)}</div>
    </aside>
  )
}
