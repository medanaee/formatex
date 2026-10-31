import { describe, expect, it } from "vitest"
import type { PageMap, SourceMarker } from "@/lib/compiler"
import { lineFromMarker, markerAt, placeFromMarkers } from "./markerLookup"

const run = (text: string, y: number, x = 40) => ({ text, x, y, w: 200, h: 10 })
const page = (texts: ReturnType<typeof run>[]) => ({ width: 500, height: 700, links: [], texts }) as unknown as PageMap
const marker = (file: string, line: number, pageNumber: number, y: number, x = 40): SourceMarker => ({ file, line, page: pageNumber, x, y })

describe("a document of identical paragraphs", () => {
  // «اکتبر» in every paragraph, four to a page, with a page break between: nothing in the text tells them apart
  const source = Array.from({ length: 12 }, () => "اکتبر").join("\n\n")
  const paragraphs = Array.from({ length: 12 }, (_, i) => ({ line: i * 2 + 1, page: Math.floor(i / 4) + 1, y: 50 + (i % 4) * 30 }))
  const markers = paragraphs.map((p) => marker("main.md", p.line, p.page, p.y))
  const pages = [1, 2, 3].map((n) => page(paragraphs.filter((p) => p.page === n).map((p) => run("اکتبر", p.y + 2))))

  it("finds the place of every line", () => {
    for (const p of paragraphs) {
      expect(placeFromMarkers(markers, pages, "main.md", source, p.line, 0)).toMatchObject({ page: p.page - 1, y: p.y + 2 })
    }
  })

  it("puts a blank line with the block above it", () => {
    // line 10 is the blank line after the fifth paragraph (line 9, second page, second row)
    expect(placeFromMarkers(markers, pages, "main.md", source, 10, 0)).toMatchObject({ page: 1, y: 52 })
  })

  it("finds the line of every click", () => {
    for (const p of paragraphs) {
      const hit = markerAt(markers, p.page - 1, 60, p.y + 6)
      expect(hit).toMatchObject({ line: p.line })
      expect(lineFromMarker(markers, pages, hit!, source, p.page - 1, 60, p.y + 6).line).toBe(p.line)
    }
  })
})

describe("placeFromMarkers", () => {
  const source = ["# Title", "", "first part of a long paragraph second sentence follows here", "", "next block"].join("\n")
  const markers = [marker("main.md", 1, 1, 40), marker("main.md", 3, 1, 80), marker("main.md", 5, 1, 140)]
  const pages = [page([run("Title", 42), run("first part of a long paragraph", 82), run("second sentence follows here", 94), run("next block", 142)])]

  it("takes the row of text inside the block from the cursor's column", () => {
    expect(placeFromMarkers(markers, pages, "main.md", source, 3, 2)).toMatchObject({ y: 82 })
    expect(placeFromMarkers(markers, pages, "main.md", source, 3, 45)).toMatchObject({ y: 94 })
  })

  it("is the block's start when its text is not found (generated text)", () => {
    expect(placeFromMarkers(markers, [page([run("???", 82)])], "main.md", source, 3, 0)).toEqual({ page: 0, y: 80, h: 12, approximate: false })
  })

  it("has nothing for a file or line without markers", () => {
    expect(placeFromMarkers(markers, pages, "other.md", "x", 1, 0)).toBeNull()
    expect(placeFromMarkers([], pages, "main.md", source, 3, 0)).toBeNull()
    expect(placeFromMarkers([marker("main.md", 5, 1, 140)], pages, "main.md", source, 3, 0)).toBeNull()
  })
})

describe("files brought in with <include>", () => {
  const main = ["Before", "", '<include src="part.md">', "", "After"].join("\n")
  const part = ["Included one", "", "Included two"].join("\n")
  const markers = [marker("main.md", 1, 1, 40), marker("part.md", 1, 1, 70), marker("part.md", 3, 1, 100), marker("main.md", 5, 1, 130)]
  const pages = [page([run("Before", 42), run("Included one", 72), run("Included two", 102), run("After", 132)])]

  it("maps a line of the included file", () => {
    expect(placeFromMarkers(markers, pages, "part.md", part, 3, 0)).toMatchObject({ y: 102 })
    expect(placeFromMarkers(markers, pages, "main.md", main, 5, 0)).toMatchObject({ y: 132 })
  })

  it("gives the file of a click", () => {
    const hit = markerAt(markers, 0, 60, 104)!
    expect(hit).toMatchObject({ file: "part.md", line: 3 })
    expect(lineFromMarker(markers, pages, hit, part, 0, 60, 104).line).toBe(3)
  })
})

describe("markerAt", () => {
  it("is the nearest marker above, across pages, and the nearest sideways in a row", () => {
    const markers = [marker("a.md", 1, 1, 600), marker("a.md", 5, 2, 50), marker("a.md", 9, 2, 300, 40), marker("a.md", 20, 2, 300, 300)]
    expect(markerAt(markers, 1, 60, 20)).toMatchObject({ line: 1 })
    expect(markerAt(markers, 1, 60, 200)).toMatchObject({ line: 5 })
    expect(markerAt(markers, 1, 60, 400)).toMatchObject({ line: 9 })
    expect(markerAt(markers, 1, 320, 400)).toMatchObject({ line: 20 })
    expect(markerAt([], 0, 1, 1)).toBeNull()
    expect(markerAt([marker("a.md", 1, 2, 10)], 0, 1, 500)).toBeNull()
  })
})

