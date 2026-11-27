/**
 * Where `$` / `$$` (LaTeX) and `%` / `%%` (Typst) equations stand in a Markdown text.
 * The same rules as the parser: `%%` may contain spaces and line breaks; a tight `%...%`
 * is inline Typst only when the formula touches both signs. `50%`, `% x %` and a percent
 * after a letter or digit stay prose. Fenced code, inline code, front matter and comments
 * are skipped.
 */

export type MathKind = "latex" | "typst"

export interface MathRegion {
  /** The opening delimiter. */
  from: number
  /** Just after the closing delimiter, or the end of an equation that is still open. */
  to: number
  /** Just after the opening delimiter. */
  innerFrom: number
  /** The closing delimiter, or `to` while it is not written yet. */
  innerTo: number
  kind: MathKind
  display: boolean
  /** False while the closing delimiter is not written yet. */
  closed: boolean
}

const blank = (match: string) => match.replace(/[^\n]/g, " ")

/** Front matter, comments, fenced code, inline code and URLs, blanked in place (same length, same lines). */
function shield(text: string): string {
  let out = text.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?=\r?\n|$)/, blank)
  out = out.replace(/<!--[\s\S]*?(?:-->|$)/g, blank)
  out = out.replace(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?(?:\n[ \t]*\1[^\n]*(?=\n|$)|$)/gm, blank)
  out = out.replace(/`[^`\n]*`/g, blank)
  out = out.replace(/(?:https?|ftp):\/\/[^\s<>"']+/gi, blank)
  out = out.replace(/mailto:[^\s<>"']+/gi, blank)
  out = out.replace(/(?<=\])\([^)\n]*\)/g, blank)
  return out
}

function escaped(text: string, index: number): boolean {
  let slashes = 0
  for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) slashes++
  return slashes % 2 === 1
}

function alnum(char: string | undefined): boolean {
  return !!char && /[\p{L}\p{N}]/u.test(char)
}

function lineEnd(text: string, index: number): number {
  const end = text.indexOf("\n", index)
  return end < 0 ? text.length : end
}

/** Every equation, closed or still being typed. Regions do not overlap. */
export function mathRegions(text: string): MathRegion[] {
  const src = shield(text)
  const regions: MathRegion[] = []
  let i = 0
  while (i < src.length) {
    const char = src[i]
    if ((char !== "$" && char !== "%") || escaped(src, i)) {
      i++
      continue
    }
    const kind: MathKind = char === "$" ? "latex" : "typst"
    if (src[i + 1] === char) {
      const innerFrom = i + 2
      let close = -1
      for (let j = innerFrom; j < src.length; j++) {
        if (src.startsWith(char + char, j) && !escaped(src, j)) {
          close = j
          break
        }
      }
      if (close < 0) {
        regions.push({ from: i, to: src.length, innerFrom, innerTo: src.length, kind, display: true, closed: false })
        break
      }
      regions.push({ from: i, to: close + 2, innerFrom, innerTo: close, kind, display: true, closed: true })
      i = close + 2
      continue
    }
    if (char === "%" && alnum(src[i - 1])) {
      i++
      continue
    }
    const next = src[i + 1]
    if (next === undefined || next === "\n" || /\s/.test(next)) {
      i++
      continue
    }
    const limit = lineEnd(src, i + 1)
    let close = -1
    let stop = limit
    for (let j = i + 2; j < limit; j++) {
      // Spaces in the middle are part of the formula (`%x - bar.v.triple%`, `$k := 1$`). Only a space glued to a delimiter keeps it prose.
      if (src[j] !== char || escaped(src, j)) continue
      if (src[j + 1] === char) {
        if (char === "%") {
          stop = j
          break
        }
        continue
      }
      if (/\s/.test(src[j - 1])) continue
      if (char === "%" && alnum(src[j + 1])) continue
      close = j
      break
    }
    if (close >= 0) {
      regions.push({ from: i, to: close + 1, innerFrom: i + 1, innerTo: close, kind, display: false, closed: true })
      i = close + 1
      continue
    }
    // A percent before a period (`%.`) is prose. An unclosed `%x^2` is still an equation, so completion can see it.
    // An unclosed `$` is not: consuming the rest of the line would hide the next real equation.
    const body = src.slice(i + 1, stop)
    if (char === "%" && /[\p{L}\p{N}]/u.test(body)) {
      regions.push({ from: i, to: stop, innerFrom: i + 1, innerTo: stop, kind, display: false, closed: false })
      i = stop
      continue
    }
    i++
  }
  return regions
}

/** The equation whose delimiters surround `pos`, including one that is still open at the end of the text. */
export function mathAt(text: string, pos: number): MathRegion | null {
  for (const region of mathRegions(text)) {
    const inside = region.closed ? pos > region.from && pos < region.to : pos > region.from && pos <= region.to
    if (inside) return region
  }
  return null
}

function inMathLiteral(text: string, region: MathRegion, pos: number): boolean {
  let quote = ""
  const limit = Math.min(pos, region.innerTo)
  for (let i = region.innerFrom; i < limit; i++) {
    const char = text[i]
    if (quote) {
      if (char === "\\") i++
      else if (char === quote || char === "\n") quote = ""
      continue
    }
    if (char === '"' || char === "'") quote = char
    else if (region.kind === "typst" && char === "/" && text[i + 1] === "/") {
      const end = text.indexOf("\n", i)
      if (end < 0 || end >= limit) return true
      i = end
    } else if (region.kind === "latex" && char === "%") {
      const end = text.indexOf("\n", i)
      if (end < 0 || end >= limit) return true
      i = end
    }
  }
  return quote !== ""
}

/** The Typst symbol or function name touching the cursor, when the cursor is in a Typst equation and not in a string or comment. */
export function typstNameAt(text: string, pos: number): { from: number; to: number; name: string } | null {
  const region = mathAt(text, pos)
  if (!region || region.kind !== "typst" || pos > region.innerTo || inMathLiteral(text, region, pos)) return null
  const before = text.slice(region.innerFrom, pos)
  const match = /[A-Za-z][A-Za-z0-9_.]*$/.exec(before)
  if (!match) return null
  const rest = /^[A-Za-z0-9_.]*/.exec(text.slice(pos, region.innerTo))?.[0] ?? ""
  return { from: pos - match[0].length, to: pos + rest.length, name: match[0] }
}
