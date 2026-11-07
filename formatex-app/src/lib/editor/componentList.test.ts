import { describe, expect, it } from "vitest"
import { isComponentFile, readComponentList, writeComponentList } from "@/lib/editor/componentList"
import { TOML_FORMAT, YAML_FORMAT } from "@/lib/editor/settingsFormat"

describe("the components setting", () => {
  it("reads an array, one path and paths separated by commas, in TOML and in YAML", () => {
    expect(readComponentList(TOML_FORMAT.get('components = ["a.typ", "lib/b.typ"]\n', "", "components"))).toEqual(["a.typ", "lib/b.typ"])
    expect(readComponentList(TOML_FORMAT.get('components = "a.typ, b.typ"\n', "", "components"))).toEqual(["a.typ", "b.typ"])
    expect(readComponentList(YAML_FORMAT.get("components: [a.typ, 'b.typ']\n", "", "components"))).toEqual(["a.typ", "b.typ"])
    expect(readComponentList(YAML_FORMAT.get("components: a.typ\n", "", "components"))).toEqual(["a.typ"])
    expect(readComponentList(undefined)).toEqual([])
  })

  it("does not touch a list it cannot rewrite", () => {
    expect(readComponentList(TOML_FORMAT.get('components = [\n  "a.typ",\n]\n', "", "components"))).toBeNull()
  })

  it("writes the list the way the file's format quotes a string, and the file reads it back", () => {
    for (const format of [TOML_FORMAT, YAML_FORMAT]) {
      const written = format.set("title = 1\n", "", "components", writeComponentList(["notes.typ", "lib/x.typ"], format.string))
      expect(readComponentList(format.get(written, "", "components"))).toEqual(["notes.typ", "lib/x.typ"])
    }
  })

  it("offers the project's .typ files, not the engine's paths", () => {
    expect(isComponentFile("notes.typ")).toBe(true)
    expect(isComponentFile("lib/notes.typ")).toBe(true)
    expect(isComponentFile("main.typ")).toBe(false)
    expect(isComponentFile("src/x.typ")).toBe(false)
    expect(isComponentFile("components/x.typ")).toBe(false)
    expect(isComponentFile("chapter.md")).toBe(false)
  })
})
