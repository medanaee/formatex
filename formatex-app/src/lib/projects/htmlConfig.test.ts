import { describe, expect, it } from "vitest"
import { DEFAULT_HTML_OPTIONS, htmlOptionsFromConfig } from "@/lib/projects/htmlConfig"

describe("htmlOptionsFromConfig", () => {
  it("has the defaults without an [html] table", () => {
    expect(htmlOptionsFromConfig('source = "main.md"\n')).toEqual(DEFAULT_HTML_OPTIONS)
  })

  it("reads the keys it finds and keeps the rest", () => {
    const config = 'source = "main.md"\n\n[html]\ntoolbar = false\nembed-fonts = false  # small file\ncopy-code = "yes"\n\n[table]\noutline = false\n'
    expect(htmlOptionsFromConfig(config)).toEqual({ ...DEFAULT_HTML_OPTIONS, toolbar: false, embedFonts: false })
  })
})
