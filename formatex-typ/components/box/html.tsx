import { edgeOf, flowDir, isPresetColor, lengthCss, paintOf, radiusStyle } from "formatex"

export default function Component({ node, context }) {
  const p = context.props(node)
  const paint = p.color ? paintOf(p.color) : { className: "", style: {} }
  const border = lengthCss(p.border ?? (isPresetColor(p.color) ? "0.6" : "0"))
  const stroke = !!border && Number.parseFloat(border) !== 0
  const edge = stroke && p["border-color"] ? edgeOf(p["border-color"]) : { className: "", style: {} }
  const dir = flowDir(p.dir)
  const className = ["fx-box", paint.className, edge.className, stroke ? "fx-box-stroke" : ""].filter(Boolean).join(" ")
  return (
    <div id={p.id ? String(p.id) : undefined} dir={dir} className={className} style={{ ...paint.style, ...edge.style, ...radiusStyle(p.radius), padding: lengthCss(p.padding) ?? "0.8em", borderWidth: stroke ? border : 0 }}>
      {context.children(node)}
    </div>
  )
}
