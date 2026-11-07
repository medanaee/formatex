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
    expect(() => readProjectZip(zipSync({ "../evil.md": strToU8("x"), "__MACOSX/a": strToU8("x") }), "T")).toThrow()
    // A zip of Typst files alone is a plain Typst project, where `src/` is an ordinary folder
    expect(readProjectZip(zipSync({ "src/core.typ": strToU8("x") }), "T")).toMatchObject({ kind: "typst" })
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
    // The main file is the `source` of config.toml: a config that named none gets the project's
    expect(await copy.readText("config.toml")).toBe('source = "docs/a.md"\ntheme = "nord"\n')
    expect([...(await copy.readBytes("images/p.png"))]).toEqual([137, 80, 78, 71, 0, 255])
  })

  it("keeps the source a config.toml already names", async () => {
    const fs = await openProjectFs("zip-src2")
    await fs.writeText("config.toml", 'source = "b.md"\ntheme = "nord"\n')
    await fs.writeText("a.md", "# a\n")
    await fs.writeText("b.md", "# b\n")
    const project = readProjectZip(await exportProjectZip("zip-src2", "t", "a.md"), "x")
    await writeImportedProject("zip-dst2", project)
    expect(await (await openProjectFs("zip-dst2")).readText("config.toml")).toBe('source = "b.md"\ntheme = "nord"\n')
  })
})

describe("a plain Typst project in a zip", () => {
  it("is exported with what it is, and comes back as plain Typst with its main file", async () => {
    const fs = await openProjectFs("typst-a")
    await fs.writeText("main.typ", '#import "template.typ": template\n')
    await fs.writeText("template.typ", "#let template(doc) = doc\n")
    await fs.writeText("src/part.typ", "= Part\n")
    const zip = await exportProjectZip("typst-a", "My Typst", "main.typ", "typst")
    const project = readProjectZip(zip, "T")
    expect(project).toMatchObject({ title: "My Typst", kind: "typst", mainFile: "main.typ" })
    // No name is reserved without the engine: main.typ and src/ stay
    expect(project.files.map((f) => f.path).sort()).toEqual(["main.typ", "src/part.typ", "template.typ"])
  })

  it("writes only its files: no config.toml is made", async () => {
    const project = readProjectZip(zipSync({ "main.typ": strToU8("Hello"), "formatex-project.json": strToU8(JSON.stringify({ version: 1, title: "X", mainFile: "main.typ", kind: "typst" })) }), "T")
    await writeImportedProject("typst-b", project)
    const fs = await openProjectFs("typst-b")
    expect(await fs.readText("main.typ")).toBe("Hello")
    expect(await fs.exists("config.toml")).toBe(false)
  })

  it("keeps no main file when the zip names none that exists", () => {
    const zip = zipSync({ "a.typ": strToU8("x"), "formatex-project.json": strToU8(JSON.stringify({ version: 1, title: "X", mainFile: "", kind: "typst" })) })
    expect(readProjectZip(zip, "T")).toMatchObject({ kind: "typst", mainFile: "" })
  })

  it("takes a zip of Typst files with no manifest and no Markdown for plain Typst, and any other zip for Formatex", () => {
    expect(readProjectZip(zipSync({ "main.typ": strToU8("x"), "lib.typ": strToU8("y") }), "T")).toMatchObject({ kind: "typst", mainFile: "main.typ" })
    expect(readProjectZip(zipSync({ "main.md": strToU8("# A"), "x.typ": strToU8("y") }), "T").kind).toBe("formatex")
    // A zip made before kinds had none in its manifest
    const old = zipSync({ "main.md": strToU8("# A"), "formatex-project.json": strToU8(JSON.stringify({ version: 1, title: "Old", mainFile: "main.md" })) })
    expect(readProjectZip(old, "T")).toMatchObject({ kind: "formatex", title: "Old" })
  })
})

