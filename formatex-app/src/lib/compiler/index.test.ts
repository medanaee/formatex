import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ i18n: { language: "en" }, invoke: vi.fn().mockImplementation(async (command: string, args: Record<string, unknown>) => {
  if (command === "prepare_document") return { ok: true, document: { version: 1, file: "main.md", children: [{ type: "paragraph", key: "p", at: { file: "main.md", line: 1, column: 1 }, children: [{ type: "text", value: "Document text", key: "t", at: { file: "main.md", line: 1, column: 1 } }] }], settings: {}, tokens: {} }, elapsedMs: 1 }
  if (command === "component_packages") return {}
  if (command === "finish_document_html") return { html: args.html, fontKey: "key", fontCss: null, timings: { total_ms: 1 } }
  return new ArrayBuffer(0)
}) }))
vi.mock("@/i18n", () => ({ default: mocks.i18n }))
vi.mock("@/lib/platform", () => ({ isTauri: () => true }))
vi.mock("@tauri-apps/api/core", () => ({ invoke: mocks.invoke }))
import { exportHtml, previewHtml } from "./index"

describe("HTML controls follow the app language", () => {
  it("uses the preview command with the known font key, independently of standalone export", async () => {
    mocks.i18n.language = "en"
    const options = { embedFonts: true, copyCode: true, toolbar: true, progress: true, outline: true, katexMath: false }
    await previewHtml("project", "main.md", options, { "main.md": "text" }, "formatex", "fonts-key")
    expect(mocks.invoke).toHaveBeenLastCalledWith("finish_document_html", expect.objectContaining({ knownFonts: "fonts-key", embedFonts: false, html: expect.stringContaining('lang="en"') }))
  })
  it.each([["en", "en"], ["fa", "fa"], ["fa-IR", "fa"]])("passes %s as %s without changing document overrides", async (language, uiLang) => {
    mocks.i18n.language = language
    const overrides = { "main.md": "---\ndir: rtl\n---\nمتن", "config.toml": 'dir = "rtl"' }
    const options = { embedFonts: false, copyCode: true, toolbar: true, progress: true, outline: true, katexMath: false }
    await exportHtml("project", "main.md", options, overrides)
    expect(mocks.invoke).toHaveBeenCalledWith("prepare_document", expect.objectContaining({ overrides }))
    expect(mocks.invoke).toHaveBeenLastCalledWith("finish_document_html", expect.objectContaining({ embedFonts: false, html: expect.stringContaining(`lang="${uiLang}"`) }))
  })
})