describe("list items that wrap over several lines", () => {
  // Three items of three visual lines each: every marker is at the top of its item, so the block of an item is its own lines
  const source = ["- First item text that goes on", "- Second item text that goes on", "- Third item text that goes on"].join(String.fromCharCode(10))
  const markers = [marker("main.md", 1, 1, 100), marker("main.md", 2, 1, 142), marker("main.md", 3, 1, 184)]
  const rows = (name: string, top: number) => [run(`${name} item text`, top), run("that goes on and on", top + 14), run("and on again", top + 28)]
  const pages = [page([...rows("First", 100), ...rows("Second", 142), ...rows("Third", 184)])]

  it("puts the line of an item on the item, not on the next one", () => {
    expect(placeFromMarkers(markers, pages, "main.md", source, 1, 0)).toMatchObject({ y: 100 })
    expect(placeFromMarkers(markers, pages, "main.md", source, 2, 0)).toMatchObject({ y: 142 })
  })

  it("gives the item for a click on any of its lines", () => {
    for (const [line, top] of [[1, 100], [2, 142], [3, 184]]) {
      for (const dy of [4, 18, 32]) {
        const hit = markerAt(markers, 0, 60, top + dy)!
        expect(hit.line).toBe(line)
        expect(lineFromMarker(markers, pages, hit, source, 0, 60, top + dy).line).toBe(line)
      }
    }
  })

  it("keeps an item that has no marker (it starts with markup) in the block above it", () => {
    const unmarked = [markers[0], markers[2]]
    const hit = markerAt(unmarked, 0, 60, 150)!
    expect(hit.line).toBe(1)
    expect(lineFromMarker(unmarked, pages, hit, source, 0, 60, 150).line).toBe(2)
  })
})

describe("a tight numbered list measured in the app (markers on the baseline of the first row)", () => {
  // Measured with `cargo test measure_markers` on this list in a Persian document: a list item's marker is at the baseline of its
  // row (the run's box starts 0.85 em above it and is 1.25 em high), so the middle of the row's own runs lies ABOVE its marker
  const items = [
    "WBS چیست و با یک لیست ساده‌ی کارها چه فرقی دارد؟",
    "تفاوت Activity، Summary Task و Milestone؟",
    "چرا Milestone مدت ندارد؟",
    "چهار نوع وابستگی را نام ببرید. کدام پرکاربردتر است؟",
    "Duration و Effort چه فرقی دارند؟ مثال بزنید.",
    "مسیر بحرانی چیست؟ آیا همیشه «مهم‌ترین کارها» هستند؟",
    "Total Slack و Free Slack را تعریف کنید.",
    "چرا ۴۴ ساعت در تنظیمات مهم است؟ اگر کسی ۵۵ ساعت کار کند، Overallocation چند درصد است؟",
    "تفاوت WBS در روش Predictive و Agile؟",
    "چرا در WBS این پروژه «Testing» قبل از «Pilot» می‌آید؟",
  ]
  const source = ["# Title", "", "Intro paragraph here.", "", ...items.map((text, i) => `${i + 1}. ${text}`)].join(String.fromCharCode(10))
  const firstLine = 5
  const tops = [119.33, 133.64, 147.94, 162.25, 176.55, 190.86, 205.16, 219.47, 233.77, 248.08]
  const markers = [marker("main.md", 1, 1, 70.87, 70.87), marker("main.md", 3, 1, 102.17, 70.87), ...tops.map((top, i) => marker("main.md", firstLine + i, 1, top + 8.5, 480 + (i % 3) * 5))]
  const pages = [
    page([
      { text: "Title", x: 473.56, y: 68.57, w: 33.77, h: 17.5 },
      { text: "Intro paragraph here", x: 433.17, y: 100.5, w: 91.24, h: 12.5 },
      ...items.flatMap((text, i) => [
        { text: `${i + 1}`, x: 513.67, y: tops[i], w: 5.37, h: 12.5 },
        ...text.split(" ").map((word, j) => ({ text: word, x: 500 - j * 30, y: tops[i], w: 25, h: 12.5 })),
      ]),
    ]),
  ]

  it("goes to the item of the cursor, not the next one", () => {
    items.forEach((_, i) => {
      expect(placeFromMarkers(markers, pages, "main.md", source, firstLine + i, 4)).toMatchObject({ y: tops[i] })
    })
  })

  it("gives the item of a click anywhere in its row, not the one before", () => {
    items.forEach((_, i) => {
      for (const dy of [0.5, 5, 9, 12]) {
        const hit = markerAt(markers, 0, 450, tops[i] + dy, pages)!
        expect(hit.line).toBe(firstLine + i)
        expect(lineFromMarker(markers, pages, hit, source, 0, 450, tops[i] + dy).line).toBe(firstLine + i)
      }
    })
  })
})
