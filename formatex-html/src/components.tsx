import type { ReactNode } from "react"
import type { DocumentIR, Node, Settings } from "@formatex/core"

export interface RenderContext {
  document: DocumentIR
  props(node: Node): Settings
  render(node: Node): ReactNode
  children(node: Node): ReactNode
  assets: Record<string, string>
  asset(path: string, text?: boolean): string
  background(path: string): string
  graphic(node: Node, options?: { bodyOnly?: boolean }): ReactNode
  numbers: Map<string, number>
  targets: Map<string, Node>
  language: "fa" | "en"
}
export function cssLength(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined
  const s = String(value)
  if (s === "full" || s === "fill") return "100%"
  if (s === "auto") return "auto"
  if (/^-?\d+(\.\d+)?$/.test(s)) return `${s}px`
  if (/^-?\d+(\.\d+)?(px|pt|mm|cm|in|em|rem|%|vh|vw)$/.test(s)) return s
  return undefined
}
export const graphicTags = new Set(["cetz", "lilaq", "typ"])

/** The note sits above its number. Hover and keyboard focus open it; nothing is repeated at the end of the page. */
export function renderFootnote(id: string | undefined, label: string, body: ReactNode, dir?: "rtl" | "ltr", word?: ReactNode): ReactNode {
  return (
    <span className="fx-fn-wrap">
      {word}
      <sup className="fx-fn" id={id}>
        <button type="button" className="fx-fn-mark">{label}</button>
        <span className="fx-fn-pop" role="note" dir={dir}>{body}</span>
      </sup>
    </span>
  )
}

/** Tags that do not have their own package file yet. Standard Markdown is rendered separately. */
export function renderBuiltin(node: Node, _c: RenderContext): ReactNode {
  throw new Error(`No HTML implementation for <${node.name}>`)
}
