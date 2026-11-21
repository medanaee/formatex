// @vitest-environment happy-dom
import { expect, it, vi } from "vitest"
import { installPreviewBridge } from "@formatex/html/preview"

it("authenticates both directions, maps Persian/emoji offsets and refreshes maps after patches", () => {
  const text = "سلام 😀 نتیجه ۳"
  const generatedStart = text.indexOf("۳")
  const entry = { at: { file: "part.md", line: 4, column: 1 }, text, source: [
    { file: "part.md", start: 22, end: 50, utf16Start: 12, utf16End: 12 + generatedStart, textStart: 0, textEnd: generatedStart, generated: false },
    { file: "part.md", start: 80, end: 92, utf16Start: 60, utf16End: 68, textStart: generatedStart, textEnd: text.length, generated: true },
  ] }
  document.body.innerHTML = `<main><span data-fx-node="word">${text}</span></main><script id="fx-source-map" type="application/json"></script>`
  document.getElementById("fx-source-map")!.textContent = JSON.stringify({ word: entry })
  const globals = window as unknown as { __fxPreviewToken?: string }
  globals.__fxPreviewToken = "test-token"
  const send = vi.spyOn(window, "postMessage").mockImplementation(() => {})
  const scroll = vi.spyOn(window, "scrollBy").mockImplementation(() => {})
  const element = document.querySelector("[data-fx-node]")!
  let caret = text.indexOf("نتیجه") + 2
  Object.defineProperty(document, "caretRangeFromPoint", { configurable: true, value: () => { const range = document.createRange(); range.setStart(element.firstChild!, caret); return range } })
  window.getSelection()?.removeAllRanges()
  const stop = installPreviewBridge()
  try {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ fxToken: "test-token", fxSource: expect.objectContaining({ path: "part.md", offset: 12 + caret }) }), "*")
    caret = generatedStart
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ fxSource: expect.objectContaining({ offset: 60, end: 68 }) }), "*")
    window.dispatchEvent(new MessageEvent("message", { source: window, data: { fxToken: "wrong", fxSourceReveal: { path: "part.md", offset: 61, flash: true } } }))
    expect(scroll).not.toHaveBeenCalled()
    window.dispatchEvent(new MessageEvent("message", { source: window, data: { fxToken: "test-token", fxSourceReveal: { path: "part.md", offset: 61, flash: true } } }))
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(element.classList.contains("fx-source-flash")).toBe(false)
    entry.source[0].file = "new.md"; entry.source[1].file = "new.md"
    document.getElementById("fx-source-map")!.textContent = JSON.stringify({ word: entry })
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ fxSource: expect.objectContaining({ path: "new.md" }) }), "*")
  } finally { stop(); send.mockRestore(); scroll.mockRestore(); delete globals.__fxPreviewToken; document.body.innerHTML = "" }
})

it("reveals only the correct repeated word on a wrapped browser row", () => {
  const text = "repeat first repeat second repeat third"
  const offset = text.lastIndexOf("repeat")
  document.body.innerHTML = `<main><span data-fx-node="text">${text}</span></main><script id="fx-source-map" type="application/json"></script>`
  document.getElementById("fx-source-map")!.textContent = JSON.stringify({ text: { text, at: {file:"main.md",line:1,column:1}, source: [{file:"main.md",utf16Start:0,utf16End:text.length,start:0,end:text.length,generated:false,textStart:0,textEnd:text.length}] } })
  const globals = window as unknown as {__fxPreviewToken?: string}; globals.__fxPreviewToken = "range-test"
  const selected: string[] = []
  const rect = {top:900,bottom:920,left:50,right:90,width:40,height:20} as DOMRect
  const bounds = vi.spyOn(Range.prototype,"getBoundingClientRect").mockImplementation(function(this:Range) { selected.push(this.toString()); return rect })
  const rects = vi.spyOn(Range.prototype,"getClientRects").mockReturnValue([rect] as unknown as DOMRectList)
  const scroll = vi.spyOn(window,"scrollBy").mockImplementation(()=>{})
  const stop = installPreviewBridge()
  try {
    window.dispatchEvent(new MessageEvent("message",{source:window,data:{fxToken:"range-test",fxSourceReveal:{path:"main.md",offset:offset+2,flash:true}}}))
    expect(selected).toEqual(["repeat"])
    expect(document.querySelector(".fx-source-range-flash")?.getAttribute("style")).toContain("top: 900px")
    expect(scroll).toHaveBeenCalled()
  } finally { stop(); bounds.mockRestore(); rects.mockRestore(); scroll.mockRestore(); delete globals.__fxPreviewToken; document.body.innerHTML="" }
})
