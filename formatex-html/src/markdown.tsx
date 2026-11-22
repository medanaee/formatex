import React, { type CSSProperties, type ReactNode } from "react"
import { textOf, type Node, type Settings } from "@formatex/core"
import type { RenderContext } from "./components"
import { Icon, arabicScript, captionPosition, codeCaptionPosition, codeIsNumbered, codeLanguageInfo, digits, flowDir, lengthCss, presetHex } from "./kit"

const on = (value: unknown) => value === true || value === "true"
const ABJAD = ["الف", "ب", "ج", "د", "ه", "و", "ز", "ح", "ط", "ی", "ک", "ل", "م", "ن", "س", "ع", "ف", "ص", "ق", "ر", "ش", "ت", "ث", "خ", "ذ", "ض", "ظ", "غ"]
const ALEFBA = ["الف", "ب", "پ", "ت", "ث", "ج", "چ", "ح", "خ", "د", "ذ", "ر", "ز", "ژ", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ک", "گ", "ل", "م", "ن", "و", "ه", "ی"]
const MARKERS: Record<string, string> = { disc: "•", circle: "◦", square: "▪", dash: "–", triangle: "‣", arrow: "→", check: "✓", star: "★", none: "" }

/** `rtl`/`ltr` from config or `<dir>` win. `auto` follows the block's first letter, then the previous block. */
function spokenDir(node: Node, fallback?: unknown): "rtl" | "ltr" | "auto" | undefined {
  const scope = flowDir(node.props?._dir) ?? flowDir(fallback)
  if (scope === "rtl" || scope === "ltr") return scope
  const flow = flowDir(node.props?._flow)
  if (flow === "rtl" || flow === "ltr") return flow
  const sample = textOf(node)
  if (/\p{L}/u.test(sample)) return arabicScript(sample) ? "rtl" : "ltr"
  return scope
}

function persianWords(n: number): string {
  if (n === 0) return "صفر"
  if (n < 0) return String(n)
  const ones = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"]
  const teens = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"]
  const tens = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"]
  const hundreds = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"]
  const belowThousand = (value: number) => {
    const parts: string[] = []
    if (value >= 100) parts.push(hundreds[Math.floor(value / 100)] ?? "")
    const rest = value % 100
    if (rest >= 20) {
      parts.push(tens[Math.floor(rest / 10)] ?? "")
      if (rest % 10 > 0) parts.push(ones[rest % 10] ?? "")
    } else if (rest >= 10) parts.push(teens[rest - 10] ?? "")
    else if (rest > 0) parts.push(ones[rest] ?? "")
    return parts.filter(Boolean).join(" و ")
  }
  const thousands = Math.floor(n / 1000)
  const rest = n % 1000
  const parts: string[] = []
  if (thousands > 0) parts.push(thousands === 1 ? "هزار" : `${belowThousand(thousands)} هزار`)
  if (rest > 0) parts.push(belowThousand(rest))
  return parts.join(" و ")
}

function roman(n: number): string {
  if (n < 1) return String(n)
  const pairs: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]
  let out = ""
  let value = n
  for (const [amount, glyph] of pairs) while (value >= amount) { out += glyph; value -= amount }
  return out
}

function letters(n: number): string {
  let out = ""
  let value = n
  while (value > 0) {
    value -= 1
    out = String.fromCharCode(97 + (value % 26)) + out
    value = Math.floor(value / 26)
  }
  return out
}

export function formatListNumber(kind: string, n: number, rtl: boolean): string {
  const from = (all: string[]) => n >= 1 && n <= all.length ? all[n - 1] : digits(n, true)
  if (kind === "fa" || (kind === "auto" && rtl)) return digits(n, true)
  if (kind === "en" || kind === "auto") return String(n)
  if (kind === "fatxt") return persianWords(n)
  if (kind === "rome") return roman(n)
  if (kind === "abc") return n >= 1 ? letters(n) : String(n)
  if (kind === "abjad") return from(ABJAD)
  if (kind === "alefba") return from(ALEFBA)
  return rtl ? digits(n, true) : String(n)
}

