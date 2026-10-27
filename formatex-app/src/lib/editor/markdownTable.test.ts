import { describe, expect, it } from "vitest"
import { deleteColumn, deleteRow, insertColumn, insertRow, parseTable, serializeTable, setCell, splitRow, type ParsedTable } from "./markdownTable"

describe("tables", () => {
  it("splits a row into trimmed cells, with or without outer pipes", () => {
    expect(splitRow("| a | b |")).toEqual(["a", "b"])
    expect(splitRow("a | b")).toEqual(["a", "b"])
    expect(splitRow("| a \\| b | c |")).toEqual(["a | b", "c"])
    expect(splitRow("|  |  |")).toEqual(["", ""])
  })

  it("reads the header, alignment and rows", () => {
    expect(parseTable(["| ستون | Column |", "|:---:|---:|", "| یک | one |"])).toEqual({
      header: ["ستون", "Column"],
      align: ["center", "right"],
      rows: [["یک", "one"]],
    })
  })

  it("rejects text that is not a table", () => {
    expect(parseTable(["a | b", "c | d"])).toBeNull()
    expect(parseTable(["only one line"])).toBeNull()
  })
})

describe("editing a table", () => {
  const table: ParsedTable = { header: ["ستون", "Column"], align: ["center", "right"], rows: [["یک", "one"], ["دو", "two | pipe"]] }

  it("writes GFM that reads back as the same table, with a pipe escaped", () => {
    const lines = serializeTable(table)
    expect(lines[0]).toMatch(/^\| ستون +\| Column +\|$/)
    expect(lines[1]).toMatch(/^\| :-+: \| -+: \|$/)
    expect(parseTable(lines)).toEqual(table)
  })

  it("changes a cell, the header included", () => {
    expect(setCell(table, 0, 1, "uno").rows[0]).toEqual(["یک", "uno"])
    expect(setCell(table, -1, 0, "X").header).toEqual(["X", "Column"])
  })

  it("adds a row and a column where asked, and removes them again", () => {
    expect(insertRow(table, 1).rows.map((row) => row.join("|"))).toEqual(["یک|one", "|", "دو|two | pipe"])
    expect(insertRow(table, 99).rows).toHaveLength(3)
    const wider = insertColumn(table, 1)
    expect(wider.header).toEqual(["ستون", "", "Column"])
    expect(wider.align).toEqual(["center", null, "right"])
    expect(wider.rows[0]).toEqual(["یک", "", "one"])
    expect(deleteColumn(wider, 1)).toEqual(table)
    expect(deleteRow(table, 0).rows).toEqual([["دو", "two | pipe"]])
  })

  it("keeps a column, and pads a short row", () => {
    expect(deleteColumn({ header: ["a"], align: [null], rows: [["b"]] }, 0).header).toEqual(["a"])
    expect(serializeTable({ header: ["a", "b"], align: [null, null], rows: [["x"]] })[2]).toMatch(/^\| x +\| +\|$/)
  })
})
