import { Icon, flowDir, hasIcon, lengthCss, paintOf } from "formatex"

export default function Component({ node, context }) {
  const p = context.props(node)
  const paint = paintOf(p.color ?? "")
  const icon = hasIcon(p.icon) ? String(p.icon) : ""
  const dir = flowDir(p.dir)
  return (
    <span id={p.id ? String(p.id) : undefined} dir={dir} className={`fx-badge ${paint.className}`} style={{ ...paint.style, fontSize: lengthCss(p.size) }}>
      {icon && <Icon name={icon} />}
      {context.children(node)}
    </span>
  )
}
