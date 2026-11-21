import { Fragment } from "react"
import { arabicScript, captionPosition, digits, flowDir, lengthCss, textOf } from "formatex"

export default function Component({ node, context }) {
  if (node.name === "caption") return null
  const p = context.props(node)
  const dir = flowDir(p.dir)
  const captionNode = node.children?.find(child => child.name === "caption")
  const caption = captionNode ? textOf(captionNode) : ""
  const rtl = dir === "rtl" || (dir !== "ltr" && (caption ? arabicScript(caption) : context.document.settings.dir === "rtl" || context.language === "fa"))
  const numbered = p.numbering !== false && p.numbering !== "false" && context.numbers.has(node.key)
  const position = captionPosition(context.document.settings, "figure", p, "below")
  const width = lengthCss(p.width)
  const height = lengthCss(p.height)
  const align = p.align === "left" || p.align === "start" ? "start" : p.align === "right" || p.align === "end" ? "end" : "center"
  const label = (
    <figcaption className="fx-fig-caption">
      {numbered && <span className="fx-fig-number">{rtl ? "شکل" : "Figure"} {digits(context.numbers.get(node.key) ?? 0, rtl)}</span>}
      {numbered && caption ? ": " : ""}
      {caption}
    </figcaption>
  )
  const body = (node.children ?? []).filter(child => child.name !== "caption").map(child => <Fragment key={child.key}>{context.render(child)}</Fragment>)
  const bodyStyle = {}
  if (width) bodyStyle["--fx-fig-w"] = width
  if (height) bodyStyle["--fx-fig-h"] = height
  return (
    <figure
      id={p.id ? String(p.id) : undefined}
      dir={dir}
      className={`fx-fig${p.span === "all" ? " fx-fig-span-all" : ""}${width ? " fx-fig-has-w" : ""}${height ? " fx-fig-has-h" : ""}`}
      style={{ textAlign: align }}
    >
      {position === "above" && (numbered || caption) && label}
      <div className="fx-fig-body" style={width || height ? bodyStyle : undefined}>{body}</div>
      {position !== "above" && (numbered || caption) && label}
    </figure>
  )
}
