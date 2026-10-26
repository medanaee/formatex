import type { PageMap } from "@/lib/compiler"

/** Lower case, without the Markdown and tag punctuation, Arabic letter forms unified, one space between words. */
export function normalizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ً-ٟـ‌‍]/g, "")
    .toLowerCase()
    .replace(/[*_`#>|[\]{}()$~"'=]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * The line of the Markdown source a click on the page points at. The preview is an image, so the compiler sends the text runs
 * with their boxes; the run under the click is searched in the source lines. A run that occurs on several lines is settled by
 * where the click lies in the document (page and height) against where each line lies in the file.
 */
export function sourceLineAt(source: string, pages: (PageMap | null)[], pageIndex: number, x: number, y: number): number | null {
  const map = pages[pageIndex]
  if (!map) return null
  const lines = source.split("\n").map(normalizeText)
  const total = lines.length
  const progress = (pageIndex + Math.min(Math.max(y / map.height, 0), 1)) / pages.length

  // The run under the click, else the closest one on the same line of text
  let best: { text: string; distance: number } | null = null
  for (const run of map.texts) {
    const dy = y < run.y ? run.y - y : y > run.y + run.h ? y - (run.y + run.h) : 0
    const dx = x < run.x ? run.x - x : x > run.x + run.w ? x - (run.x + run.w) : 0
    const distance = dy * 4 + dx
    if (dy < run.h && (!best || distance < best.distance)) best = { text: run.text, distance }
  }
  if (!best) return null

  const find = (needle: string): number[] => {
    if (needle.length < 2) return []
    const hits: number[] = []
    lines.forEach((line, index) => line.includes(needle) && hits.push(index))
    return hits
  }
  const words = normalizeText(best.text).split(" ").filter(Boolean)
  let hits = find(words.join(" "))
  // Typst may break a run where the source does not (a hyphen, a link): try the longest word
  if (hits.length === 0 && words.length > 0) hits = find([...words].sort((a, b) => b.length - a.length)[0])
  if (hits.length === 0) return null
  const nearest = hits.reduce((a, b) => (Math.abs(a / total - progress) <= Math.abs(b / total - progress) ? a : b))
  return nearest + 1
}
