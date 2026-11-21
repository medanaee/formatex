import { describe, expect, it } from "vitest"
import { componentFolderOf, isComponentFile, normalizeComponentFolder, projectComponentFolders, readComponentList, writeComponentList } from "@/lib/editor/componentList"
import { TOML_FORMAT, YAML_FORMAT } from "@/lib/editor/settingsFormat"

describe("the components setting", () => {
  it("reads an array, one path and paths separated by commas, in TOML and in YAML", () => {
    expect(readComponentList(TOML_FORMAT.get('components = ["cards", "pkg/callout"]\n', "", "components"))).toEqual(["cards", "pkg/callout"])
    expect(readComponentList(TOML_FORMAT.get('components = "cards, pkg/callout"\n', "", "components"))).toEqual(["cards", "pkg/callout"])
    expect(readComponentList(YAML_FORMAT.get("components: [cards, 'pkg/callout']\n", "", "components"))).toEqual(["cards", "pkg/callout"])
    expect(readComponentList(YAML_FORMAT.get("components: cards\n", "", "components"))).toEqual(["cards"])
    expect(readComponentList(undefined)).toEqual([])
  })

  it("does not touch a list it cannot rewrite", () => {
    expect(readComponentList(TOML_FORMAT.get('components = [\n  "cards",\n]\n', "", "components"))).toBeNull()
  })

  it("writes the list the way the file's format quotes a string, and the file reads it back", () => {
    for (const format of [TOML_FORMAT, YAML_FORMAT]) {
      const written = format.set("title = 1\n", "", "components", writeComponentList(["cards", "pkg/callout"], format.string))
      expect(readComponentList(format.get(written, "", "components"))).toEqual(["cards", "pkg/callout"])
    }
  })

  it("offers the project's component package folders (with manifest.toml), not engine paths", () => {
    expect(isComponentFile("cards/manifest.toml")).toBe(true)
    expect(isComponentFile("pkg/callout/manifest.toml")).toBe(true)
    expect(componentFolderOf("./cards/manifest.toml")).toBe("cards")
    expect(normalizeComponentFolder("./cards/")).toBe("cards")
    expect(isComponentFile("manifest.toml")).toBe(false)
    expect(isComponentFile("src/x/manifest.toml")).toBe(false)
    expect(isComponentFile("components/alert/manifest.toml")).toBe(false)
    expect(isComponentFile("tools/x/manifest.toml")).toBe(false)
    expect(isComponentFile("notes.typ")).toBe(false)
    expect(projectComponentFolders(["main.md", "cards/manifest.toml", "cards/typst.typ", "components/alert/manifest.toml", "pkg/callout/manifest.toml"])).toEqual(["cards", "pkg/callout"])
  })
})
