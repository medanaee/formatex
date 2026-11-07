/**
 * Where the code of the engine stands in a text of Markdown (src/preprocess/evaluate.typ): `{{ code }}` in the text and in attribute
 * values, which may take several lines, and has `[ ... ]` in it (a text of Markdown, which may have `{{ }}` of its own). Pure text work,
 * so the editor's colors, autocomplete, folding and the tests share it. Code (fenced and inline), `$math$` and comments are not looked
 * into, and `\{{` prints `{{` itself.
 */
export interface ExpressionRange {
  /** Where the `{{` is. */
  from: number
  /** After the `}}`, or null while it is not closed (a text being written). */
  to: number | null
  /** The code, as ranges: the parts outside the `[ ... ]` texts of Markdown (the brackets are in them). */
  code: [number, number][]
  /** The Markdown texts, as ranges between the brackets. */
  markdown: [number, number][]
  /** Nothing but a name (`year`, `setting.theme`), which is printed. */
  plain: boolean
  /** It stands in the open tag of a component, as the value of an attribute. */
  inTag: boolean
  /** The places of the values of the page (PAGE, PAGES, SECTION, SECTION_NUMBER) in the code. */
  page: [number, number][]
}

const blank = (text: string): string => text.replace(/[^\n]/g, " ")

/**
 * The text with its comments blanked out (same length, same lines). A comment ends at the first `-->`, except inside a fenced block that
 * stands in the comment (a mermaid arrow is code, not the end): the same rule as the engine's `strip-comments`.
 */
export function blankComments(text: string): string {
  if (!text.includes("<!--")) return text
  const lines = text.split("\n")
  let fence = ""
  let open = false
  let commentFence = ""
  for (let i = 0; i < lines.length; i++) {
    const match = /^\s{0,3}(`{3,}|~{3,})/.exec(lines[i])
    if (!open) {
      if (match) {
        const mark = match[1][0]
        if (fence === "") fence = mark
        else if (mark === fence) fence = ""
        continue
      }
      if (fence !== "") continue
    } else if (commentFence !== "") {
      if (match && match[1][0] === commentFence) commentFence = ""
      lines[i] = blank(lines[i])
      continue
    } else if (match) {
      commentFence = match[1][0]
      lines[i] = blank(lines[i])
      continue
    }
    const line = lines[i]
    let result = ""
    let at = 0
    while (at < line.length) {
      if (open) {
        const end = line.indexOf("-->", at)
        if (end < 0) {
          result += blank(line.slice(at))
          at = line.length
        } else {
          result += blank(line.slice(at, end + 3))
          at = end + 3
          open = false
        }
      } else {
        const start = line.indexOf("<!--", at)
        if (start < 0) {
          result += line.slice(at)
          at = line.length
        } else if ((line.slice(0, start).match(/`/g)?.length ?? 0) % 2 === 1) {
          // Not a comment inside inline code
          result += line.slice(at, start + 4)
          at = start + 4
        } else {
          result += line.slice(at, start)
          at = start
          open = true
        }
      }
    }
    lines[i] = result
  }
  return lines.join("\n")
}

