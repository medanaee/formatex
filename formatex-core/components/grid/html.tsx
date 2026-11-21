import { flowDir, lengthCss } from "formatex"

const ALIGN = { start: "start", center: "center", end: "end", left: "start", right: "end", top: "start", bottom: "end" }

export default function Component({ node, context }) {
  const p = context.props(node)
  if (node.name === "item") {
    const span = Math.max(1, Number(p.span ?? 1))
    return (
      <div id={p.id ? String(p.id) : undefined} className="fx-grid-item" style={{ gridColumn: span > 1 ? `span ${span}` : undefined, alignSelf: ALIGN[String(p.valign ?? "start")] ?? "start", justifySelf: p.halign ? ALIGN[String(p.halign)] : p.width === "auto" ? "start" : "stretch" }}>
        {context.children(node)}
      </div>
    )
  }
  const cols = Math.max(1, Number(p.cols ?? 2))
  const gapX = lengthCss(p["gap-x"]) ?? "1em"
  const gapY = lengthCss(p["gap-y"]) ?? "1em"
  return (
    <div id={p.id ? String(p.id) : undefined} dir={flowDir(p.dir)} className="fx-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: gapX, rowGap: gapY }}>
      {context.children(node)}
    </div>
  )
}
