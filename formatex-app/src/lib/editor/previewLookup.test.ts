import { describe, expect, it } from "vitest"
import type { PageMap } from "@/lib/compiler"
import { previewPlaceOf } from "./previewLookup"

const run = (text: string, y: number) => ({ text, x: 10, y, w: 200, h: 10 })
const page = (texts: ReturnType<typeof run>[]) => ({ width: 500, height: 700, links: [], texts }) as unknown as PageMap

describe("previewPlaceOf", () => {
  const filler = Array.from({ length: 30 }, (_, i) => `filler paragraph number ${i} to keep the two places apart`)
  const source = ["# Intro", "", "the same words", "", "alpha beta", "", ...filler, "other text here", "", "the same words", "", "gamma delta"].join("\n")

  it("finds the page and height of a line", () => {
    const pages = [page([run("Intro", 40), run("alpha beta", 80)]), page([run("other text here", 100), run("gamma delta", 140)])]
    expect(previewPlaceOf(source, 5, 0, pages, true)).toEqual({ page: 0, y: 80, h: 10, approximate: false })
    expect(previewPlaceOf(source, 41, 0, pages, true)).toMatchObject({ page: 1, y: 140 })
  })

  it("settles a repeated line by what is around it", () => {
    const pages = [page([run("the same words", 100), run("alpha beta", 120)]), page([run("other text here", 50), run("the same words", 70), run("gamma delta", 90)])]
    expect(previewPlaceOf(source, 3, 0, pages, true)).toMatchObject({ page: 0, y: 100 })
    expect(previewPlaceOf(source, 39, 0, pages, true)).toMatchObject({ page: 1, y: 70 })
    // the same, for a file that is not the main one (no help from the position in the file)
    expect(previewPlaceOf(source, 39, 0, pages, false)).toMatchObject({ page: 1, y: 70 })
  })

  it("uses the nearest line with text for a blank line or a tag", () => {
    const pages = [page([run("alpha beta", 80)])]
    expect(previewPlaceOf(source, 6, 0, pages, true)).toMatchObject({ page: 0, y: 80, approximate: false })
  })

  it("picks the line of a long paragraph by the cursor's column", () => {
    const paragraph = "first sentence of the paragraph second sentence follows third sentence ends it"
    const pages = [page([run("first sentence of the paragraph", 100), run("second sentence follows", 112), run("third sentence ends it", 124)])]
    expect(previewPlaceOf(paragraph, 1, 3, pages, true)).toMatchObject({ y: 100 })
    expect(previewPlaceOf(paragraph, 1, 45, pages, true)).toMatchObject({ y: 112 })
    expect(previewPlaceOf(paragraph, 1, paragraph.length, pages, true)).toMatchObject({ y: 124 })
  })

  it("matches Persian text whose runs come in visual order", () => {
    const text = "این یک جمله‌ی فارسی است و ادامه دارد"
    const pages = [page([run("ادامه دارد", 100), run("این یک جمله‌ی فارسی است و", 100)])]
    expect(previewPlaceOf(`# عنوان\n\n${text}`, 3, 2, pages, true)).toMatchObject({ page: 0, y: 100, approximate: false })
  })

  it("guesses by position for the main file when no text matches, and not for another file", () => {
    const pages = [page([run("something else entirely", 10)]), page([run("and more of it", 10)])]
    const guess = previewPlaceOf("a line\nanother line\nthe last one here", 3, 0, pages, true)
    expect(guess).toMatchObject({ page: 1, approximate: true })
    expect(previewPlaceOf("a line\nanother line\nthe last one here", 3, 0, pages, false)).toBeNull()
  })

  it("gives nothing when there are no pages", () => {
    expect(previewPlaceOf("text here", 1, 0, [], true)).toBeNull()
    expect(previewPlaceOf("text here", 1, 0, [null], true)).toBeNull()
  })
})
