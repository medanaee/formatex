import { flowDir, resolveDir, textOf } from "formatex"

export default function Component({ node, context }) {
  const p = context.props(node)
  const given = flowDir(p.dir)
  const dir = given === "rtl" || given === "ltr"
    ? given
    : resolveDir("auto", textOf(node), context.language)
  const cls = p.class ? String(p.class).trim() : ""
  const tw = p.tailwind ? String(p.tailwind).trim() : ""
  const classes = ["fx-div", cls, tw].filter(Boolean).join(" ")
  return (
    <div id={p.id ? String(p.id) : undefined} dir={dir} className={classes}>
      {context.children(node)}
    </div>
  )
}