function columnCount(document: RenderContext["document"]): number {
  const typ = document.settings.typ
  const configured = typ && typeof typ === "object" && !Array.isArray(typ) ? Number((typ as Settings).columns) : Number.NaN
  const tokens = Number((document.tokens as Settings).columns)
  const count = Number.isFinite(configured) && configured > 0 ? configured : tokens
  return Number.isFinite(count) && count > 0 ? count : 1
}

export function renderParagraph(node: Node, c: RenderContext, props: Settings): ReactNode {
  const onlyImage = node.children?.length === 1 && node.children[0]?.type === "image"
  return (
    <p className={onlyImage ? "fx-figure" : undefined} style={{ textAlign: on(props.justify) ? "justify" : undefined, letterSpacing: props["letter-spacing"] ? `${Number(props["letter-spacing"]) / 100}em` : undefined, lineHeight: props["line-spacing"] ? Number((1 + 0.42 * Number(props["line-spacing"]) / 100).toFixed(3)) : undefined, wordSpacing: props["word-spacing"] ? `${Number(props["word-spacing"]) - 100}%` : undefined }} dir={spokenDir(node, c.document.settings.dir)}>
      {c.children(node)}
    </p>
  )
}

export function renderHeading(node: Node, c: RenderContext, props: Settings, headingTop: number): ReactNode {
  const Tag = `h${Math.min(6, node.depth ?? 1)}` as "h1"
  const level = (node.depth ?? 1) - headingTop + 1
  const maxLevel = Number(props["max-level"] ?? 2)
  const local = node.props ?? {}
  const ownLook = local.underline !== undefined || local.fill !== undefined
  const within = level <= maxLevel
  const underline = on(props.underline) && (ownLook || within)
  const fill = on(props.fill) && (ownLook || within)
  const color = props.color ? String(props.color) : ""
  const hex = color.startsWith("#")
  const ink = hex ? color : color ? presetHex(color) : undefined
  const parts = String(node.props?._number ?? "").split(".").filter(part => part !== "")
  const maxNumber = Number(props["max-numbering-level"] ?? 6)
  const showNumber = parts.length > 0 && parts.length <= maxNumber
  const persian = spokenDir(node, c.document.settings.dir) === "rtl"
  const number = parts.map(part => digits(Number(part), persian)).join(".")
  const prefix = props["number-prefix"] ? String(props["number-prefix"]) : ""
  const suffix = props["number-suffix"] !== undefined && props["number-suffix"] !== null ? String(props["number-suffix"]) : ""
  const className = ["fx-heading", underline ? "fx-heading-rule" : "", fill ? "fx-heading-fill" : "", ink ? (hex ? "fx-heading-hex" : "fx-heading-ink") : ""].filter(Boolean).join(" ")
  return (
    <Tag id={node.props?.id ? String(node.props.id) : undefined} className={className} dir={spokenDir(node, c.document.settings.dir)} style={ink ? { ["--fx-heading-ink" as string]: ink } : undefined}>
      {showNumber && <span className="fx-heading-number">{prefix}{number}{suffix} </span>}
      {c.children(node)}
    </Tag>
  )
}

function marked(value: unknown, line: number): boolean {
  return String(value ?? "").split(",").some(range => {
    const match = /^(\d+)(?:-(\d+))?$/.exec(range.trim())
    return !!match && line >= Number(match[1]) && line <= Number(match[2] ?? match[1])
  })
}

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

