import type { PageMap, PageText, SourceMarker } from "@/lib/compiler"
import { previewPlaceOf, type PreviewPlace } from "@/lib/editor/previewLookup"
import { sourcePlaceAt, type SourcePlace } from "@/lib/editor/sourceLookup"

/**
 * The exact part of the mapping between the Markdown and the pages (ADR 0009, stage 1). The engine puts an invisible marker at the
 * start of every block of the source (a paragraph, heading, list item, table, quote, tag, code block) and the compiler reports where
 * Typst put each one: its file and line, and its page and point. So a source line belongs to the nearest marker at or above it in
 * the same file, and a place on a page belongs to the nearest marker above it. Both are exact down to the block; inside the block
 * the text search of `previewPlaceOf` / `sourcePlaceAt` is used, but only among the runs between this marker and the next, so
 * identical text elsewhere cannot be taken for it. Without markers (an engine that does not make them) the functions return `null`
 * and the caller falls back to the search over the whole document.
 */

/** Markers in the order they lie on the pages (the order in the array is the order of the source). */
const layoutOrder = new WeakMap<SourceMarker[], SourceMarker[]>()
function inLayoutOrder(markers: SourceMarker[]): SourceMarker[] {
  let sorted = layoutOrder.get(markers)
  if (!sorted) {
    sorted = [...markers].sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x)
    layoutOrder.set(markers, sorted)
  }
  return sorted
}

/** A point on the pages as one number, so "above" and "below" compare across pages. */
const PAGE = 1e6
const keyOf = (marker: SourceMarker): number => (marker.page - 1) * PAGE + marker.y
/** Markers of one row of text share its height, give or take. */
const SAME_ROW = 2
/**
 * Where a marker is measured: a list item's marker is on its first row's baseline, the marker of any other block is at the top of
 * the block, a little above its first row. A run of text is therefore compared by its baseline (a text run's box is 1.25 em high and
 * starts 0.85 em above the baseline), never by its middle, which lies above the baseline of its own row's marker. A run belongs to
 * the block of the last marker not below its baseline, give or take `SLACK` points.
 */
const BASELINE = 0.68
const SLACK = 1.5
const baselineOf = (page: number, y: number, h: number): number => page * PAGE + y + h * BASELINE

/** The block a marker starts: from the marker to the next one on the pages (or the end), as keys of `PAGE * page + y`. */
function blockRange(sorted: SourceMarker[], marker: SourceMarker): { from: number; to: number } {
  const from = keyOf(marker)
  const next = sorted.find((other) => keyOf(other) > from + SAME_ROW)
  return { from: from - SLACK, to: next ? keyOf(next) - SLACK : Infinity }
}

/** Where line `line` (1-based) of `file` is on the pages: the block it is in, and the row of text inside the block. */
export function placeFromMarkers(markers: SourceMarker[], pages: (PageMap | null)[], file: string, source: string, line: number, column: number): PreviewPlace | null {
  let found: SourceMarker | null = null
  for (const marker of markers) if (marker.file === file && marker.line <= line && (!found || marker.line > found.line)) found = marker
  if (!found) return null
  const { from, to } = blockRange(inLayoutOrder(markers), found)
  const refined = previewPlaceOf(source, line, column, pages, false, (page, y, h) => {
    const at = baselineOf(page, y, h)
    return at >= from && at < to
  })
  return refined && !refined.approximate ? refined : { page: found.page - 1, y: found.y, h: 12, approximate: false }
}

/** The marker whose block holds a click on page `pageIndex` (0-based) at (x, y) points: the nearest one above it, and in one row the nearest sideways. */
export function markerAt(markers: SourceMarker[], pageIndex: number, x: number, y: number, pages?: (PageMap | null)[]): SourceMarker | null {
  // The click is measured by the baseline of the row of text it is in, like the markers (a click high in a row is above that row's own marker)
  const row = pages?.[pageIndex]?.texts
    .filter((run) => y >= run.y && y <= run.y + run.h)
    .sort((a, b) => Math.abs(a.x + a.w / 2 - x) - Math.abs(b.x + b.w / 2 - x))[0]
  const at = row ? baselineOf(pageIndex, row.y, row.h) : pageIndex * PAGE + y
  let best: SourceMarker | null = null
  for (const marker of inLayoutOrder(markers)) {
    if (keyOf(marker) > at + SLACK) break
    if (!best || keyOf(marker) > keyOf(best) + SAME_ROW || (Math.abs(keyOf(marker) - keyOf(best)) <= SAME_ROW && Math.abs(marker.x - x) < Math.abs(best.x - x))) best = marker
  }
  return best
}

/** How many lines after a marker are searched when the next marker is not in the same file (an included file starts, or the file ends). */
const BLOCK_LINES = 60

/** The line and column of `marker`'s file that a click on page `pageIndex` at (x, y) points at; `source` is that file's text. The block's start when the clicked text has no source (a number, "Figure 1"). */
export function lineFromMarker(markers: SourceMarker[], pages: (PageMap | null)[], marker: SourceMarker, source: string, pageIndex: number, x: number, y: number): SourcePlace {
  const sorted = inLayoutOrder(markers)
  const { from, to } = blockRange(sorted, marker)
  const next = sorted.find((other) => keyOf(other) > keyOf(marker) + SAME_ROW)
  const lines = source.split("\n")
  const last = next && next.file === marker.file && next.line > marker.line ? next.line - 1 : Math.min(lines.length, marker.line + BLOCK_LINES - 1)
  const block = lines.slice(marker.line - 1, last).join("\n")
  const inside = sourcePlaceAt(block, pages, pageIndex, x, y, {
    keep: (page: number, run: PageText) => {
      const at = baselineOf(page, run.y, run.h)
      return at >= from && at < to
    },
  })
  return inside === null ? { line: marker.line, column: 1 } : { line: marker.line + inside.line - 1, column: inside.column }
}
