/** The text is mostly in a right-to-left script: a run of it is read from its right end. */
export const isRtl = (text: string): boolean => {
  let rtl = 0
  let ltr = 0
  for (const ch of text) {
    if (/[֐-ࣿיִ-﷿ﹰ-﻿]/.test(ch)) rtl++
    else if (/\p{L}/u.test(ch)) ltr++
  }
  return rtl > ltr
}

/** A run of text on a page: its box (points from the page's top left) and its words. */
export interface Placed {
  page: number
  x: number
  y: number
  h: number
  text: string
}

/** Runs at about the same height are one row. */
const sameRow = (a: Placed, b: Placed): boolean => a.page === b.page && Math.abs(a.y - b.y) < Math.min(a.h, b.h) / 2

/** Whether the row of `run` reads from right to left: the script most of the row's text is in (so an English word in a Persian sentence is read with it). */
function rowIsRtl(run: Placed, all: readonly Placed[]): boolean {
  return isRtl(all.filter((other) => sameRow(run, other)).map((other) => other.text).join(" "))
}

/**
 * `items` in the order a reader meets them: page by page, row by row, and within a row from the right in right-to-left text and
 * from the left in left-to-right text. Typst lists the runs of a line in visual order, so for Persian the first word has the
 * largest x. `all` is every run of the document (or block), which tells the direction of a row.
 */
export function inReadingOrder<T extends Placed>(items: readonly T[], all: readonly Placed[]): T[] {
  const rtl = new Map(items.map((item) => [item, rowIsRtl(item, all)] as const))
  return [...items].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page
    if (!sameRow(a, b)) return a.y - b.y
    return rtl.get(a) ? b.x - a.x : a.x - b.x
  })
}
