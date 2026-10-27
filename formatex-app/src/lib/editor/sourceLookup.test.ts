import { describe, expect, it } from "vitest"
import type { PageMap } from "@/lib/compiler"
import { sourceLineAt } from "./sourceLookup"

const run = (text: string, y: number) => ({ text, x: 10, y, w: 200, h: 10 })
const page = (texts: ReturnType<typeof run>[]) => ({ width: 500, height: 700, links: [], texts }) as unknown as PageMap

describe("sourceLineAt", () => {
  const filler = Array.from({ length: 30 }, (_, i) => `filler paragraph number ${i} to keep the two places apart`)
  const source = ["# Intro", "", "the same words", "", "alpha beta", "", ...filler, "other text here", "", "the same words", "", "gamma delta"].join("\n")

  it("settles a repeated run by what is around it", () => {
    expect(sourceLineAt(source, [page([run("the same words", 100), run("gamma delta", 120)])], 0, 20, 102)).toBe(39)
    expect(sourceLineAt(source, [page([run("the same words", 100), run("alpha beta", 120)])], 0, 20, 102)).toBe(3)
  })

  it("finds a run that continues over a line break of the source", () => {
    const wrapped = "first part of a\nparagraph that goes on"
    expect(sourceLineAt(wrapped, [page([run("part of a paragraph", 50)])], 0, 20, 52)).toBe(1)
  })
})
