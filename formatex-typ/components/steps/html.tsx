import { digits, flowDir, paintOf } from "formatex"

export default function Component({ node, context }) {
  if (node.name === "step") return <div className="fx-step-body">{context.children(node)}</div>
  const p = context.props(node)
  const feel = String(context.document.settings.feel ?? "formal")
  const shape = feel === "friendly" ? "solid" : feel === "standard" ? "soft" : "square"
  const paint = p.color ? paintOf(p.color) : null
  const dir = flowDir(p.dir)
  const rtl = dir === "rtl" || (dir !== "ltr" && context.language === "fa")
  const start = Number(p.start ?? 1)
  const steps = (node.children ?? []).filter(child => child.name === "step")
  return (
    <ol id={p.id ? String(p.id) : undefined} dir={dir} className={`fx-steps fx-steps-${shape}${paint ? ` ${paint.className}` : ""}`} style={paint?.style}>
      {steps.map((step, index) => {
        const title = step.props?.title ? String(step.props.title) : ""
        return (
          <li key={step.key} className="fx-step">
            <span className="fx-step-mark">{digits(start + index, rtl)}</span>
            <div className="fx-step-body">
              {title && <strong className="fx-step-title">{title}</strong>}
              {context.children(step)}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
