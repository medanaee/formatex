// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  state: { projectId: "p", mainFile: "main.md", kind: "formatex", texts: { "main.md": "A" } },
  preview: vi.fn(),
  t: (key: string) => key,
}))
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: mocks.t, i18n: { language: "en" } }) }))
vi.mock("@/stores/useEditorStore", () => ({ useEditorStore: (select: (state: typeof mocks.state) => unknown) => select(mocks.state) }))
vi.mock("@/lib/projects", () => ({ CONFIG_FILE: "config.toml" }))
vi.mock("@/lib/compiler", () => ({ previewHtml: mocks.preview, CompilerUnavailableError: class extends Error {} }))
import { HtmlPreview } from "./HtmlPreview"

const output = (text: string) => ({ html: `<html><head></head><body><main class="fx-doc">${text}</main></body></html>`, fontCss: "font-css", fontKey: "fonts", timings: { total_ms: 100 } })

describe("HTML preview lifecycle", () => {
  it("coalesces edits during compilation and never displays the stale result", async () => {
    vi.useFakeTimers()
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    const host = document.createElement("div")
    document.body.append(host)
    const root = createRoot(host)
    const results: Array<(value: ReturnType<typeof output>) => void> = []
    mocks.preview.mockImplementation(() => new Promise((resolve) => results.push(resolve)))
    try {
      await act(async () => { root.render(<HtmlPreview />) })
      await act(async () => { await vi.advanceTimersByTimeAsync(0) })
      expect(mocks.preview).toHaveBeenCalledTimes(1)
      for (const text of ["B", "C"]) {
        mocks.state.texts = { "main.md": text }
        await act(async () => { root.render(<HtmlPreview />) })
      }
      expect(mocks.preview).toHaveBeenCalledTimes(1)
      await act(async () => { results[0](output("stale-A")); await vi.advanceTimersByTimeAsync(0) })
      expect(mocks.preview).toHaveBeenCalledTimes(2)
      expect(mocks.preview.mock.calls[1][3]).toEqual({ "main.md": "C" })
      expect(host.querySelector("iframe")).toBeNull()
      await act(async () => { results[1](output("latest-C")); await vi.advanceTimersByTimeAsync(0) })
      const frame = host.querySelector("iframe")!
      expect(frame.srcdoc).toContain("latest-C")
      expect(frame.srcdoc).not.toContain("stale-A")
    } finally {
      await act(async () => { root.unmount() })
      host.remove()
      vi.useRealTimers()
      vi.unstubAllGlobals()
    }
  })
})
