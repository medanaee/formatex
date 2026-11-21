import { Children, cloneElement, isValidElement, type ReactNode } from "react"

const BASES: Record<string, number> = { fa: 1776, ar: 1632, en: 48 }
const DIGIT_RE = /[0-9\u06F0-\u06F9\u0660-\u0669]/g

function convertString(text: string, targetBase: number): string {
  return text.replace(DIGIT_RE, ch => {
    const code = ch.charCodeAt(0)
    const base = code >= 1776 ? 1776 : code >= 1632 ? 1632 : 48
    return String.fromCharCode(targetBase + code - base)
  })
}

function convertNode(node: ReactNode, targetBase: number): ReactNode {
  if (typeof node === "string") return convertString(node, targetBase)
  if (typeof node === "number") return convertString(String(node), targetBase)
  if (Array.isArray(node)) return node.map((item, i) => convertNode(item, targetBase))
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children !== undefined) {
    return cloneElement(node, undefined, Children.map(node.props.children, child => convertNode(child, targetBase)))
  }
  return node
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const kind = String(p.type ?? "fa")
  const base = BASES[kind] ?? 1776
  return <span id={p.id ? String(p.id) : undefined} className="fx-digit">{convertNode(context.children(node), base)}</span>
}
