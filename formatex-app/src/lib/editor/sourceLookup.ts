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
 * with their boxes; the run under the click is searched in the source (a run may continue over a line break of the source). When
 * it occurs in several places, the place whose neighbourhood holds the most of the other runs near the click wins, and the click's
 * place in the document (page and height) against each candidate's place in the file settles what is left.
 */
export function sourceLineAt(source: string, pages: (PageMap | null)[], pageIndex: number, x: number, y: number): number | null {
  const map = pages[pageIndex]
  if (!map) return null
  const lines = source.split("\n").map(normalizeText)
  // The whole text in one string, so a run is found even where the source breaks its line; `starts[i]` is where line i begins
  const starts: number[] = []
  let joined = ""
  for (const line of lines) {
    starts.push(joined.length)
    joined += line + " "
  }
  const lineOf = (offset: number): number => {
    let low = 0
    let high = starts.length - 1
    while (low < high) {
      const mid = (low + high + 1) >> 1
      if (starts[mid] <= offset) low = mid
      else high = mid - 1
    }
    return low
  }
  const progress = (pageIndex + Math.min(Math.max(y / map.height, 0), 1)) / pages.length

  // The run under the click, else the closest one on the same line of text
  let best: { text: string; distance: number; h: number } | null = null
  for (const run of map.texts) {
    const dy = y < run.y ? run.y - y : y > run.y + run.h ? y - (run.y + run.h) : 0
    const dx = x < run.x ? run.x - x : x > run.x + run.w ? x - (run.x + run.w) : 0
    const distance = dy * 4 + dx
    if (dy < run.h && (!best || distance < best.distance)) best = { text: run.text, distance, h: run.h }
  }
  if (!best) return null

  // The runs around the click (a few lines of text up and down): the neighbourhood a right place has to hold too
  const around = map.texts.filter((run) => Math.abs(run.y + run.h / 2 - y) < best.h * 4).map((run) => normalizeText(run.text)).filter((text) => text.length >= 3)

  const occurrences = (needle: string): number[] => {
    if (needle.length < 2) return []
    const found: number[] = []
    for (let at = joined.indexOf(needle); at !== -1 && found.length < 200; at = joined.indexOf(needle, at + 1)) found.push(at + Math.floor(needle.length / 2))
    return found
  }
  const words = normalizeText(best.text).split(" ").filter(Boolean)
  let hits = occurrences(words.join(" "))
  // Typst may break a run where the source does not (a hyphen, a link): try the longest word
  if (hits.length === 0 && words.length > 0) hits = occurrences([...words].sort((a, b) => b.length - a.length)[0])
  if (hits.length === 0) return null

  const score = (offset: number): number => {
    const near = joined.slice(Math.max(offset - 400, 0), offset + 400)
    return around.reduce((sum, text) => sum + (near.includes(text) ? 1 : 0), 0)
  }
  const total = lines.length
  let winner = hits[0]
  let top = -1
  let gap = Infinity
  for (const hit of hits) {
    const points = score(hit)
    const away = Math.abs(lineOf(hit) / total - progress)
    if (points > top || (points === top && away < gap)) {
      winner = hit
      top = points
      gap = away
    }
  }
  return lineOf(winner) + 1
}
