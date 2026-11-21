import type { CSSProperties, ReactNode } from "react"
import { textOf, type DocumentIR, type Node, type Settings } from "@formatex/core"
import { arabicScript, digits } from "./kit"

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
const string = (v: unknown, fallback = "") => v === undefined || v === null ? fallback : String(v)
const yes = (v: unknown, fallback = false) => v === undefined ? fallback : v === true || v === "true"
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
export function renderBuiltin(node: Node, c: RenderContext): ReactNode {
  const p = c.props(node), name = node.name!, fa = c.language === "fa"
  const children = () => c.children(node)
  const title = string(p.title)
  const direction = ["rtl", "ltr", "auto"].includes(string(p.dir)) ? string(p.dir) as "rtl" | "ltr" | "auto" : undefined
  const number = c.numbers.get(node.key)
  const style: CSSProperties = {
    width: cssLength(p.width), height: cssLength(p.height),
    color: p.color ? `var(--${string(p.color)}, ${string(p.color)})` : undefined,
    textAlign: ["left", "right", "center", "justify", "start", "end"].includes(string(p.align)) ? string(p.align) as CSSProperties["textAlign"] : undefined,
  }
  const common = { id: p.id && name !== "def" ? String(p.id) : undefined, dir: direction, style }
  const image = (src: unknown, alt: unknown = "", props: CSSProperties = {}) => <img src={c.asset(String(src ?? ""))} alt={string(alt)} style={props} />
  switch (name) {
    case "img": return <span {...common} className="fx-image">{image(p.src, p.alt, { width: cssLength(p.width), height: cssLength(p.height), aspectRatio: p.ratio ? String(p.ratio).replace(":", "/") : undefined, objectFit: "cover", borderRadius: cssLength(p.radius) })}</span>
    case "align": return <div {...common} className="fx-align" style={{ ...style, textAlign: string(p.to, "center") as CSSProperties["textAlign"] }}>{children()}</div>
    case "dir": return <div {...common} dir={string(p.to, "auto") as "rtl" | "ltr" | "auto"}>{children()}</div>
    case "p": return <div {...common} className="fx-paragraph" style={{ ...style, fontFamily: p.font ? String(p.font) : undefined, fontSize: cssLength(p.size), fontWeight: p.weight ? String(p.weight) as CSSProperties["fontWeight"] : undefined, textIndent: cssLength(p.indent), lineHeight: p.leading ? String(p.leading) : undefined }}>{children()}</div>
    case "div": return <div {...common} className={`fx-div ${string(p.class)} ${string(p.tailwind)}`}>{children()}</div>
    case "icon": return <span className="fx-icon" aria-hidden="true">{({ check: "✓", star: "★", warning: "⚠", xmark: "×", info: "ⓘ" } as Record<string, string>)[string(p.name)] ?? "•"}</span>
    case "a": return <a {...common} href={string(p.href)}>{children()}</a>
    case "span": case "anchor": return <span {...common} className={string(p.tailwind)} style={{ ...style, background: yes(p.highlight) ? "color-mix(in srgb,var(--accent) 25%,transparent)" : undefined }}>{children()}</span>
    case "ref": case "def": {
      const targetId = string(p.to ?? p.id)
      const target = c.targets.get(targetId)
      const value = target && c.numbers.get(target.key)
      const eqNumber = value === undefined ? "" : target?.props?._eqDir === "rtl" ? digits(Number(value), true) : String(value)
      const label = name === "ref" && node.children?.length ? children() : title || (target ? target.type === "math" ? `(${eqNumber})` : target.name ? `${target.name} ${value ?? ""}` : textOf(target) : string(p.to))
      return <span {...common}><a href={`#${target?.props?.id ?? targetId}`}>{label}</a>{name === "def" && node.children?.length ? <>: {children()}</> : null}</span>
    }
    case "counter": return <span {...common}>{string(p.name)} {number}{children()}</span>
    case "digit": return <span {...common}>{children()}</span>
    case "toc": case "lof": case "lot": case "lol": {
      const nodes = Array.from(new Set(c.targets.values())).filter(n => name === "toc" ? n.type === "heading" && yes(c.props(n).toc, true) : name === "lof" ? n.name === "fig" || ((n.name === "tree" || n.name === "chart") && yes(c.props(n).lof, true) && (c.numbers.has(n.key) || !!c.props(n).caption)) : name === "lot" ? n.type === "table" : n.type === "code" || n.name === "code")
      return <nav {...common} className="fx-toc"><header>{title || (fa ? "فهرست" : "Contents")}</header><ul>{nodes.map(n => <li key={n.key} style={{ paddingInlineStart: `${Math.max(0, (n.depth ?? 1) - 1)}em` }}><a href={`#${n.props?.id}`}>{c.numbers.get(n.key)} {n.type === "heading" ? textOf(n) : string(n.props?.caption, textOf(n).slice(0, 80))}</a></li>)}</ul></nav>
    }
    case "fn": case "footnote": {
      const flow = node.props?._flow === "rtl" || node.props?._flow === "ltr" ? node.props._flow : node.props?._dir === "rtl" ? "rtl" : "ltr"
      const label = number !== undefined ? digits(number, flow === "rtl") : "*"
      const authored = node.props?.dir
      const forced = authored === "rtl" || authored === "ltr" ? authored : undefined
      const own = p.en ?? p.fa ?? p.text
      const noteDir = forced ?? (p.en !== undefined ? "ltr" : p.fa !== undefined ? "rtl" : arabicScript(own !== undefined ? String(own) : textOf(node)) ? "rtl" : "ltr")
      const inline = (asNote: boolean) => (node.children ?? []).map(child => child.type === "paragraph" ? <span key={child.key} className={asNote ? "fx-fn-line" : undefined}>{c.children(child)}</span> : c.render(child))
      return <span {...common}>{renderFootnote(`note-ref-${node.key}`, label, own !== undefined ? String(own) : inline(true), noteDir, own !== undefined ? inline(false) : undefined)}</span>
    }
    case "hr": return <hr {...common} style={{ ...style, borderBlockStartStyle: string(p.style, "solid") as CSSProperties["borderBlockStartStyle"] }} />
    case "v": return <div className="fx-space" style={{ height: cssLength(p.size) ?? "1em" }} />
    case "pagebreak": return <div className="fx-pagebreak" style={{ breakAfter: p.to === "even" ? "left" : p.to === "odd" ? "right" : "page" }} />
    case "cite": return <a {...common} href={`#bib-${string(p.key)}`}>[{string(p.key)}]</a>
    case "bibliography": return <section {...common} className="fx-bibliography">{children()}</section>
    default: throw new Error(`No HTML implementation for <${name}>`)
  }
}
