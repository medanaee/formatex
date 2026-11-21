import { Icon, hasIcon, hueOf, lengthCss, resolveDir, textOf } from "formatex"

function nonEmpty(value) {
  if (value === undefined || value === null) return ""
  return String(value).trim()
}

export default function Component({ node, context }) {
  const p = context.props(node)
  if (node.name === "user" || node.name === "ai") {
    const role = node.name
    const dir = resolveDir(p.dir, textOf(node), context.language)
    const rtl = dir === "rtl"
    const tint = hueOf(p.color, role === "user" ? "var(--accent)" : "var(--secondary)")
    const speaker = nonEmpty(p.name) || (role === "user" ? (rtl ? "شما" : "You") : (rtl ? "هوش مصنوعی" : "AI"))
    const rawIcon = nonEmpty(p.icon) || (role === "user" ? "user" : "robot")
    const iconName = hasIcon(rawIcon) ? rawIcon : (role === "user" ? "user" : "robot")
    return (
      <article id={p.id ? String(p.id) : undefined} dir={dir} className={`fx-chat-turn fx-chat-${role} ${tint.className}`} style={tint.style}>
        <div className="fx-chat-slot">
          <div className="fx-chat-bubble">
            <span className="fx-chat-bar" aria-hidden="true" />
            <div className="fx-chat-content">
              <header className="fx-chat-meta">
                <span className="fx-chat-meta-icon" aria-hidden="true"><Icon name={iconName} /></span>
                <span className="fx-chat-name">{speaker}</span>
              </header>
              <div className="fx-chat-body">{context.children(node)}</div>
            </div>
          </div>
        </div>
      </article>
    )
  }

  const rawStyle = nonEmpty(p.style) || "auto"
  const style = ["auto", "transcript", "assistant", "bubbles"].includes(rawStyle) ? rawStyle : "auto"
  const frame = p.frame !== false && p.frame !== "false"
  const title = nonEmpty(p.title)
  const maxWidth = lengthCss(nonEmpty(p.width) || "80%") ?? "80%"
  const messages = (node.children ?? []).filter(child => child.name === "user" || child.name === "ai")
  const dir = resolveDir(nonEmpty(p.dir) || "auto", messages[0] ? textOf(messages[0]) : "", context.language)
  const rtl = dir === "rtl"
  const userTint = hueOf(nonEmpty(p["user-color"]), "var(--accent)")
  const aiTint = hueOf(nonEmpty(p["ai-color"]), "var(--secondary)")

  return (
    <section
      id={p.id ? String(p.id) : undefined}
      dir={dir}
      className={`fx-chat fx-chat-${style} ${frame ? "fx-chat-framed" : "fx-chat-frameless"}`}
      style={{ ["--fx-chat-max" as string]: maxWidth }}
    >
      {title && (
        <header className="fx-chat-title">
          <Icon name="comments" />
          <span>{title}</span>
        </header>
      )}
      <div className="fx-chat-turns">
        {messages.map(msg => {
          const role = msg.name
          const mp = context.props(msg)
          const speaker = nonEmpty(mp.name) || nonEmpty(p[`${role}-name`]) || (role === "user" ? (rtl ? "شما" : "You") : (rtl ? "هوش مصنوعی" : "AI"))
          const rawIcon = nonEmpty(mp.icon) || nonEmpty(p[`${role}-icon`]) || (role === "user" ? "user" : "robot")
          const iconName = hasIcon(rawIcon) ? rawIcon : (role === "user" ? "user" : "robot")
          const tint = role === "user" ? userTint : aiTint
          return (
            <article key={msg.key} id={mp.id ? String(mp.id) : undefined} className={`fx-chat-turn fx-chat-${role} ${tint.className}`} style={tint.style}>
              <span className="fx-chat-avatar" aria-hidden="true"><Icon name={iconName} /></span>
              <div className="fx-chat-slot">
                <div className="fx-chat-bubble">
                  <span className="fx-chat-bar" aria-hidden="true" />
                  <div className="fx-chat-content">
                    <header className="fx-chat-meta">
                      <span className="fx-chat-meta-icon" aria-hidden="true"><Icon name={iconName} /></span>
                      <span className="fx-chat-name">{speaker}</span>
                    </header>
                    <div className="fx-chat-body">{context.children(msg)}</div>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
