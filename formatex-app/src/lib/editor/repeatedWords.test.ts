import { describe, expect, it } from "vitest"
import type { PageMap } from "@/lib/compiler"
import { inReadingOrder } from "./readingOrder"
import { previewPlaceOf } from "./previewLookup"
import { sourcePlaceAt } from "./sourceLookup"

const word = (text: string, x: number, y: number) => ({ text, x, y, w: 40, h: 10 })
const page = (texts: ReturnType<typeof word>[]) => ({ width: 500, height: 700, links: [], texts }) as unknown as PageMap
const block = { keep: () => true }

// The same word four times, two to a row; Typst lists the words of a row left to right as they are drawn
const cases = [
  { name: "right-to-left", text: "تکبیر", rtl: true },
  { name: "left-to-right", text: "alpha", rtl: false },
]

describe.each(cases)("the same word four times in $name text", ({ text, rtl }) => {
  const source = [text, text, text, text].join(" ")
  const columns = [0, 1, 2, 3].map((i) => source.indexOf(text, i * (text.length + 1)) + 1)
  // Reading order: right to left (the first word has the largest x) in Persian, left to right in English
  const xs = rtl ? [160, 110] : [110, 160]
  const separate = page([word(text, xs[1], 100), word(text, xs[0], 100), word(text, xs[1], 112), word(text, xs[0], 112)])
  const first = rtl ? 160 : 110
  const second = rtl ? 110 : 160
  const click = (pageMap: PageMap, x: number, y: number) => sourcePlaceAt(source, [pageMap], 0, x, y, block)?.column

  it("gives each word its own column when every word is a run", () => {
    expect(click(separate, first + 5, 104)).toBe(columns[0])
    expect(click(separate, second + 5, 104)).toBe(columns[1])
    expect(click(separate, first + 5, 116)).toBe(columns[2])
    expect(click(separate, second + 5, 116)).toBe(columns[3])
  })

  it("gives each row and word its own column when a row is one run", () => {
    const rows = page([{ text: `${text} ${text}`, x: 110, y: 100, w: 90, h: 10 }, { text: `${text} ${text}`, x: 110, y: 112, w: 90, h: 10 }])
    // the start of a row is at the right end in Persian
    expect(click(rows, rtl ? 195 : 112, 104)).toBe(columns[0])
    expect(click(rows, rtl ? 112 : 195, 104)).toBe(columns[1])
    expect(click(rows, rtl ? 195 : 112, 116)).toBe(columns[2])
    expect(click(rows, rtl ? 112 : 195, 116)).toBe(columns[3])
  })

  it("finds the run of a place in the other direction", () => {
    const place = (column: number) => previewPlaceOf(source, 1, column - 1, [separate], true, () => true)
    expect(place(columns[0])).toMatchObject({ y: 100 })
    expect(place(columns[1])).toMatchObject({ y: 100 })
    expect(place(columns[2])).toMatchObject({ y: 112 })
    expect(place(columns[3])).toMatchObject({ y: 112 })
  })
})

describe("inReadingOrder", () => {
  const run = (text: string, x: number, y: number) => ({ page: 0, x, y, h: 10, text })

  it("reads a Persian row from the right and an English row from the left", () => {
    const persian = [run("تکبیر", 10, 100), run("تکبیر", 100, 100), run("تکبیر", 50, 101)]
    expect(inReadingOrder(persian, persian).map((r) => r.x)).toEqual([100, 50, 10])
    const english = [run("go", 100, 100), run("go", 10, 100.5), run("go", 50, 100)]
    expect(inReadingOrder(english, english).map((r) => r.x)).toEqual([10, 50, 100])
  })

  it("goes down the rows first, then across the pages", () => {
    const rows = [{ ...run("a", 10, 130), page: 1 }, run("a", 10, 112), run("a", 10, 100)]
    expect(inReadingOrder(rows, rows).map((r) => r.y)).toEqual([100, 112, 130])
  })

  it("takes the direction of the row, so an English word in a Persian sentence is read with it", () => {
    const row = [run("سلام دوست", 150, 100), run("word", 100, 100), run("word", 60, 100), run("دنیا زیبا", 10, 100)]
    const words = row.filter((r) => r.text === "word")
    expect(inReadingOrder(words, row).map((r) => r.x)).toEqual([100, 60])
  })
})
