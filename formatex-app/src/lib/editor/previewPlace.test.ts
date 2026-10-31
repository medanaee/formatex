import { beforeEach, describe, expect, it } from "vitest"
import type { PageMap } from "@/lib/compiler"
import { useEditorStore } from "@/stores/useEditorStore"
import { previewPlaceForLine } from "./previewPlace"

const map = (ys: number[]) => ({ width: 500, height: 700, links: [], texts: ys.map((y) => ({ text: "October", x: 40, y, w: 100, h: 10 })) }) as unknown as PageMap
const source = "October\n\nOctober\n\nOctober\n"

describe("previewPlaceForLine", () => {
  beforeEach(() => {
    useEditorStore.setState({ mainFile: "main.md", pages: [{ hash: "a", svg: "", map: map([50, 90]) }, { hash: "b", svg: "", map: map([50]) }] })
  })

  it("uses the markers, which tell identical paragraphs apart", () => {
    useEditorStore.setState({
      markers: [
        { file: "main.md", line: 1, page: 1, x: 40, y: 48 },
        { file: "main.md", line: 3, page: 1, x: 40, y: 88 },
        { file: "main.md", line: 5, page: 2, x: 40, y: 48 },
      ],
    })
    expect(previewPlaceForLine("main.md", source, 3, 0)).toMatchObject({ page: 0, y: 90 })
    expect(previewPlaceForLine("main.md", source, 5, 0)).toMatchObject({ page: 1, y: 50 })
  })

  it("falls back to the text search when a build has no markers", () => {
    useEditorStore.setState({ markers: [] })
    expect(previewPlaceForLine("main.md", "alpha line\n", 1, 0)).toMatchObject({ approximate: true })
  })
})
