import { describe, expect, it } from "vitest"
import type { Diagnostic } from "@/lib/compiler"
import { locateDiagnostics } from "./diagnosticSource"

const problem = (message: string, path: string | null = "src/conf.typ", line: number | null = 266): Diagnostic => ({ severity: "error", message, path, line, column: 1, hints: [] })

describe("locateDiagnostics", () => {
  const md = ["# Title", "", "text", "", "{width=abc}", "| a | b |", "|---|---|", "", '<alert type="loud">hi</alert>', "", "- plain"].join("\n")

  it("finds the line a value in the message came from", () => {
    const [found] = locateDiagnostics([problem('Table width must be auto or full, got "abc"')], { "main.md": md }, "main.md")
    expect(found).toMatchObject({ path: "main.md", line: 5 })
  })

  it("uses the tag when the message names one", () => {
    const [found] = locateDiagnostics([problem('<alert> type must be one of tip, warn, got "loud"')], { "main.md": md }, "main.md")
    expect(found.line).toBe(9)
  })

  it("leaves a problem that already has a place in a project file", () => {
    const own = problem("boom", "main.md", 3)
    expect(locateDiagnostics([own], { "main.md": md }, "main.md")[0]).toBe(own)
  })

  it("leaves a problem the text does not match", () => {
    const stray = problem('nothing like "zzzz" here')
    expect(locateDiagnostics([stray], { "main.md": md }, "main.md")[0]).toBe(stray)
  })
})