export function renderFence(node: Node, c: RenderContext, props: Settings): ReactNode {
  const langInfo = codeLanguageInfo(props.lang || node.lang)
  const stored = c.assets[`code:${node.key}`]
  const source = (node.value ?? "").replace(/^\s*(```|~~~)[^\n]*\n?/, "").replace(/\n?(```|~~~)\s*$/, "").replace(/\n$/, "")
  const lines: string[] = stored ? JSON.parse(stored) : source.split("\n").map(escapeHtml)
  const caption = props.caption ? String(props.caption) : ""
  const numbered = codeIsNumbered(c.document.settings, node.props ?? {}) && c.numbers.has(node.key)
  const position = codeCaptionPosition(c.document.settings, props)
  const dir = spokenDir(node, c.document.settings.dir)
  const persian = dir === "rtl" || (caption ? arabicScript(caption) : c.document.settings.dir === "rtl" || c.language === "fa")
  const copy = props["copy-button"] !== false && props["copy-button"] !== "false"
  const copyLabel = c.language === "fa" ? "کپی" : "Copy"
  const wide = lines.length >= 100
  const captionNode = (numbered || caption) && (
    <figcaption className="fx-code-caption">
      {numbered && <span className="fx-code-number">{persian ? "کد" : "Listing"} {digits(c.numbers.get(node.key) ?? 0, persian)}</span>}
      {numbered && caption ? ": " : ""}
      {caption}
    </figcaption>
  )
  return (
    <figure id={props.id ? String(props.id) : undefined} className="fx-code-figure" dir={dir}>
      {position === "above" && captionNode}
      <div className={`fx-code${langInfo ? " fx-code-lang" : ""}${wide ? " fx-code-wide" : ""}`} dir="ltr">
        <div className="fx-code-frame">
          {(langInfo || copy) && (
            <div className={`fx-code-corner${langInfo && copy ? " fx-code-corner-both" : ""}`}>
              {copy && <button type="button" className="fx-copy" aria-label={copyLabel} title={copyLabel}><Icon name="copy" /></button>}
              {langInfo && <span className="fx-code-badge"><Icon name={langInfo.icon} /><span>{langInfo.name}</span></span>}
            </div>
          )}
          <pre><code>{lines.map((line, index) => <span key={index} className={`fx-code-line${marked(props.highlight, index + 1) ? " fx-code-highlight" : ""}`} data-line={index + 1} dangerouslySetInnerHTML={{ __html: line || " " }} />)}</code></pre>
        </div>
      </div>
      {position === "below" && captionNode}
    </figure>
  )
}

export function renderList(node: Node, c: RenderContext, props: Settings): ReactNode {
  const ordered = !!node.ordered
  const depth = Number(node.props?._listDepth ?? 0)
  const dir = spokenDir(node, c.document.settings.dir)
  const rtl = dir === "rtl"
  const kind = String(props.numbers ?? "auto")
  const suffix = props.suffix === undefined || props.suffix === null ? "." : String(props.suffix)
  const prefix = props.prefix === undefined || props.prefix === null ? "" : String(props.prefix)
  const names = String(props.marker ?? "disc,circle,dash").split(",").map(item => item.trim()).filter(Boolean)
  const markerName = names[depth % Math.max(1, names.length)] ?? "disc"
  const marker = MARKERS[markerName] ?? markerName
  const ownGuides = node.props?.guides === undefined || node.props?.guides === null ? "" : String(node.props.guides)
  const guides = ownGuides || (depth === 0 ? String(props.guides ?? "") : "")
  const guideClass = !ordered && (guides === "line" || guides === "tree" || guides === "none") ? ` fx-guides-${guides}` : ""
  const indent = lengthCss(props.indent)
  const id = props.id ? String(props.id) : undefined
  const caption = props.caption ? String(props.caption) : ""
  const numbered = c.numbers.has(node.key)
  const persian = rtl || arabicScript(caption)
  const position = captionPosition(c.document.settings, "list", props, "below")
  const captionNode = (numbered || caption) ? (
    <figcaption className="fx-list-caption">
      {numbered && <span className="fx-list-number">{persian ? "فهرست" : "List"} {digits(c.numbers.get(node.key) ?? 0, persian)}</span>}
      {numbered && caption ? ": " : ""}
      {caption}
    </figcaption>
  ) : null
  let index = node.start ?? 1
  const Tag = ordered ? "ol" : "ul"
  const list = (
    <Tag id={captionNode ? undefined : id} className={`fx-list${ordered ? " fx-list-ordered" : ""}${guideClass}`} dir={dir} style={indent ? { paddingInlineStart: indent } : undefined}>
      {(node.children ?? []).map(item => {
        if (item.type !== "listItem") return <React.Fragment key={item.key}>{c.render(item)}</React.Fragment>
        const task = item.checked !== undefined && item.checked !== null
        const current = index
        if (ordered) index += 1
        const mark = task ? (item.checked ? "☑" : "☐") : ordered ? `${prefix}${formatListNumber(kind, current, rtl)}${suffix}` : marker
        return (
          <li key={item.key} className={task ? "fx-task" : undefined}>
            <span className="fx-marker" aria-hidden="true">{mark}</span>
            <div className="fx-item">{c.children(item)}</div>
          </li>
        )
      })}
    </Tag>
  )
  if (!captionNode) return list
  return <figure id={id} className="fx-list-figure" dir={dir}>{position === "above" && captionNode}{list}{position === "below" && captionNode}</figure>
}

