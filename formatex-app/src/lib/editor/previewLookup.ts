import type { PageMap, PageText } from "@/lib/compiler"
import { inReadingOrder } from "@/lib/editor/readingOrder"
import { normalizeText } from "@/lib/editor/sourceLookup"

/** A place in the typeset document: a page (0-based) and the box of a line of text on it, in points from the page's top. */
export interface PreviewPlace {
  page: number
  y: number
  h: number
  /** The place is guessed from the position in the file; the text could not be found in the pages. */
  approximate: boolean
}

/** How far from the cursor's line (in lines) the nearest line with text is looked for. */
const ANCHOR_REACH = 8
/** Lines on each side of the anchor that a run may continue into / that count as its neighbourhood. */
const NEAR = 2
const WIDE = 8
/** Runs shorter than this say nothing about where they are from. */
const MIN_RUN = 3
/** Points within which runs of one place are taken to belong together (a paragraph is shorter than a page). */
const CLUSTER = 500

const normalized = new WeakMap<PageText, string>()
const normalizedRun = (run: PageText): string => {
  let text = normalized.get(run)
  if (text === undefined) {
    text = normalizeText(run.text)
    normalized.set(run, text)
  }
  return text
}

interface Run {
  text: string
  page: number
  x: number
  y: number
  h: number
  /** Distance from the top of the first page, in points, counting the pages one under the other. */
  at: number
}

function flatten(pages: (PageMap | null)[], keep?: (page: number, y: number, h: number) => boolean): { runs: Run[]; total: number; offsets: number[] } {
  const runs: Run[] = []
  const offsets: number[] = []
  let total = 0
  pages.forEach((map, page) => {
    offsets.push(total)
    if (!map) return
    for (const run of map.texts) if (!keep || keep(page, run.y, run.h)) runs.push({ text: normalizedRun(run), page, x: run.x, y: run.y, h: run.h, at: total + run.y })
    total += map.height
  })
  return { runs, total, offsets }
}

/**
 * Where line `line` (1-based) of a Markdown file is in the typeset pages, or `null`. This is `sourceLineAt` the other way round:
 * the compiler reports the text runs of every page, and the text of the line (at its nearest line with words in it, when the line
 * itself is blank, a tag or an image) is searched among them. A run belongs to the line when its words are in the line, so the order
 * of the runs on the page (which Typst gives visually, not in reading order, for right-to-left text) does not matter. When the same
 * words occur in several places, the place whose neighbourhood holds the most of the lines around the cursor wins. In a long
 * paragraph the cursor's `column` picks the run of the line it is in. The text is searched in every file's output alike, so a
 * file brought in by `<include>` is found where it was placed.
 *
 * `keep` limits the runs searched (to those of one block, between two markers: see `markerLookup.ts`); the position in the file
 * then means nothing, so there is no guess either.
 *
 * `main` says the file is the one the document starts from: only then does the position in the file mean something about the
 * position in the document, so only then is it a tie-break between equal places and the fallback (marked `approximate`) when no
 * text matches.
 */
