// @vitest-environment happy-dom
import { describe, expect, it } from "vitest"
import { frameBridge, initialFrame, splitHtml } from "./htmlFrame"

const page = (content: string, theme = "paper") => `<html lang="fa"><head><style>:root{--theme:${theme}}</style></head><body><main class="fx-doc">${content}</main><script>window.viewer=true</script></body></html>`

describe("persistent HTML frame", () => {
  it("rejects unauthenticated messages and applies content while retaining controls and fonts", () => {
    document.body.innerHTML = '<main class="fx-doc"><p>old</p></main><button id="control">Zoom</button><style id="fx-preview-fonts">font-css</style>'
    const control = document.getElementById("control")
    const fonts = document.getElementById("fx-preview-fonts")
    const script = new DOMParser().parseFromString(frameBridge("patch-token", 0), "text/html").querySelector("script")!.textContent!
    window.eval(script)
    const patch = '<h2>new</h2><script>throw new Error("must not execute")</script>'
    window.dispatchEvent(new MessageEvent("message", { source: window, data: { fxToken: "wrong", fxPatch: patch } }))
    expect(document.querySelector("main")?.textContent).toBe("old")
    window.dispatchEvent(new MessageEvent("message", { source: window, data: { fxToken: "patch-token", fxPatch: patch, id: 1 } }))
    expect(document.querySelector("main")?.textContent).toBe("new")
    expect(document.querySelector("main script")).toBeNull()
    expect(document.getElementById("control")).toBe(control)
    expect(document.getElementById("fx-preview-fonts")).toBe(fonts)
    document.body.innerHTML = ""
  })
  it("patches text, headings, tables and images without changing the shell", () => {
    const before = splitHtml(page("<h1>قبلی</h1><p>Text</p>"))!
    const after = splitHtml(page('<h1>جدید</h1><table><tr><td>42</td></tr></table><img src="data:image/png;base64,x">'))!
    expect(after.signature).toBe(before.signature)
    expect(after.content).toContain("جدید")
    expect(after.content).toContain("<table>")
  })

  it("reloads for changed styles or viewer scripts and handles raw Typst without a main", () => {
    expect(splitHtml(page("x", "paper"))!.signature).not.toBe(splitHtml(page("x", "nord"))!.signature)
    expect(splitHtml("<p>raw</p>")).toBeNull()
    expect(splitHtml(page("<script>customWidget()</script>"))).toBeNull()
  })

  it("escapes viewer state and installs the bridge outside document content", () => {
    const html = initialFrame(page("text"), "body{}", "secret", 120, { theme: '</script><script>alert(1)</script>' })
    const parsed = new DOMParser().parseFromString(html, "text/html")
    expect(parsed.getElementById("fx-preview-fonts")?.textContent).toBe("body{}")
    expect(parsed.querySelectorAll("script")).toHaveLength(3)
    expect(parsed.querySelector("main")?.querySelector("script")).toBeNull()
    expect(html).toContain("fx-content-updated")
    expect(html).toContain("e.source!==parent")
  })

  it("intercepts anchor links without navigating frame away", () => {
    const bridge = frameBridge("token-123", 0)
    expect(bridge).toContain("e.preventDefault()")
    expect(bridge).toContain("scrollIntoView")
    expect(bridge).toContain("fxPreviewOpen")
  })
})
