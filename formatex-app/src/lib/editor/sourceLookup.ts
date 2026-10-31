import type { PageMap, PageText } from "@/lib/compiler"
import { inReadingOrder, isRtl, type Placed } from "@/lib/editor/readingOrder"

/** Lower case, without the Markdown and tag punctuation, Arabic letter forms unified, one space between words. */
export function normalizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ً-ٟـ‌‍]/g, "")
    .toLowerCase()
    .replace(/[*_`#>|[\]{}()$~"'=\\“”‘’«»]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const PUNCTUATION = new Set(Array.from("*_`#>|[]{}()$~\"'=\\“”‘’«»"))
const DROPPED = /[ً-ٟـ‌‍]/

/**
 * `normalizeText` of a line of the source together with where each character of the result came from: `origin[i]` is the index in
 * `text` of the character that became `result[i]`. Tags, diacritics and ZWNJ are gone and spaces are collapsed, so the two
 * differ; this is how a place in the normalized text becomes a column of the real line.
 */
export function normalizeWithMap(text: string): { text: string; origin: number[] } {
  const chars: { ch: string; at: number }[] = []
  let index = 0
  for (const tag of text.matchAll(/<[^>]*>/g)) {
    for (; index < tag.index; index++) chars.push({ ch: text[index], at: index })
    chars.push({ ch: " ", at: tag.index })
    index = tag.index + tag[0].length
  }
  for (; index < text.length; index++) chars.push({ ch: text[index], at: index })
  let out = ""
  const origin: number[] = []
  let space = true
  for (const { ch, at } of chars) {
    if (DROPPED.test(ch)) continue
    let c = ch === "ي" ? "ی" : ch === "ك" ? "ک" : ch.toLowerCase()
    if (PUNCTUATION.has(c) || /\s/.test(c)) c = " "
    if (c === " ") {
      if (space) continue
      space = true
    } else space = false
    out += c
    origin.push(at)
  }
  if (out.endsWith(" ")) {
    out = out.slice(0, -1)
    origin.pop()
  }
  return { text: out, origin }
}

/** A place in a file of the source: 1-based line and column. */
export interface SourcePlace {
  line: number
  column: number
}

/**
 * The line of the Markdown source a click on the page points at. The preview is an image, so the compiler sends the text runs
 * with their boxes; the run under the click is searched in the source (a run may continue over a line break of the source). When
 * it occurs in several places, the place whose neighbourhood holds the most of the other runs near the click wins, and the click's
 * place in the document (page and height) against each candidate's place in the file settles what is left.
 */
export function sourceLineAt(source: string, pages: (PageMap | null)[], pageIndex: number, x: number, y: number, block?: { keep: (page: number, run: PageText) => boolean }): number | null {
  return sourcePlaceAt(source, pages, pageIndex, x, y, block)?.line ?? null
}

/**
 * Like `sourceLineAt`, with the column too: where the click is inside the run (from its x, reversed for a right-to-left run) is
 * taken as a place in the run's words, and the column is the start of the word there. One long line of the source that Typst
 * breaks into several rows of text gives each row its own column.
 */
export function sourcePlaceAt(source: string, pages: (PageMap | null)[], pageIndex: number, x: number, y: number, block?: { keep: (page: number, run: PageText) => boolean }): SourcePlace | null {
  const map = pages[pageIndex]
  if (!map) return null
  const mapped = source.split("\n").map(normalizeWithMap)
  const lines = mapped.map((line) => line.text)
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
  // Inside one block (see `markerLookup.ts`) only its runs count, and the place in the document says nothing about the line
  const kept = (page: number, run: PageText) => !block || block.keep(page, run)
  const progress = (pageIndex + Math.min(Math.max(y / map.height, 0), 1)) / pages.length

  // The run under the click, else the closest one on the same line of text
  let best: { run: PageText; text: string; distance: number; h: number; x: number; w: number } | null = null
  for (const run of map.texts) {
    if (!kept(pageIndex, run)) continue
    const dy = y < run.y ? run.y - y : y > run.y + run.h ? y - (run.y + run.h) : 0
    const dx = x < run.x ? run.x - x : x > run.x + run.w ? x - (run.x + run.w) : 0
    const distance = dy * 4 + dx
    if (dy < run.h && (!best || distance < best.distance)) best = { run, text: run.text, distance, h: run.h, x: run.x, w: run.w }
  }
  if (!best) return null

  // The runs around the click (a few lines of text up and down): the neighbourhood a right place has to hold too
  const around = map.texts.filter((run) => kept(pageIndex, run) && Math.abs(run.y + run.h / 2 - y) < best.h * 4).map((run) => normalizeText(run.text)).filter((text) => text.length >= 3)

  const occurrences = (needle: string): number[] => {
    if (needle.length < 2) return []
    const found: number[] = []
    for (let at = joined.indexOf(needle); at !== -1 && found.length < 200; at = joined.indexOf(needle, at + needle.length)) found.push(at)
    return found
  }
  const words = normalizeText(best.text).split(" ").filter(Boolean)
  let needle = words.join(" ")
  let hits = occurrences(needle)
  // Typst may break a run where the source does not (a hyphen, a link): try the longest word
  if (hits.length === 0 && words.length > 0) {
    needle = [...words].sort((a, b) => b.length - a.length)[0]
    hits = occurrences(needle)
  }
  if (hits.length === 0) return null

  const score = (start: number): number => {
    const offset = start + Math.floor(needle.length / 2)
    const near = joined.slice(Math.max(offset - 400, 0), offset + 400)
    return around.reduce((sum, text) => sum + (near.includes(text) ? 1 : 0), 0)
  }
  const total = lines.length
  let winner = hits[0]
  let top = -1
  let gap = Infinity
  const tied: number[] = []
  for (const hit of hits) {
    const points = score(hit)
    const away = block ? 0 : Math.abs(lineOf(hit + Math.floor(needle.length / 2)) / total - progress)
    if (points > top || (points === top && away < gap)) {
      winner = hit
      top = points
      gap = away
      tied.length = 0
    }
    if (points === top && away === gap) tied.push(hit)
  }
  // Inside a block, equal places are told apart by order: the clicked run is the k-th of those with the same text, so its place is the k-th of the equal ones
  if (block && tied.length > 1) {
    const target = normalizeText(best.text)
    const all: (Placed & { run: PageText })[] = pages.flatMap((candidate, index) => (candidate?.texts ?? []).filter((run) => kept(index, run)).map((run) => ({ run, page: index, x: run.x, y: run.y, h: run.h, text: run.text })))
    const same = inReadingOrder(all.filter((entry) => normalizeText(entry.text) === target), all)
    const k = same.findIndex((entry) => entry.run === best!.run)
    if (k >= 0) winner = tied[Math.min(k, tied.length - 1)]
  }
  // Where in the run the click is, as a place in its words: the start of the word there
  const within = Math.min(Math.max((x - best.x) / Math.max(best.w, 1), 0), 1)
  let at = winner + Math.min(Math.floor((isRtl(best.text) ? 1 - within : within) * needle.length), needle.length - 1)
  while (at > winner && joined[at - 1] !== " ") at--
  const line = lineOf(at)
  const offset = Math.min(Math.max(at - starts[line], 0), Math.max(mapped[line].origin.length - 1, 0))
  return { line: line + 1, column: (mapped[line].origin[offset] ?? 0) + 1 }
}
