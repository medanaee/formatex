/** A fixed-scale miniature with a sliding viewport, rather than shrinking a long document into the available height. */
export function minimapGeometry(lines: number, first: number, last: number, height: number, row = 2) {
  const contentHeight = Math.max(1, lines) * row
  const start = Math.max(0, first - 1) * row
  const span = Math.max(row, (last - first + 1) * row)
  const progress = Math.min(1, start / Math.max(1, contentHeight - span))
  const offset = progress * Math.max(0, contentHeight - height)
  const bandHeight = Math.min(height, Math.max(14, span))
  const bandTop = Math.max(0, Math.min(height - bandHeight, start - offset))
  return { contentHeight, offset, bandHeight, bandTop, firstDraw: Math.max(1, Math.floor(offset / row) + 1), lastDraw: Math.min(lines, Math.ceil((offset + height) / row) + 1) }
}
