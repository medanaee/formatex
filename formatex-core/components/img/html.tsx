import type { CSSProperties } from "react"
import { lengthCss } from "formatex"

export default function Component({ node, context }) {
  const p = context.props(node)
  const spanAll = String(p.span ?? "column") === "all"
  const width = lengthCss(p.width)
  const height = lengthCss(p.height)
  const radius = lengthCss(p.radius)
  const aspectRatio = p.ratio ? String(p.ratio).replace(":", "/") : undefined

  const imgStyle: CSSProperties = {
    width,
    height,
    aspectRatio,
    objectFit: aspectRatio || (width && height) ? "cover" : undefined,
    borderRadius: radius,
  }

  const classes = ["fx-image", spanAll ? "fx-image-span-all" : ""].filter(Boolean).join(" ")
  return (
    <span id={p.id ? String(p.id) : undefined} className={classes}>
      <img src={context.asset(String(p.src ?? ""))} alt={String(p.alt ?? "")} style={imgStyle} />
    </span>
  )
}
