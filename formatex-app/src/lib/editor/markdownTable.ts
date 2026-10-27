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

const width = (text: string): number => [...text].length

/** A cell as written in a row: the pipe is escaped, a line break cannot be there. */
const writeCell = (text: string): string => text.replace(/\r?\n/g, " ").replace(/\|/g, String.raw`\|`)

const delimiter = (align: Align, size: number): string => {
  const dashes = "-".repeat(Math.max(size, 3) - (align === "center" ? 2 : align ? 1 : 0))
  return align === "center" ? `:${dashes}:` : align === "left" ? `:${dashes}` : align === "right" ? `${dashes}:` : dashes
}

/** Pads every row to the number of columns of the header (a short row gets empty cells, a long one is cut). */
export function normalizeTable(table: ParsedTable): ParsedTable {
  const columns = Math.max(table.header.length, 1)
  const fit = <T,>(items: T[], filler: T): T[] => Array.from({ length: columns }, (_, index) => items[index] ?? filler)
  return { header: fit(table.header, ""), align: fit(table.align, null), rows: table.rows.map((row) => fit(row, "")) }
}

/** The table as lines of GFM, with the columns padded to the same width. */
export function serializeTable(input: ParsedTable): string[] {
  const table = normalizeTable(input)
  const cells = [table.header, ...table.rows].map((row) => row.map(writeCell))
  const sizes = table.header.map((_, column) => Math.max(3, ...cells.map((row) => width(row[column]))))
  const line = (row: string[]) => `| ${row.map((cell, column) => cell + " ".repeat(sizes[column] - width(cell))).join(" | ")} |`
  return [line(cells[0]), `| ${table.align.map((align, column) => delimiter(align, sizes[column])).join(" | ")} |`, ...cells.slice(1).map(line)]
}

/** `row` -1 is the header. */
export function setCell(table: ParsedTable, row: number, column: number, text: string): ParsedTable {
  const next = normalizeTable(table)
  if (row < 0) next.header[column] = text
  else if (next.rows[row]) next.rows[row][column] = text
  return next
}

/** A blank row at `index` of the body (0 is above the first row, `rows.length` below the last). */
export function insertRow(table: ParsedTable, index: number): ParsedTable {
  const next = normalizeTable(table)
  next.rows.splice(Math.min(Math.max(index, 0), next.rows.length), 0, next.header.map(() => ""))
  return next
}

export function deleteRow(table: ParsedTable, index: number): ParsedTable {
  const next = normalizeTable(table)
  next.rows.splice(index, 1)
  return next
}

/** A blank column at `index` (0 is before the first one). */
export function insertColumn(table: ParsedTable, index: number): ParsedTable {
  const next = normalizeTable(table)
  const at = Math.min(Math.max(index, 0), next.header.length)
  next.header.splice(at, 0, "")
  next.align.splice(at, 0, null)
  for (const row of next.rows) row.splice(at, 0, "")
  return next
}

/** A table keeps at least one column. */
export function deleteColumn(table: ParsedTable, index: number): ParsedTable {
  const next = normalizeTable(table)
  if (next.header.length <= 1) return next
  next.header.splice(index, 1)
  next.align.splice(index, 1)
  for (const row of next.rows) row.splice(index, 1)
  return next
}