/** The text with fenced and inline code, math and comments blanked out (same length, same lines). */
export function maskText(text: string): string {
  let out = blankComments(text)
  const lines = out.split("\n")
  let fence = ""
  for (let i = 0; i < lines.length; i++) {
    const match = /^\s{0,3}(`{3,}|~{3,})/.exec(lines[i])
    if (match) {
      const mark = match[1][0]
      if (fence === "") fence = mark
      else if (mark === fence) fence = ""
      lines[i] = blank(lines[i])
    } else if (fence !== "") lines[i] = blank(lines[i])
    else lines[i] = lines[i].replace(/`[^`\n]*`/g, blank).replace(/\$[^$\n]+\$/g, blank)
  }
  out = lines.join("\n")
  return out.replace(/\$\$[\s\S]*?\$\$/g, blank)
}

const PLAIN_NAME = /^\s*[\p{L}_][\p{L}\p{N}_-]*(?:\.[\p{L}\p{N}_-]+)*\s*$/u
const PAGE_NAME = /\b(?:PAGES|PAGE|SECTION_NUMBER|SECTION)\b/g

/** Code from `start` to its `}}`. Returns the index after the `}}`, or the end of the text when it is not closed. */
function scanCode(s: string, start: number, out: ExpressionRange[], expr: ExpressionRange): number {
  let i = start
  let depth = 0
  let from = start
  while (i < s.length) {
    const c = s[i]
    if (c === '"' || c === "'") {
      i++
      while (i < s.length && s[i] !== c && s[i] !== "\n") i += s[i] === "\\" ? 2 : 1
      i++
    } else if (c === "/" && s[i + 1] === "/") {
      while (i < s.length && s[i] !== "\n") i++
    } else if (c === "/" && s[i + 1] === "*") {
      const end = s.indexOf("*/", i + 2)
      i = end < 0 ? s.length : end + 2
    } else if (c === "(" || c === "{") {
      depth++
      i++
    } else if (c === ")") {
      depth--
      i++
    } else if (c === "}") {
      if (depth > 0) {
        depth--
        i++
      } else if (s[i + 1] === "}") {
        expr.code.push([from, i])
        return i + 2
      } else i++
    } else if (c === "[") {
      expr.code.push([from, i + 1])
      i = scanMarkdown(s, i + 1, out, expr)
      from = i - 1
    } else if (c === "\\") i += 2
    else i++
  }
  expr.code.push([from, s.length])
  return s.length
}

/** A text of Markdown from just after its `[`. Returns the index after the `]`. */
function scanMarkdown(s: string, start: number, out: ExpressionRange[], expr: ExpressionRange): number {
  let i = start
  let depth = 0
  let from = start
  while (i < s.length) {
    const c = s[i]
    if (c === "\\") i += 2
    else if (c === "[") {
      depth++
      i++
    } else if (c === "]") {
      if (depth === 0) {
        expr.markdown.push([from, i])
        return i + 1
      }
      depth--
      i++
    } else if (c === "{" && s[i + 1] === "{") {
      expr.markdown.push([from, i])
      const inner = openExpression(s, i)
      i = scanCode(s, i + 2, out, inner)
      inner.to = i >= s.length && s.slice(i - 2, i) !== "}}" ? null : i
      finish(inner, s)
      out.push(inner)
      from = i
    } else i++
  }
  expr.markdown.push([from, s.length])
  return s.length
}

function openExpression(s: string, from: number): ExpressionRange {
  const before = s.slice(0, from)
  const line = before.slice(before.lastIndexOf("\n") + 1)
  const open = line.lastIndexOf("<")
  const inTag = open >= 0 && /^<[A-Za-z]/.test(line.slice(open)) && line.lastIndexOf(">") < open
  return { from, to: null, code: [], markdown: [], plain: false, inTag, page: [] }
}

function finish(expr: ExpressionRange, s: string): void {
  const code = expr.code.map(([a, b]) => s.slice(a, b)).join("")
  expr.plain = expr.markdown.length === 0 && PLAIN_NAME.test(code)
  for (const [a, b] of expr.code) for (const match of s.slice(a, b).matchAll(PAGE_NAME)) expr.page.push([a + match.index, a + match.index + match[0].length])
}

/** The `{{ ... }}` of a text, in the order they start (an expression inside the Markdown of another comes with it). */
export function findExpressions(text: string): ExpressionRange[] {
  if (!text.includes("{{")) return []
  const masked = maskText(text)
  const found: ExpressionRange[] = []
  let at = masked.indexOf("{{")
  while (at >= 0) {
    if (masked[at - 1] === "\\") {
      at = masked.indexOf("{{", at + 2)
      continue
    }
    const expr = openExpression(masked, at)
    const end = scanCode(masked, at + 2, found, expr)
    expr.to = end >= masked.length && masked.slice(end - 2, end) !== "}}" ? null : end
    finish(expr, masked)
    found.push(expr)
    at = masked.indexOf("{{", end)
  }
  return found.sort((a, b) => a.from - b.from)
}

/** The expression the cursor is in: it starts before `pos` and is not closed before it. `code` is the code from its start up to `pos`. */
export function expressionAt(text: string, pos: number): { expr: ExpressionRange; code: string; inMarkdown: boolean } | null {
  const upTo = text.slice(0, pos)
  let best: ExpressionRange | null = null
  for (const expr of findExpressions(upTo)) if (expr.to === null && (best === null || expr.from > best.from)) best = expr
  if (!best) return null
  const inMarkdown = best.markdown.some(([a, b]) => pos >= a && pos <= b)
  const code = best.code.map(([a, b]) => upTo.slice(a, Math.min(b, pos))).join("")
  return { expr: best, code, inMarkdown }
}

/** Whether a line starts a `{{` that is closed on a later line (it can fold), and where the `}}` is. */
export function expressionFold(text: string, lineStart: number, lineEnd: number): { from: number; to: number } | null {
  const line = text.slice(lineStart, lineEnd)
  if (!line.includes("{{")) return null
  for (const expr of findExpressions(text)) {
    if (expr.from < lineStart || expr.from >= lineEnd || expr.to === null) continue
    if (expr.to <= lineEnd) continue
    // The `}}` stays visible: the fold ends where its line starts
    const close = expr.to - 2
    const closeLineStart = text.lastIndexOf("\n", close - 1) + 1
    if (closeLineStart - 1 <= lineEnd) return null
    return { from: lineEnd, to: closeLineStart - 1 }
  }
  return null
}
