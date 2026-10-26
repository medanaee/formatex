// @vitest-environment happy-dom
import { strToU8, zipSync } from "fflate"
import { describe, expect, it } from "vitest"
import { openProjectFs } from "./index"
import { exportProjectZip, readProjectZip, safeZipPath, writeImportedProject } from "./zip"

describe("safeZipPath", () => {
  it("keeps normal paths and refuses the ones that leave the project", () => {
    expect(safeZipPath("images/a.png")).toBe("images/a.png")
    expect(safeZipPath("/main.md")).toBe("main.md")
    for (const bad of ["../x", "a/../../x", "C:/x", "", "dir/", "a//b", "__MACOSX/a", "a/.DS_Store"]) expect(safeZipPath(bad), bad).toBeNull()
  })
})

describe("reading a zip", () => {
  it("strips the single folder a zip made from a folder has, and finds the main file", () => {
    const zip = zipSync({ "My Doc/config.toml": strToU8('theme = "paper"'), "My Doc/notes.md": strToU8("# Notes"), "My Doc/images/a.png": new Uint8Array([1, 2, 3]) })
    const project = readProjectZip(zip, "fallback")
    expect(project.title).toBe("My Doc")
    expect(project.mainFile).toBe("notes.md")
    expect(project.files.map((f) => f.path).sort()).toEqual(["config.toml", "images/a.png", "notes.md"])
  })

  it("leaves out engine paths and unsafe paths, and refuses a zip with nothing left", () => {
    const zip = zipSync({ "main.md": strToU8("# A"), "src/core.typ": strToU8("x"), "components/a.typ": strToU8("x"), "../evil.md": strToU8("x") })
    expect(readProjectZip(zip, "T").files.map((f) => f.path)).toEqual(["main.md"])
    expect(() => readProjectZip(zipSync({ "src/core.typ": strToU8("x") }), "T")).toThrow()
  })
})

describe("export and import", () => {
  it("brings a project back with its title, main file and files, text and binary", async () => {
    const fs = await openProjectFs("zip-src")
    await fs.writeText("config.toml", 'theme = "nord"\n')
    await fs.writeText("docs/a.md", "# سلام\n")
    await fs.writeBytes("images/p.png", new Uint8Array([137, 80, 78, 71, 0, 255]))

    const zip = await exportProjectZip("zip-src", "سند من", "docs/a.md")
    const project = readProjectZip(zip, "x")
    expect(project).toMatchObject({ title: "سند من", mainFile: "docs/a.md" })

    await writeImportedProject("zip-dst", project)
    const copy = await openProjectFs("zip-dst")
    expect(await copy.readText("docs/a.md")).toBe("# سلام\n")
    expect(await copy.readText("config.toml")).toBe('theme = "nord"\n')
    expect([...(await copy.readBytes("images/p.png"))]).toEqual([137, 80, 78, 71, 0, 255])
  })
})
