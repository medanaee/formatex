import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ i18n: { language: "en" }, invoke: vi.fn().mockResolvedValue(new ArrayBuffer(0)) }))
vi.mock("@/i18n", () => ({ default: mocks.i18n }))
vi.mock("@/lib/platform", () => ({ isTauri: () => true }))
vi.mock("@tauri-apps/api/core", () => ({ invoke: mocks.invoke }))
import { exportHtml, previewHtml } from "./index"

describe("HTML controls follow the app language", () => {
  it("uses the preview command with the known font key, independently of standalone export", async () => {
    mocks.i18n.language = "en"
    const options = { embedFonts: true, copyCode: true, toolbar: true, progress: true, outline: true, katexMath: false }
    await previewHtml("project", "main.md", options, { "main.md": "text" }, "formatex", "fonts-key")
    expect(mocks.invoke).toHaveBeenLastCalledWith("preview_html", expect.objectContaining({ knownFonts: "fonts-key", options: { ...options, uiLang: "en", math: "native" } }))
  })
  it.each([["en", "en"], ["fa", "fa"], ["fa-IR", "fa"]])("passes %s as %s without changing document overrides", async (language, uiLang) => {
    mocks.i18n.language = language
    const overrides = { "main.md": "---\ndir: rtl\n---\nمتن", "config.toml": 'dir = "rtl"' }
    const options = { embedFonts: false, copyCode: true, toolbar: true, progress: true, outline: true, katexMath: false }
    await exportHtml("project", "main.md", options, overrides)
    expect(mocks.invoke).toHaveBeenLastCalledWith("export_html", expect.objectContaining({
      overrides,
      options: { ...options, uiLang, math: "native" },
    }))
  })
})
