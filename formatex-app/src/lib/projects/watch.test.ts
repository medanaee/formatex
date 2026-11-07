import { describe, expect, it } from "vitest"
import { editorPaths, lineCount, shrankSuspiciously } from "./watch"

describe("the paths of a change in the project folder", () => {
  it("names the config of a folder project config.toml, and leaves the rest of .formatex out", () => {
    expect(editorPaths([".formatex/config.toml", ".formatex/cache/x", ".formatex", "main.md"])).toEqual(["config.toml", "main.md"])
  })

  it("keeps each path once and the folders of the user's as they are", () => {
    expect(editorPaths(["chapters/one.md", "chapters/one.md", "images/a.png"])).toEqual(["chapters/one.md", "images/a.png"])
    expect(editorPaths([])).toEqual([])
  })
})

describe("telling a loss from a change", () => {
  it("an empty or much shorter text where there was one is suspicious", () => {
    expect(shrankSuspiciously("a long text of the editor", "")).toBe(true)
    expect(shrankSuspiciously("a long text of the editor", "   \n")).toBe(true)
    expect(shrankSuspiciously("a long text of the editor", "a lo")).toBe(true)
    expect(shrankSuspiciously("a long text of the editor", "a long text of the edit")).toBe(false)
    // Nothing held, nothing lost
    expect(shrankSuspiciously("", "")).toBe(false)
    expect(shrankSuspiciously("  ", "x")).toBe(false)
  })

  it("counts lines", () => {
    expect(lineCount("")).toBe(0)
    expect(lineCount("one")).toBe(1)
    expect(lineCount("one\ntwo\n")).toBe(3)
  })
})

