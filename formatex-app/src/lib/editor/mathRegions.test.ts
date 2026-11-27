import { describe, expect, it } from "vitest"
import { mathAt, mathRegions, typstNameAt } from "./mathRegions"
import { mathMarks } from "./mathSyntax"

describe("math regions", () => {
  it("reads display and tight inline typst math, and leaves ordinary percents", () => {
    const text = "See %x^2+y^2% and 50% of 20% but not % x %.\n%%\nsum_(i=1)^n i\n%%"
    const regions = mathRegions(text)
    expect(regions.map((region) => text.slice(region.innerFrom, region.innerTo))).toEqual(["x^2+y^2", "\nsum_(i=1)^n i\n"])
    expect(regions.every((region) => region.kind === "typst")).toBe(true)
    expect(regions.map((region) => region.display)).toEqual([false, true])
  })

  it("keeps LaTeX and does not look inside code", () => {
    const text = "$$ a^2 $$\n`%not%`\n```\n%% raw %%\n```\n$a$"
    const regions = mathRegions(text)
    expect(regions.map((region) => [region.kind, text.slice(region.innerFrom, region.innerTo)])).toEqual([
      ["latex", " a^2 "],
      ["latex", "a"],
    ])
  })

  it("allows spaces inside an inline Typst equation when the formula touches both signs", () => {
    const text = "من %x - bar.v.triple% و خانم"
    const regions = mathRegions(text)
    expect(regions.map((region) => text.slice(region.from, region.to))).toEqual(["%x - bar.v.triple%"])
    expect(regions[0].kind).toBe("typst")
    expect(regions[0].closed).toBe(true)
  })

  it("keeps spaces inside a LaTeX equation and still finds the next one", () => {
    const text = "متن $k := 1$ و $P_0$ و $\\text{CS}$"
    const regions = mathRegions(text)
    expect(regions.map((region) => text.slice(region.innerFrom, region.innerTo))).toEqual(["k := 1", "P_0", "\\text{CS}"])
    expect(regions.every((region) => region.kind === "latex" && region.closed)).toBe(true)
  })

  it("follows an unclosed display equation to the cursor", () => {
    const text = "%% bar.v.t"
    expect(mathAt(text, text.length)?.kind).toBe("typst")
    expect(typstNameAt(text, text.length)?.name).toBe("bar.v.t")
  })
})

describe("math syntax colors", () => {
  it("colors a typst equation by symbol, call, number and operator", () => {
    const text = "%% bar.v.triple + frac(1, 2) %%"
    const cls = (name: string) => mathMarks(text).find((mark) => text.slice(mark.from, mark.to) === name)?.cls
    expect(cls("%%")).toBe("cm-math-delim")
    expect(cls("bar.v.triple")).toBe("cm-math-sym")
    expect(cls("+")).toBe("cm-math-op")
    expect(cls("frac")).toBe("cm-math-fn")
    expect(cls("1")).toBe("cm-math-num")
  })

  it("colors a latex command", () => {
    const text = "$$\\frac{1}{2}$$"
    const cls = (name: string) => mathMarks(text).find((mark) => text.slice(mark.from, mark.to) === name)?.cls
    expect(cls("\\frac")).toBe("cm-math-cmd")
    expect(cls("1")).toBe("cm-math-num")
  })

  it("does not color a percent in prose", () => {
    expect(mathMarks("50% of it")).toEqual([])
  })
})
