import { EditorSelection, EditorState, type TransactionSpec } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ native: true, readText: vi.fn(), writeText: vi.fn(), image: vi.fn() }))
vi.mock("@/lib/platform", () => ({ isTauri: () => mocks.native }))
vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({ readText: mocks.readText, writeText: mocks.writeText }))
vi.mock("@/lib/files/pastedImage", () => ({ imageOnClipboard: mocks.image }))
vi.mock("@/stores/useEditorStore", () => ({ useEditorStore: { getState: () => ({ kind: "typst", activePath: "main.typ" }) } }))
vi.mock("./pasteImage", () => ({ pasteImageInto: vi.fn() }))
import { copySelection, cutSelection, pasteClipboard, readClipboardText } from "./clipboard"

function fake() {
  const target = {
    state: EditorState.create({ doc: "first\nsecond\nthird", selection: EditorSelection.single(6, 12) }),
    dispatch(spec: TransactionSpec) { target.state = target.state.update(spec).state },
    focus: vi.fn(),
  }
  return target as unknown as EditorView
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.native = true
  mocks.readText.mockResolvedValue("فارسی\nEnglish")
  mocks.writeText.mockResolvedValue(undefined)
})

describe("native text clipboard", () => {
  it("pastes multiline text using the plugin without web clipboard permission", async () => {
    const view = fake()
    await pasteClipboard(view)
    expect(mocks.readText).toHaveBeenCalledOnce()
    expect(view.state.doc.toString()).toBe("first\nفارسی\nEnglish\nthird")
    expect(view.focus).toHaveBeenCalled()
  })

  it("keeps selected text when the native clipboard is empty", async () => {
    mocks.readText.mockResolvedValue(null)
    const view = fake()
    await pasteClipboard(view)
    expect(view.state.doc.toString()).toBe("first\nsecond\nthird")
  })

  it("copies and cuts through the native plugin", async () => {
    const view = fake()
    await copySelection(view)
    expect(mocks.writeText).toHaveBeenCalledWith("second")
    await cutSelection(view)
    expect(view.state.doc.toString()).toBe("first\n\nthird")
  })

  it("does not delete text if writing the clipboard fails", async () => {
    mocks.writeText.mockRejectedValue(new Error("unavailable"))
    const view = fake()
    await expect(cutSelection(view)).rejects.toThrow()
    expect(view.state.doc.toString()).toBe("first\nsecond\nthird")
  })

  it("uses the web clipboard in a browser", async () => {
    mocks.native = false
    const readText = vi.fn().mockResolvedValue("web")
    vi.stubGlobal("navigator", { clipboard: { readText } })
    try {
      expect(await readClipboardText()).toBe("web")
      expect(mocks.readText).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
