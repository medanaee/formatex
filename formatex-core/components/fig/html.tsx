import { captionPosition, digits, flowDir, textOf } from "formatex"

export default function Component({ node, context }) {
  if (node.name === "caption") return null
  const p = context.props(node)
  const dir = flowDir(p.dir)
  const captionNode = node.children?.find(child => child.name === "caption")
  const caption = captionNode ? textOf(captionNode) : ""
  const rtl = dir === "rtl" || (dir !== "ltr" && (caption ? /[\u0600-\u06FF]/.test(caption) : context.language === "fa"))
  const numbered = p.numbering !== false && p.numbering !== "false" && context.numbers.has(node.key)
  const position = captionPosition(context.document.settings, "figure", p, "below")
  const label = (
    <figcaption className="fx-fig-caption">
      {numbered && <span className="fx-fig-number">{rtl ? "شکل" : "Figure"} {digits(context.numbers.get(node.key) ?? 0, rtl)}</span>}
      {numbered && caption ? ": " : ""}
      {caption}
    </figcaption>
  )
  const body = (node.children ?? []).filter(child => child.name !== "caption").map(child => context.render(child))
  return (
    <figure id={p.id ? String(p.id) : undefined} dir={dir} className="fx-fig" style={{ textAlign: p.align === "left" || p.align === "start" ? "start" : p.align === "right" || p.align === "end" ? "end" : "center" }}>
      {position === "above" && (numbered || caption) && label}
      <div className="fx-fig-body">{body}</div>
      {position !== "above" && (numbered || caption) && label}
    </figure>
  )
}
