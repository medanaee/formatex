import type { CompletionContext } from "@codemirror/autocomplete"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useEditorStore } from "@/stores/useEditorStore"

const invoke = vi.fn()
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => invoke(...args) }))
vi.mock("@/lib/platform", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/platform")>()), isTauri: () => true }))

const { typstCompletionSource, typstPlaceForOffset, typstSourceAt } = await import("./typstIde")

/** What the source reads of CodeMirror's context: the text before the cursor, the position, and whether it was asked for. */
const context = (before: string, explicit = false): CompletionContext =>
  ({ pos: before.length, explicit, state: { sliceDoc: (from: number, to: number) => before.slice(from, to) } }) as unknown as CompletionContext

beforeEach(() => {
  invoke.mockReset()
  useEditorStore.setState({ kind: "typst", projectId: "p", mainFile: "main.typ", texts: { "main.typ": "#lore" } })
})

describe("Typst completions in the editor", () => {
  it("asks Typst with the unsaved texts and maps what it answers", async () => {
    invoke.mockResolvedValue({
      from: 1,
      completions: [
        { kind: "func", label: "lorem", apply: "lorem(${words})", detail: "Creates blind text." },
        { kind: "constant", label: "left", apply: null, detail: null },
      ],
    })
    const result = await typstCompletionSource("main.typ")(context("#lore"))
    expect(invoke).toHaveBeenCalledWith("typst_complete", { projectId: "p", main: "main.typ", overrides: { "main.typ": "#lore" }, path: "main.typ", offset: 5, explicit: false })
    expect(result?.from).toBe(1)
    expect(result?.options.map((option) => [option.label, option.type, option.detail])).toEqual([
      ["lorem", "function", "Creates blind text."],
      ["left", "constant", undefined],
    ])
    // A choice with places to type is a snippet, a plain one is its label
    expect(typeof result?.options[0].apply).toBe("function")
    expect(result?.options[1].apply).toBeUndefined()
  })

  it("does not ask for whitespace typed, but does when asked for", async () => {
    invoke.mockResolvedValue({ from: 6, completions: [{ kind: "syntax", label: "let", apply: null, detail: null }] })
    expect(await typstCompletionSource("main.typ")(context("#set "))).toBeNull()
    expect(invoke).not.toHaveBeenCalled()
    expect(await typstCompletionSource("main.typ")(context("#set ", true))).not.toBeNull()
  })

  it("is silent outside a plain Typst project, and when Typst has nothing", async () => {
    useEditorStore.setState({ kind: "formatex" })
    expect(await typstCompletionSource("a.typ")(context("#x"))).toBeNull()
    expect(invoke).not.toHaveBeenCalled()
    useEditorStore.setState({ kind: "typst" })
    invoke.mockResolvedValue(null)
    expect(await typstCompletionSource("main.typ")(context("#x"))).toBeNull()
    invoke.mockRejectedValue(new Error("no world"))
    expect(await typstCompletionSource("main.typ")(context("#x"))).toBeNull()
  })
})

describe("between the text and the page", () => {
  it("turns a place on a page (1-based) into the preview's place (0-based, a box a little above the text)", async () => {
    invoke.mockResolvedValue({ page: 2, x: 30, y: 100 })
    const place = await typstPlaceForOffset("main.typ", 12)
    expect(invoke).toHaveBeenCalledWith("typst_jump_to_cursor", expect.objectContaining({ path: "main.typ", offset: 12 }))
    expect(place).toMatchObject({ page: 1, approximate: false })
    expect(place!.y).toBeLessThan(100)
    expect(place!.y + place!.h).toBeGreaterThan(100)
  })

  it("sends a click as a 1-based page and returns the place in the text", async () => {
    invoke.mockResolvedValue({ path: "chapters/one.typ", line: 7, column: 3 })
    expect(await typstSourceAt(0, 40.5, 90)).toEqual({ path: "chapters/one.typ", line: 7, column: 3 })
    expect(invoke).toHaveBeenCalledWith("typst_jump_from_click", { projectId: "p", main: "main.typ", page: 1, x: 40.5, y: 90 })
  })

  it("asks nothing in a Formatex project", async () => {
    useEditorStore.setState({ kind: "formatex" })
    expect(await typstPlaceForOffset("main.typ", 1)).toBeNull()
    expect(await typstSourceAt(0, 1, 1)).toBeNull()
    expect(invoke).not.toHaveBeenCalled()
  })
})
