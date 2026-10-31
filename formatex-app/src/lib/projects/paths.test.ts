import { describe, expect, it } from "vitest"
import { codeLanguageFor } from "@/lib/editor/codeLanguages"
import { fileKindOf, isTextKind } from "./paths"

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
