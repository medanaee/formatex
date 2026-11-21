import { Icon, presetHex, textOf } from "formatex"

function safeHref(url) {
  return url && !/^\s*(javascript|vbscript):/i.test(url) ? url : ""
}

function highlightColor(value) {
  if (value === undefined || value === null || value === false || value === "false" || value === "") return undefined
  const raw = value === true || value === "true" ? "yellow" : String(value).trim()
  if (raw.startsWith("#")) return raw
  return presetHex(raw) ?? presetHex("yellow")
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const name = node.name
  const id = p.id ? String(p.id) : undefined

  if (name === "a") {
    const href = p.href ? String(p.href) : ""
    if (!href && id) {
      return <span id={id} className="fx-anchor">{context.children(node)}</span>
    }
    const safe = safeHref(href)
    const external = /^https?:\/\//i.test(safe)
    const hasBody = textOf(node).trim() !== "" || (node.children?.length ?? 0) > 0
    return (
      <a
        id={id}
        href={safe}
        className={external ? "fx-link fx-link-external" : "fx-link fx-link-internal"}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {external && <span className="fx-link-icon"><Icon name="link" /></span>}
        {hasBody ? context.children(node) : safe}
      </a>
    )
  }

  if (name === "span" || name === "anchor") {
    const hl = highlightColor(p.highlight)
    const tw = p.tailwind ? String(p.tailwind).trim() : ""
    const classes = [
      name === "anchor" ? "fx-anchor" : "fx-span",
      hl ? "fx-mark" : "",
      tw,
    ].filter(Boolean).join(" ")
    const style = hl ? { ["--fx-mark" as string]: hl } : undefined
    return (
      <span id={id} className={classes} style={style}>
        {context.children(node)}
      </span>
    )
  }

  return null
}
