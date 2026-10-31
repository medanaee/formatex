import { describe, expect, it } from "vitest"
import type { FsEntry } from "./paths"
import { configForCopy, copyName, destinations, markdownFiles, planMove } from "./storagePlan"

const f = (path: string): FsEntry => ({ path, kind: "file" })
const d = (path: string): FsEntry => ({ path, kind: "dir" })

describe("planMove", () => {
  const source = [d("images"), f("images/a.png"), f("main.md"), f("config.toml"), f("notes/x.md")]
  it("copies everything and finds the files already there", () => {
    const plan = planMove(source, [f("main.md")])
    expect(plan.files).toEqual(["images/a.png", "main.md", "config.toml", "notes/x.md"])
    expect(plan.conflicts).toEqual(["main.md"])
    expect(plan.dirs).toEqual(["images", "notes"])
  })
  it("with a selection, only those files and the folders above them", () => {
    const plan = planMove(source, [], new Set(["notes/x.md"]))
    expect(plan.files).toEqual(["notes/x.md"])
    expect(plan.dirs).toEqual(["notes"])
  })
})

describe("destinations / copyName", () => {
  it("names the second copy next to the first", () => {
    expect(copyName("a/n.md", new Set(["a/n.md", "a/n (2).md"]))).toBe("a/n (3).md")
    expect(copyName("Makefile", new Set(["Makefile"]))).toBe("Makefile (2)")
  })
  it("replace keeps the path, skip drops it, both renames", () => {
    const target = [f("a.md"), f("b.md"), f("c.md")]
    const plan = planMove([f("a.md"), f("b.md"), f("c.md"), f("d.md")], target)
    const out = destinations(plan, target, { "a.md": "replace", "b.md": "skip", "c.md": "both" })
    expect([...out]).toEqual([["a.md", "a.md"], ["c.md", "c (2).md"], ["d.md", "d.md"]])
  })
})

describe("configForCopy", () => {
  const config = 'source = "main.md"\n[font]\nsize = 1\n'
  it("keeps the source when its file comes along, empties it otherwise", () => {
    expect(configForCopy(config, new Set(["main.md"]))).toBe(config)
    expect(configForCopy(config, new Set()).startsWith('source = ""')).toBe(true)
  })
})

describe("markdownFiles", () => {
  it("lists the Markdown files at the top", () => {
    expect(markdownFiles([f("a.md"), f("x/b.md"), f("c.txt"), f("D.MD")])).toEqual(["a.md", "D.MD"])
  })
})
