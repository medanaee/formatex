import { flowDir } from "formatex"

export default function Component({ node, context }) {
  const p = context.props(node)
  return (
    <div id={p.id ? String(p.id) : undefined} dir={flowDir(p.dir)} className="fx-lists">
      {context.children(node)}
    </div>
  )
}