function cellAlign(value: unknown, column: unknown): CSSProperties["textAlign"] {
  const chosen = value ?? column ?? "center"
  return ["left", "right", "center", "start", "end"].includes(String(chosen)) ? chosen as CSSProperties["textAlign"] : "center"
}

export function renderTable(node: Node, c: RenderContext, props: Settings): ReactNode {
  const feel = String(c.document.settings.feel ?? (c.document.tokens as Settings)["feel-name"] ?? "formal")
  const look = feel === "friendly" ? "card" : feel === "standard" ? "lined" : "rules"
  const rows = node.children ?? []
  const full = props.width === "full" || (props.span === "all" && columnCount(c.document) > 1)
  const localAlign = node.props?.align ?? node.props?.["html.align"]
  const place = String(localAlign ?? (node.props?._align || props.align || "center"))
  const marginStyle: CSSProperties = place === "right"
    ? { marginLeft: "auto", marginRight: 0 }
    : place === "left"
      ? { marginLeft: 0, marginRight: "auto" }
      : place === "end"
        ? { marginInline: "auto 0" }
        : place === "start"
          ? { marginInline: "0 auto" }
          : { marginInline: "auto" }
  const caption = props.caption ? String(props.caption) : ""
  const numbered = c.numbers.has(node.key)
  const dir = spokenDir(node, c.document.settings.dir)
  const persian = dir === "rtl" || arabicScript(caption)
  const position = captionPosition(c.document.settings, "table", props, "above")
  const captionNode = (numbered || caption) ? (
    <figcaption className="fx-table-caption">
      {numbered && <span className="fx-table-number">{persian ? "جدول" : "Table"} {digits(c.numbers.get(node.key) ?? 0, persian)}</span>}
      {numbered && caption ? ": " : ""}
      {caption}
    </figcaption>
  ) : null
  const cell = (item: Node, header: boolean, index: number) => {
    const Tag = header ? "th" : "td"
    const align = cellAlign(header ? props["head-align"] : props["body-align"], node.align?.[index])
    return <Tag key={item.key} dir={spokenDir(item)} style={{ textAlign: align }}>{c.children(item)}</Tag>
  }
  return (
    <figure id={props.id ? String(props.id) : undefined} className={`fx-table fx-table-${look}${full ? "" : " fx-table-auto"}`} dir={dir} style={{ width: full ? "100%" : "fit-content", ...marginStyle }}>
      {position === "above" && captionNode}
      <div className="fx-table-frame">
        <table>
          {rows[0] && <thead><tr>{rows[0].children?.map((item, index) => cell(item, true, index))}</tr></thead>}
          <tbody>{rows.slice(1).map(row => <tr key={row.key}>{row.children?.map((item, index) => cell(item, false, index))}</tr>)}</tbody>
        </table>
      </div>
      {position === "below" && captionNode}
    </figure>
  )
}

export function renderQuote(node: Node, c: RenderContext): ReactNode {
  return <blockquote className="fx-quote" dir={spokenDir(node, c.document.settings.dir)}>{c.children(node)}</blockquote>
}

function mathHtml(html: string): string {
  return html.replaceAll("<math", '<math dir="ltr"')
}

export function renderMath(node: Node, html: string): ReactNode {
  const formula = mathHtml(html)
  if (node.type === "inlineMath") return <span className="fx-math" dir="ltr" dangerouslySetInnerHTML={{ __html: formula }} />
  const equation = node.props?._eqMode
  const show = equation === "all" || equation === "labelled"
  const persian = node.props?._eqDir === "rtl"
  const number = node.props?._eqNumber
  return (
    <div id={node.props?.id ? String(node.props.id) : undefined} className={`fx-math fx-display-math${persian ? " fx-eq-end" : ""}`} dir="ltr">
      <div className="fx-math-body" dir="ltr" dangerouslySetInnerHTML={{ __html: formula }} />
      {show && number !== undefined && <span className="fx-eq-number">({persian ? digits(Number(number), true) : String(number)})</span>}
    </div>
  )
}
