const ALLOWED = new Set(["rtl", "ltr", "auto"])

export default function Component({ node, context }) {
  const p = context.props(node)
  const bare = ["rtl", "ltr", "auto"].find(k => p[k] === true || p[k] === "true")
  const raw = String(p.to ?? bare ?? "auto").trim().toLowerCase()
  const to = ALLOWED.has(raw) ? raw : "auto"
  return (
    <div
      id={p.id ? String(p.id) : undefined}
      dir={to}
      className={`fx-dir fx-dir-${to}`}
    >
      {context.children(node)}
    </div>
  )
}
