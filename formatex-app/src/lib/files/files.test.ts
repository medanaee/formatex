import { unzipSync } from "fflate"
import { describe, expect, it } from "vitest"
import { readDropped } from "./droppedFiles"
import { mimeOf, planSave, zipItems } from "./saveEntries"
import type { FsEntry } from "@/lib/projects/paths"

const tree: FsEntry[] = [
  { path: "images", kind: "dir" },
  { path: "images/a.png", kind: "file" },
  { path: "images/sub", kind: "dir" },
  { path: "images/sub/b.png", kind: "file" },
  { path: "empty", kind: "dir" },
  { path: "main.md", kind: "file" },
  { path: "config.toml", kind: "file" },
  { path: ".formatex/config.toml", kind: "file", alias: true },
]

describe("planSave", () => {
  it("saves one file as it is", () => {
    expect(planSave(tree, ["main.md"])).toEqual({ name: "main.md", mime: "text/markdown", zip: false, items: [{ path: "main.md", zipPath: "main.md" }] })
  })

  it("zips a folder, keeping its name and what is below it", () => {
    const plan = planSave(tree, ["images"])!
    expect(plan.name).toBe("images.zip")
    expect(plan.zip).toBe(true)
    expect(plan.items.map((item) => item.zipPath).sort()).toEqual(["images/a.png", "images/sub/b.png"])
  })

  it("zips several things, and leaves out what lies in a folder that is chosen too", () => {
    const plan = planSave(tree, ["images", "images/a.png", "main.md"])!
    expect(plan.name).toBe("files.zip")
    expect(plan.items.map((item) => item.zipPath).sort()).toEqual(["images/a.png", "images/sub/b.png", "main.md"])
  })

  it("has nothing to save for an empty folder or an unknown path", () => {
    expect(planSave(tree, ["empty"])).toBeNull()
    expect(planSave(tree, ["nope"])).toBeNull()
  })
})

describe("zipItems", () => {
  it("writes the files under their zip paths", async () => {
    const zip = await zipItems(
      [
        { path: "images/a.png", zipPath: "images/a.png" },
        { path: "main.md", zipPath: "main.md" },
      ],
      async (path) => new TextEncoder().encode(path),
    )
    const files = unzipSync(zip)
    expect(Object.keys(files).sort()).toEqual(["images/a.png", "main.md"])
    expect(new TextDecoder().decode(files["main.md"])).toBe("main.md")
  })
})

describe("mimeOf", () => {
  it("knows the common types", () => {
    expect(mimeOf("a.PNG")).toBe("image/png")
    expect(mimeOf("a.unknown")).toBe("application/octet-stream")
  })
})

// A folder as a browser hands it over: entries read in batches
const file = (name: string, text: string) => ({ isFile: true, isDirectory: false, name, file: (ok: (f: File) => void) => ok(new File([text], name)) }) as unknown as FileSystemFileEntry
const folder = (name: string, children: unknown[], batch = 2) =>
  ({
    isFile: false,
    isDirectory: true,
    name,
    createReader: () => {
      let at = 0
      return {
        readEntries: (ok: (entries: unknown[]) => void) => {
          const part = children.slice(at, at + batch)
          at += batch
          ok(part)
        },
      }
    },
  }) as unknown as FileSystemDirectoryEntry

describe("readDropped", () => {
  it("reads a dropped folder with everything inside it, in batches", async () => {
    const dropped = folder("book", [file("a.md", "A"), file("b.md", "B"), file("c.md", "C"), folder("images", [file("x.png", "X")])])
    const read = await readDropped([dropped])
    expect(read.map((item) => item.path).sort()).toEqual(["book/a.md", "book/b.md", "book/c.md", "book/images/x.png"])
    expect(new TextDecoder().decode(read.find((item) => item.path === "book/c.md")!.data)).toBe("C")
  })

  it("reads plain files too, and leaves out .git and node_modules", async () => {
    const read = await readDropped([new File(["N"], "note.md"), folder("p", [file("a.md", "A"), folder(".git", [file("HEAD", "h")]), folder("node_modules", [file("x.js", "x")])])])
    expect(read.map((item) => item.path).sort()).toEqual(["note.md", "p/a.md"])
  })

  it("stops at the limit", async () => {
    const many = folder("big", Array.from({ length: 10 }, (_, i) => file(`f${i}.md`, "x")), 4)
    expect((await readDropped([many], 3)).length).toBeLessThanOrEqual(3)
  })
})
