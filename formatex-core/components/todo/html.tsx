import React from "react"
import { Icon, digits, hueOf, lengthCss, resolveDir, textDir, textOf } from "formatex"

function collectTodos(nodes, out = []) {
  for (const node of nodes ?? []) {
    if (node.name === "todo") out.push(node)
    if (node.children) collectTodos(node.children, out)
  }
  return out
}

function isBlockTodo(node) {
  return (node.children ?? []).some(ch => ["paragraph", "list", "code", "blockquote", "table"].includes(ch.type))
}

function renderInlineChildren(node, context) {
  return (node.children ?? []).map(ch => (ch.type === "paragraph" ? context.children(ch) : context.render(ch)))
}

export default function Component({ node, context }) {
  const p = context.props(node)
  if (context.document.settings.todo === "hide") return null

  if (node.name === "todos") {
    const items = collectTodos(context.document.children)
    const title = p.title !== undefined && p.title !== null ? String(p.title).trim() : ""
    const sample = title || items.map(item => textOf(item)).join(" ")
    const dir = resolveDir(p.dir, sample, context.language)
    const rtl = dir === "rtl"
    return (
      <section id={p.id ? String(p.id) : undefined} dir={dir} className="fx-todos">
        <div className="fx-todos-title">{title || (rtl ? "کارهای باقی‌مانده" : "To-do list")}</div>
        {items.length === 0 ? (
          <div className="fx-todos-empty">{rtl ? "کاری باقی نمانده است." : "Nothing left to do."}</div>
        ) : (
          <ul className="fx-todos-list">
            {items.map((item, idx) => {
              const ip = context.props(item)
              const author = ip.author !== undefined && ip.author !== null ? String(ip.author).trim() : ""
              const body = textOf(item).trim()
              const label = author ? `${author}: ${body}` : body
              const href = ip.id ? `#${String(ip.id)}` : undefined
              return (
                <li key={item.key}>
                  <a href={href} className="fx-todos-link">
                    <span className="fx-todos-num">{digits(idx + 1, rtl)}.</span>
                    <span className="fx-todos-text" dir={textDir(label) ?? dir}>{label}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    )
  }

  const rawColor = p.color !== undefined && p.color !== null && String(p.color).trim() !== "" ? p.color : "yellow"
  const tint = hueOf(rawColor, "#eab308")
  const kind = p.type === "figure" ? "figure" : "note"
  const author = p.author !== undefined && p.author !== null ? String(p.author).trim() : ""
  const who = author ? <strong className="fx-todo-author">{author}: </strong> : null
  const sample = textOf(node)
  const dir = resolveDir(p.dir, sample, context.language)
  const id = p.id ? String(p.id) : undefined

  if (kind === "figure") {
    return (
      <div className="fx-todo-figure-wrap" dir={dir}>
        <aside
          id={id}
          dir={dir}
          className={`fx-todo fx-todo-figure ${tint.className}`}
          style={{
            ...tint.style,
            width: lengthCss(p.width) ?? "100%",
            minHeight: lengthCss(p.height) ?? "12em",
          }}
        >
          <span className="fx-todo-figure-icon" aria-hidden="true"><Icon name="image" /></span>
          <div className="fx-todo-figure-caption">{who}{renderInlineChildren(node, context)}</div>
        </aside>
      </div>
    )
  }

  if (isBlockTodo(node)) {
    const children = node.children ?? []
    const first = children[0]
    const body = who && first?.type === "paragraph" ? (
      <>
        <p>{who}{context.children(first)}</p>
        {children.slice(1).map(ch => <React.Fragment key={ch.key}>{context.render(ch)}</React.Fragment>)}
      </>
    ) : (
      <>
        {who}
        {context.children(node)}
      </>
    )
    return (
      <aside id={id} dir={dir} className={`fx-todo fx-todo-block ${tint.className}`} style={tint.style}>
        <span className="fx-todo-icon" aria-hidden="true"><Icon name="thumbtack" /></span>
        <div className="fx-todo-body">{body}</div>
      </aside>
    )
  }

  return (
    <span id={id} dir={dir} className={`fx-todo fx-todo-inline ${tint.className}`} style={tint.style}>
      <span className="fx-todo-inline-icon" aria-hidden="true"><Icon name="thumbtack" /></span>
      {who}{renderInlineChildren(node, context)}
    </span>
  )
}
