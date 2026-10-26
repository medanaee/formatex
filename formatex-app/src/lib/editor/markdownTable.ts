export type Align = "left" | "center" | "right" | null

export interface ParsedTable {
  header: string[]
  align: Align[]
  rows: string[][]
}

/** Splits a table row into cells: on `|` that is not escaped (`\|`), without the outer pipes. */
export function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "")
  const cells: string[] = []
  let current = ""
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === "\\" && trimmed[i + 1] === "|") {
      current += "|"
      i++
    } else if (trimmed[i] === "|") {
      cells.push(current.trim())
      current = ""
    } else current += trimmed[i]
  }
  cells.push(current.trim())
  return cells
}

const alignOf = (cell: string): Align => {
  const left = cell.startsWith(":")
  const right = cell.endsWith(":")
  return left && right ? "center" : right ? "right" : left ? "left" : null
}

/** The lines of a GFM table (header, delimiter row, body) as cells; `null` when they are not a table. */
export function parseTable(lines: string[]): ParsedTable | null {
  if (lines.length < 2) return null
  const delimiter = splitRow(lines[1])
  if (!delimiter.every((cell) => /^:?-{1,}:?$/.test(cell))) return null
  return { header: splitRow(lines[0]), align: delimiter.map(alignOf), rows: lines.slice(2).map(splitRow) }
}
