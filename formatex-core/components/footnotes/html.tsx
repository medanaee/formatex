import { Fragment } from "react"
import { arabicScript, digits, textOf } from "formatex"

export default function Component({ node, context }) {
  const p = context.props(node)
  const number = context.numbers.get(node.key)
  const flow = node.props?._flow === "rtl" || node.props?._flow === "ltr"
    ? node.props._flow
    : (node.props?._dir === "rtl" ? "rtl" : "ltr")
  const label = number !== undefined ? digits(number, flow === "rtl") : "*"
  const authored = node.props?.dir
  const forced = authored === "rtl" || authored === "ltr" ? authored : undefined
  const own = p.en ?? p.fa ?? p.text
  const noteDir = forced ?? (
    p.en !== undefined
      ? "ltr"
      : p.fa !== undefined
        ? "rtl"
        : (arabicScript(own !== undefined ? String(own) : textOf(node)) ? "rtl" : "ltr")
  )
  const inline = asNote => (node.children ?? []).map(child => (
    child.type === "paragraph"
      ? <span key={child.key} className={asNote ? "fx-fn-line" : undefined}>{context.children(child)}</span>
      : <Fragment key={child.key}>{context.render(child)}</Fragment>
  ))
  const word = own !== undefined ? inline(false) : undefined
  const body = own !== undefined ? String(own) : inline(true)
  return (
    <span id={p.id ? String(p.id) : undefined}>
      <span className="fx-fn-wrap">
        {word}
        <sup className="fx-fn" id={`note-ref-${node.key}`}>
          <button type="button" className="fx-fn-mark">{label}</button>
          <span className="fx-fn-pop" role="note" dir={noteDir}>{body}</span>
        </sup>
      </span>
    </span>
  )
}
