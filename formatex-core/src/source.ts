import type { Node, DocumentIR } from "./model"

export interface SourceRange {
  file: string
  /** UTF-8 byte offsets, exclusive end. */
  start: number
  end: number
  /** JavaScript/editor offsets, exclusive end. */
  utf16Start: number
  utf16End: number
  generated: boolean
  textStart?: number
  textEnd?: number
}

export interface SourceHit { node: string; range: SourceRange; prefixEnd?: number }

/** Maps a rendered UTF-16 caret without searching source text. Decoded entities and
 * generated expressions map to their complete originating range. */
export function sourceAtText(source: SourceRange[], text: string, offset: number): { range: SourceRange; offset: number; end: number } | undefined {
  const at = Math.max(0, Math.min(offset, text.length))
  const range = source.find(r => (r.textStart ?? 0) <= at && at < (r.textEnd ?? text.length))
    ?? (at === text.length ? source.at(-1) : undefined)
  if (!range) return undefined
  const a = range.textStart ?? 0, b = range.textEnd ?? text.length
  const exact = !range.generated && range.utf16End - range.utf16Start === b - a
  const position = exact ? range.utf16Start + Math.max(0, Math.min(at - a, b - a)) : range.utf16Start
  return { range, offset: position, end: exact ? position : range.utf16End }
}

export function textAtSource(range: SourceRange, text: string, offset: number): number {
  const start = range.textStart ?? 0, end = range.textEnd ?? text.length
  return !range.generated && range.utf16End - range.utf16Start === end - start
    ? Math.max(start, Math.min(end, start + offset - range.utf16Start)) : start
}

/** Builds a per-file source index once, rather than scanning the document on cursor motion. */
export function sourceIndex(document: DocumentIR): Map<string, SourceHit[]> {
  const files = new Map<string, SourceHit[]>()
  const walk = (nodes: Node[]) => { for (const node of nodes) {
    for (const range of node.source ?? []) {
      const values = files.get(range.file) ?? []
      values.push({ node: node.key, range }); files.set(range.file, values)
    }
    if (node.children) walk(node.children)
    if (node.rich) for (const rich of Object.values(node.rich)) walk(rich)
  } }
  walk(document.children)
  for (const values of files.values()) {
    values.sort((a, b) => a.range.utf16Start - b.range.utf16Start || a.range.utf16End - b.range.utf16End)
    let end = 0
    for (const value of values) { end = Math.max(end, value.range.utf16End); value.prefixEnd = end }
  }
  return files
}

/** Returns the narrowest containing range; generated text navigates to its expression. */
export function nodeAt(index: Map<string, SourceHit[]>, file: string, offset: number): SourceHit | undefined {
  const values = index.get(file)
  if (!values?.length) return undefined
  let low = 0, high = values.length
  while (low < high) { const mid = (low + high) >>> 1; if (values[mid].range.utf16Start <= offset) low = mid + 1; else high = mid }
  let best: SourceHit | undefined
  for (let i = low - 1; i >= 0; i--) {
    const entry = values[i]
    if (entry.prefixEnd !== undefined && entry.prefixEnd < offset) break
    if (entry.range.utf16End > offset && (!best || entry.range.utf16End - entry.range.utf16Start < best.range.utf16End - best.range.utf16Start)) best = entry
  }
  return best ?? values[Math.max(0, low - 1)]
}
