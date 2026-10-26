import { describe, expect, it } from "vitest"
import { parseTable, splitRow } from "./markdownTable"

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
