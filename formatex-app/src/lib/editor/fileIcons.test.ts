import { readdirSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { fileIconName } from "./fileIcons"

describe("fileIconName", () => {
  it("picks by extension, then by name, then a plain file", () => {
    expect(fileIconName("notes/a.md", "file")).toBe("markdown")
    expect(fileIconName("a.PY", "file")).toBe("python")
    expect(fileIconName("Dockerfile", "file")).toBe("docker")
    expect(fileIconName("x.unknown", "file")).toBe("file")
  })
  it("gives the config files the settings icon", () => {
    expect(fileIconName("config.toml", "file")).toBe("settings")
    expect(fileIconName(".formatex/config.toml", "file")).toBe("settings")
  })
  it("has open and closed folders, with special names", () => {
    expect(fileIconName("images", "dir")).toBe("folder-images")
    expect(fileIconName("a/src", "dir", true)).toBe("folder-src-open")
    expect(fileIconName("misc", "dir", true)).toBe("folder-open")
  })
  it("only names icons that exist in the set", () => {
    const have = new Set(readdirSync("src/assets/file-icons").filter((name) => name.endsWith(".svg")).map((name) => name.slice(0, -4)))
    const paths = ["a.md", "a.toml", "a.typ", "a.csv", "a.bib", "a.svg", "a.png", "a.ttf", "a.py", "a.tsx", "a.rs", "a.sql", "a.sh", "a.scss", "a.pl", "a.m", "a.mm", "a.asm", "a.tex", "a.log", "a.ini", "a.diff", "a.cmake", "a.gradle", "a.kts", "a.hh", "a.jl", "Dockerfile", "Makefile", "LICENSE", "README.md", ".gitignore", "zz"]
    for (const path of paths) expect(have.has(fileIconName(path, "file")), path).toBe(true)
    for (const name of ["images", "fonts", "src", "docs", "config", "other"]) for (const open of [false, true]) expect(have.has(fileIconName(name, "dir", open)), name).toBe(true)
  })
})