export function previewPlaceOf(source: string, line: number, column: number, pages: (PageMap | null)[], main: boolean, keep?: (page: number, y: number, h: number) => boolean): PreviewPlace | null {
  const { runs, total, offsets } = flatten(pages, keep)
  if (runs.length === 0 || total === 0) return null
  const raw = source.split("\n")
  const lines = raw.map(normalizeText)
  const index = Math.min(Math.max(line, 1), lines.length) - 1
  const progress = lines.length > 1 ? index / (lines.length - 1) : 0

  const guess = (): PreviewPlace | null => {
    if (!main || keep) return null
    const at = progress * total
    let page = offsets.findIndex((start, i) => at < (offsets[i + 1] ?? total) && at >= start)
    if (page < 0) page = offsets.length - 1
    return { page, y: at - offsets[page], h: 0, approximate: true }
  }

  // The line itself, else the nearest one with words, the earlier first
  let anchor = -1
  for (let d = 0; d <= ANCHOR_REACH && anchor < 0; d++) {
    for (const candidate of d === 0 ? [index] : [index - d, index + d]) {
      if (candidate >= 0 && candidate < lines.length && lines[candidate].length >= MIN_RUN) {
        anchor = candidate
        break
      }
    }
  }
  if (anchor < 0) return guess()

  const windowOf = (from: number, to: number) => {
    const first = Math.max(from, 0)
    const starts: number[] = []
    let text = ""
    for (let i = first; i <= Math.min(to, lines.length - 1); i++) {
      starts.push(text.length)
      text += lines[i] + " "
    }
    return { text, starts, first }
  }
  const near = windowOf(anchor - NEAR, anchor + NEAR)
  const wide = windowOf(anchor - WIDE, anchor + WIDE).text
  const lineAt = (offset: number): number => {
    let low = 0
    let high = near.starts.length - 1
    while (low < high) {
      const mid = (low + high + 1) >> 1
      if (near.starts[mid] <= offset) low = mid
      else high = mid - 1
    }
    return near.first + low
  }

  // Every run whose words are in the neighbourhood of the anchor, with how many lines from the anchor it is found
  interface Match {
    run: Run
    away: number
    /** Where in the anchor line's normalized text the run lies, when it is in that line. */
    offset: number
  }
  const matches: Match[] = []
  for (const run of runs) {
    if (run.text.length < MIN_RUN) continue
    let best = Infinity
    let offset = -1
    let seen = 0
    for (let at = near.text.indexOf(run.text); at !== -1 && seen < 8; at = near.text.indexOf(run.text, at + 1), seen++) {
      const found = lineAt(at)
      const away = Math.abs(found - anchor)
      if (away < best) {
        best = away
        offset = found === anchor ? at - near.starts[anchor - near.first] : -1
      }
    }
    if (best !== Infinity) matches.push({ run, away: best, offset })
  }
  if (matches.length === 0) return guess()

  // Only the nearest lines count: the anchor's own runs, or when it has none, those of its neighbours
  const nearest = Math.min(...matches.map((match) => match.away))
  const own = matches.filter((match) => match.away === nearest)

  // A place is as likely as the lines around the cursor are in the runs around the place
  const score = (match: Match): number => {
    let sum = 0
    for (const other of runs) {
      if (other.page !== match.run.page || other.text.length < MIN_RUN || Math.abs(other.y - match.run.y) > match.run.h * 4) continue
      if (wide.includes(other.text)) sum += Math.min(other.text.length, 30)
    }
    return sum
  }
  const scored = own.map((match) => ({ match, points: score(match) }))
  const top = Math.max(...scored.map((entry) => entry.points))
  const strong = scored.filter((entry) => entry.points >= top * 0.7)
  // The best-scored place; equal places are told apart by where the line is in the file
  let seed = strong[0]
  let gap = Infinity
  for (const entry of strong) {
    const away = main && !keep ? Math.abs(entry.match.run.at / total - progress) : 0
    if (entry.points > seed.points || (entry.points === seed.points && away < gap)) {
      seed = entry
      gap = away
    }
  }

  // The runs of the same place; the cursor's column picks the one it is in
  const cluster = strong.filter((entry) => Math.abs(entry.match.run.at - seed.match.run.at) <= CLUSTER).map((entry) => entry.match)
  let chosen = seed.match
  if (nearest === 0 && cluster.length > 1) {
    const size = lines[anchor].length
    const length = Math.max(raw[anchor].length, 1)
    const target = anchor === index ? Math.min(Math.max(column / length, 0), 1) * size : anchor < index ? size : 0
    // Equal runs (the same word on several rows, or in several runs of one row) all match the first place of it in the line: the
    // k-th of them in reading order is its k-th place
    const byText = new Map<string, Match[]>()
    for (const match of cluster) byText.set(match.run.text, [...(byText.get(match.run.text) ?? []), match])
    for (const [text, group] of byText) {
      if (group.length < 2) continue
      const places: number[] = []
      for (let at = lines[anchor].indexOf(text); at !== -1; at = lines[anchor].indexOf(text, at + text.length)) places.push(at)
      if (places.length < 2) continue
      const ordered = inReadingOrder(group.map((match) => match.run), runs)
      for (const match of group) match.offset = places[Math.min(ordered.indexOf(match.run), places.length - 1)]
    }
    let distance = Infinity
    for (const match of cluster) {
      if (match.offset < 0) continue
      const away = target < match.offset ? match.offset - target : target > match.offset + match.run.text.length ? target - (match.offset + match.run.text.length) : 0
      if (away < distance) {
        distance = away
        chosen = match
      }
    }
  }
  return { page: chosen.run.page, y: chosen.run.y, h: chosen.run.h, approximate: false }
}
