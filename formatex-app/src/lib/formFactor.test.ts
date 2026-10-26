import { describe, expect, it } from "vitest"
import { BREAKPOINTS, formFactorFor } from "./formFactor"

describe("formFactorFor", () => {
  it("classifies widths at the Tailwind breakpoints", () => {
    expect(formFactorFor(360)).toBe("phone")
    expect(formFactorFor(BREAKPOINTS.tablet - 1)).toBe("phone")
    expect(formFactorFor(BREAKPOINTS.tablet)).toBe("tablet")
    expect(formFactorFor(820)).toBe("tablet")
    expect(formFactorFor(BREAKPOINTS.desktop - 1)).toBe("tablet")
    expect(formFactorFor(BREAKPOINTS.desktop)).toBe("desktop")
    expect(formFactorFor(1920)).toBe("desktop")
  })
})
