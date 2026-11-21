import { textOf } from "formatex"

export default function Component({ node, context }) {
  const label = textOf(node)
  const keys = label.split("+").map(key => key.trim()).filter(Boolean)
  const caps = keys.length ? keys : [label]
  return (
    <span className="fx-kbd-row" dir="ltr">
      {caps.map((key, index) => (
        <span key={`${key}-${index}`} className="fx-kbd-key">
          {index > 0 && <span className="fx-kbd-plus">+</span>}
          <kbd className="fx-kbd">{keys.length ? key : context.children(node)}</kbd>
        </span>
      ))}
    </span>
  )
}
