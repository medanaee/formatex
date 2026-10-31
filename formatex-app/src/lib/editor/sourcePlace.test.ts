import { describe, expect, it } from "vitest"
import type { PageMap } from "@/lib/compiler"
import { normalizeText, normalizeWithMap, sourcePlaceAt } from "./sourceLookup"

const run = (text: string, y: number, x = 10, w = 200) => ({ text, x, y, w, h: 10 })
const page = (texts: ReturnType<typeof run>[]) => ({ width: 500, height: 700, links: [], texts }) as unknown as PageMap
const wordAt = (source: string, column: number) => source.slice(column - 1).split(/[\s.,]/)[0]

describe("normalizeWithMap", () => {
  it("normalizes like normalizeText", () => {
    for (const text of ["# **Bold** text <b>x</b>  here", "كتاب ي َ‌ more", "  a  b  ", "«quote» ‘x’", ""]) {
      expect(normalizeWithMap(text).text).toBe(normalizeText(text))
    }
  })

  it("keeps where every character came from", () => {
    const line = "**Hi** <i>there</i> می‌شود"
    const { text, origin } = normalizeWithMap(line)
    expect(text).toBe("hi there میشود")
    expect(line[origin[text.indexOf("there")]]).toBe("t")
    expect(line[origin[text.indexOf("میشود")]]).toBe("م")
    expect(line[origin[text.indexOf("شود")]]).toBe("ش")
  })
})

describe("sourcePlaceAt: one long line of the source, several rows on the page", () => {
  const english = "The quick brown fox jumps over the lazy dog and then runs far away into the forest."
  const englishPage = page([run("The quick brown fox jumps over", 100), run("the lazy dog and then runs far", 112), run("away into the forest.", 124)])

  it("gives each row its own column", () => {
    expect(sourcePlaceAt(english, [englishPage], 0, 12, 116)).toEqual({ line: 1, column: english.indexOf("the lazy") + 1 })
    expect(sourcePlaceAt(english, [englishPage], 0, 12, 128)).toEqual({ line: 1, column: english.indexOf("away") + 1 })
    expect(sourcePlaceAt(english, [englishPage], 0, 12, 104)).toEqual({ line: 1, column: 1 })
  })

  it("goes to the clicked word from the x inside the row", () => {
    // the middle of «the lazy dog and then runs far»
    expect(wordAt(english, sourcePlaceAt(english, [englishPage], 0, 110, 116)!.column)).toBe("and")
    // the end of the row
    expect(wordAt(english, sourcePlaceAt(english, [englishPage], 0, 208, 116)!.column)).toBe("far")
  })

  it("reads a right-to-left row from its right end", () => {
    const persian = "سلام دنیا این یک متن طولانی فارسی است که چند خط می‌شود و ادامه دارد"
    const rows = page([run("سلام دنیا این یک", 100), run("متن طولانی فارسی", 112), run("است که چند خط می‌شود", 124), run("و ادامه دارد", 136)])
    // the right edge is the start of the row
    expect(wordAt(persian, sourcePlaceAt(persian, [rows], 0, 207, 116)!.column)).toBe("متن")
    // the left edge is its end
    expect(wordAt(persian, sourcePlaceAt(persian, [rows], 0, 12, 116)!.column)).toBe("فارسی")
    // a word with a ZWNJ is found whole
    expect(sourcePlaceAt(persian, [rows], 0, 12, 128)!.column).toBe(persian.indexOf("می‌شود") + 1)
  })

  it("puts the column on the real line when tags and marks come before the text", () => {
    const line = "**Bold** <b>text</b> and `code` words follow"
    const rows = page([run("Bold text and code words follow", 100)])
    expect(sourcePlaceAt(line, [rows], 0, 12, 104)).toEqual({ line: 1, column: 3 })
  })

  it("has no column for text that is not in the source", () => {
    expect(sourcePlaceAt(english, [page([run("Figure 1", 100)])], 0, 20, 104)).toBeNull()
  })
})

describe("sourcePlaceAt inside a block: repeated text", () => {
  const source = "red blue red blue red blue red blue"
  const rows = page([run("red blue red blue", 100), run("red blue red blue", 112)])
  const block = { keep: () => true }

  it("takes the k-th identical row for the k-th equal place", () => {
    expect(sourcePlaceAt(source, [rows], 0, 12, 104, block)).toEqual({ line: 1, column: 1 })
    expect(sourcePlaceAt(source, [rows], 0, 12, 116, block)).toEqual({ line: 1, column: 19 })
  })
})
