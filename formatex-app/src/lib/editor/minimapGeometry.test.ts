import { describe, expect, it } from "vitest"
import { minimapGeometry } from "./minimapGeometry"

describe("scrolling fixed-scale minimap", () => {
  it("does not squeeze a long document into the viewport", () => {
    const first = minimapGeometry(10000, 1, 30, 600)
    expect(first.contentHeight).toBe(20000)
    expect(first.offset).toBe(0)
    expect(first.lastDraw - first.firstDraw).toBeLessThanOrEqual(301)
    expect(first.bandHeight).toBe(60)
  })
  it("scrolls its drawing window while keeping the viewport band in bounds", () => {
    for (const [first, last] of [[1, 30], [4000, 4030], [9971, 10000]]) {
      const geo = minimapGeometry(10000, first, last, 600)
      expect(geo.bandTop).toBeGreaterThanOrEqual(0)
      expect(geo.bandTop + geo.bandHeight).toBeLessThanOrEqual(600)
      if (first > 1) expect(geo.offset).toBeGreaterThan(0)
      expect(geo.lastDraw - geo.firstDraw).toBeLessThanOrEqual(301)
    }
  })
  it("keeps short documents at normal scale with no miniature scrolling", () => {
    expect(minimapGeometry(20, 1, 20, 600)).toMatchObject({ contentHeight: 40, offset: 0, firstDraw: 1, lastDraw: 20 })
  })
})
