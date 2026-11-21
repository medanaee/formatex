import { lengthCss, resolveDir } from "formatex"

export default function Component({ node, context }) {
  const p = context.props(node)
  const title = p.title !== undefined && p.title !== null ? String(p.title) : ""
  const subtitle = p.subtitle !== undefined && p.subtitle !== null ? String(p.subtitle) : ""
  const backgroundImage = p.src ? context.background(String(p.src)) : undefined
  const height = lengthCss(p.height) ?? "60mm"
  const dir = resolveDir(p.dir, title || subtitle, context.language)
  const bleedX = p["margin-x"] === false || p["margin-x"] === "false"

  return (
    <header
      id={p.id ? String(p.id) : undefined}
      dir={dir}
      className={`fx-picheader${bleedX ? " fx-picheader-bleed" : ""}`}
      style={{ height, backgroundImage }}
    >
      <div className="fx-picheader-scrim" aria-hidden="true" />
      <div className="fx-picheader-text">
        {title && <div className="fx-picheader-title">{title}</div>}
        {subtitle && <div className="fx-picheader-subtitle">{subtitle}</div>}
      </div>
    </header>
  )
}
