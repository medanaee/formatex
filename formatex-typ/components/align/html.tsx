const ALLOWED = new Set(["center", "left", "right", "start", "end"])

export default function Component({ node, context }) {
  const p = context.props(node)
  const bare = ["center", "left", "right", "start", "end"].find(k => p[k] === true || p[k] === "true")
  const raw = String(p.to ?? bare ?? "center").trim().toLowerCase()
  const to = ALLOWED.has(raw) ? raw : "center"
  return (
    <div
      id={p.id ? String(p.id) : undefined}
      className={`fx-align fx-align-${to}`}
      style={{ textAlign: to }}
    >
      {context.children(node)}
    </div>
  )
}
