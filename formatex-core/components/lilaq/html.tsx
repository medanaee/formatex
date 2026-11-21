export default function Component({ node, context }) {
  const p = context.props(node)
  const hasCode = !!(p.src || node.value !== undefined || node.children?.some(child => child.type === "code"))
  if (!hasCode) {
    throw new Error('<lilaq> needs a fenced code block inside it, or src="file.typ"')
  }
  return (
    <div id={p.id ? String(p.id) : undefined} className="fx-lilaq">
      {context.graphic(node, { bodyOnly: true })}
    </div>
  )
}
