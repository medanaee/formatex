import { lengthCss } from "formatex"

export default function Component({ node, context }) {
  const p = context.props(node)
  if (node.name === "v") {
    const raw = String(p.size ?? "1em").trim()
    const height = /^\d+(\.\d+)?$/.test(raw) ? `${raw}px` : (lengthCss(raw) ?? "1em")
    const weak = p.weak === true || p.weak === "true"
    return <div className={`fx-space${weak ? " fx-space-weak" : ""}`} style={{ height }} aria-hidden="true" />
  }
  if (node.name === "pagebreak") {
    const to = p.to === "even" || p.to === "odd" ? p.to : ""
    const weak = p.weak === true || p.weak === "true"
    return (
      <div
        className={`fx-pagebreak${to ? ` fx-pagebreak-${to}` : ""}${weak ? " fx-pagebreak-weak" : ""}`}
        style={{ breakAfter: to === "even" ? "left" : to === "odd" ? "right" : "page" }}
        aria-hidden="true"
      />
    )
  }
  return null
}
