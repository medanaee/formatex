import { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { PageMap } from "@/lib/compiler"
import { useEditorStore } from "@/stores/useEditorStore"
import { useEditorViewStore } from "@/stores/useEditorViewStore"
import { usePreviewScrollStore } from "@/stores/usePreviewScrollStore"
import { useSettingsStore } from "@/stores/useSettingsStore"
import { startFollowingTyping } from "./followTyping"

const map = { width: 500, height: 700, links: [], texts: [{ text: "alpha beta gamma", x: 10, y: 90, w: 200, h: 10 }] } as unknown as PageMap
const source = "# Title\n\nalpha beta gamma"

describe("startFollowingTyping", () => {
  let stop: () => void
  const edit = () => useEditorStore.setState((state) => ({ lastEdit: { path: "main.md", id: (state.lastEdit?.id ?? 0) + 1 } }))
  const status = (compileStatus: "idle" | "compiling") => useEditorStore.setState({ compileStatus })

  beforeEach(() => {
    vi.useFakeTimers()
    useEditorStore.setState({ activePath: "main.md", mainFile: "main.md", texts: { "main.md": source }, pages: [{ hash: "a", svg: "", map }], ok: true, compileStatus: "idle", lastEdit: null })
    useEditorViewStore.setState({ view: { state: EditorState.create({ doc: source, selection: { anchor: source.length } }) } as unknown as EditorView })
    usePreviewScrollStore.setState({ target: null, manualUntil: 0 })
    useSettingsStore.setState({ previewFollow: true })
    stop = startFollowingTyping()
  })
  afterEach(() => {
    stop()
    vi.useRealTimers()
  })

  it("shows the cursor's place once the build that follows the typing has ended", () => {
    edit()
    status("compiling")
    vi.advanceTimersByTime(500)
    expect(usePreviewScrollStore.getState().target).toBeNull()
    status("idle")
    vi.advanceTimersByTime(100)
    expect(usePreviewScrollStore.getState().target).toMatchObject({ page: 0, y: 90, flash: false })
  })

  it("does not move between two builds in a row", () => {
    edit()
    status("compiling")
    status("idle")
    status("compiling")
    vi.advanceTimersByTime(500)
    expect(usePreviewScrollStore.getState().target).toBeNull()
    status("idle")
    vi.advanceTimersByTime(100)
    expect(usePreviewScrollStore.getState().target).not.toBeNull()
  })

  it("leaves the preview alone after the user scrolled it, and when the setting is off", () => {
    edit()
    status("compiling")
    usePreviewScrollStore.getState().manualScroll()
    status("idle")
    vi.advanceTimersByTime(100)
    expect(usePreviewScrollStore.getState().target).toBeNull()

    usePreviewScrollStore.setState({ manualUntil: 0 })
    useSettingsStore.setState({ previewFollow: false })
    edit()
    status("compiling")
    status("idle")
    vi.advanceTimersByTime(100)
    expect(usePreviewScrollStore.getState().target).toBeNull()
  })

  it("does not follow without an edit, or after a failed build", () => {
    status("compiling")
    status("idle")
    vi.advanceTimersByTime(100)
    expect(usePreviewScrollStore.getState().target).toBeNull()
    edit()
    status("compiling")
    useEditorStore.setState({ ok: false })
    status("idle")
    vi.advanceTimersByTime(100)
    expect(usePreviewScrollStore.getState().target).toBeNull()
  })
})
