import { describe, expect, it } from "vitest"
import { codeLanguageFor } from "@/lib/editor/codeLanguages"
import { compareEntries, fileKindOf, isTextKind, type FsEntry, nameProblem } from "./paths"

describe("code files", () => {
  it("are shown as text, whatever the language", () => {
    for (const path of ["solution.py", "src/main.rs", "a/b/App.TSX", "run.sh", "query.sql", "Dockerfile", "docker/Makefile", "setup.ps1"]) {
      expect(fileKindOf(path)).toBe("code")
      expect(isTextKind(fileKindOf(path))).toBe(true)
    }
  })

  it("leave the other kinds as they were", () => {
    expect(fileKindOf("main.md")).toBe("markdown")
    expect(fileKindOf("config.toml")).toBe("toml")
    expect(fileKindOf("notes.txt")).toBe("text")
    expect(fileKindOf("logo.png")).toBe("image")
    expect(fileKindOf("archive.zip")).toBe("binary")
  })

  it("get a language by extension or name, and plain text when there is none", () => {
    expect(codeLanguageFor("a.py")).not.toEqual([])
    expect(codeLanguageFor("Dockerfile")).not.toEqual([])
    expect(codeLanguageFor("notes.log")).toEqual([])
  })
})

describe("compareEntries", () => {
  it("pins .formatex above every other folder and file", () => {
    const entries: FsEntry[] = [
      { path: "notes.md", kind: "file" },
      { path: "images", kind: "dir" },
      { path: ".formatex/config.toml", kind: "file" },
      { path: ".formatex", kind: "dir" },
      { path: "a", kind: "dir" },
    ]
    expect(entries.sort(compareEntries).map((entry) => entry.path)).toEqual([".formatex", ".formatex/config.toml", "a", "images", "notes.md"])
  })
})

describe("names a project may use", () => {
  it("keeps the engine's names for a Formatex project, and frees them for a plain Typst one", () => {
    const none = new Set<string>()
    for (const name of ["main.typ", "src", "components", "tools"]) {
      expect(nameProblem(name, "", none)).toBe("reserved")
      expect(nameProblem(name, "", none, true)).toBeNull()
    }
    // Inside a folder they were never reserved
    expect(nameProblem("main.typ", "chapters", none)).toBeNull()
    // The other rules hold in both
    expect(nameProblem("bad:name", "", none, true)).toBe("invalid")
    expect(nameProblem("a.typ", "", new Set(["a.typ"]), true)).toBe("exists")
  })
})

