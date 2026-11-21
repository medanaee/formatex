export default function Component({ node, context }) {
  const p = context.props(node)
  if (node.name === "include") {
    throw new Error(`<include src="${String(p.src ?? "")}"> must stand alone on its own line, with blank lines around it`)
  }
  if (node.name !== "listpages") return null
  return (
    <div id={p.id ? String(p.id) : undefined} className="fx-listpages">
      {context.children(node)}
    </div>
  )
}
