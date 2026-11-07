// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest"
import type { DocumentItem } from "@/lib/db/types"
import { useLibraryStore } from "@/stores/useLibraryStore"
import { openProjectFs } from "./index"
import { changeProjectKind, initTypstProject, TYPST_MAIN_FILE, TYPST_TEMPLATE_FILE } from "./projectKind"

const doc = (id: string, patch: Partial<DocumentItem> = {}): DocumentItem => ({ id, title: id, mainFile: "main.md", kind: "formatex", createdAt: 1, updatedAt: 1, ...patch })
const current = (id: string) => useLibraryStore.getState().documents.find((item) => item.id === id)!

beforeEach(() => {
  localStorage.clear()
  useLibraryStore.getState().hydrate([])
})

describe("a plain Typst project", () => {
  it("starts with an empty template and a main file that only uses it", async () => {
    useLibraryStore.getState().hydrate([doc("t", { kind: "typst", mainFile: "" })])
    await initTypstProject("t")
    const fs = await openProjectFs("t")
    expect(await fs.readText(TYPST_TEMPLATE_FILE)).toContain("#let template(doc)")
    const main = await fs.readText(TYPST_MAIN_FILE)
    expect(main).toContain(`#import "${TYPST_TEMPLATE_FILE}": template`)
    expect(main).toContain("#show: template")
    // No config.toml, no Markdown: it is only Typst
    expect(await fs.exists("config.toml")).toBe(false)
    expect(await fs.exists("main.md")).toBe(false)
  })

  it("does not overwrite a main file or template that are there", async () => {
    useLibraryStore.getState().hydrate([doc("t", { kind: "typst", mainFile: "" })])
    const fs = await openProjectFs("t")
    await fs.writeText(TYPST_MAIN_FILE, "= Mine\n")
    await initTypstProject("t")
    expect(await fs.readText(TYPST_MAIN_FILE)).toBe("= Mine\n")
  })
})

describe("changing what a project is", () => {
  it("Formatex to plain Typst leaves every file alone and keeps no main file", async () => {
    useLibraryStore.getState().hydrate([doc("p")])
    const fs = await openProjectFs("p")
    await fs.writeText("config.toml", 'source = "main.md"\n')
    await fs.writeText("main.md", "# Mine\n")
    await changeProjectKind("p", "typst")
    expect(current("p")).toMatchObject({ kind: "typst", mainFile: "" })
    expect(await fs.readText("config.toml")).toBe('source = "main.md"\n')
    expect(await fs.readText("main.md")).toBe("# Mine\n")
  })

  it("plain Typst to Formatex makes the config and the starter document it lacks", async () => {
    useLibraryStore.getState().hydrate([doc("t", { kind: "typst", mainFile: "" })])
    await initTypstProject("t")
    await changeProjectKind("t", "formatex")
    const fs = await openProjectFs("t")
    expect(current("t")).toMatchObject({ kind: "formatex", mainFile: "main.md" })
    expect(await fs.readText("config.toml")).toContain('source = "main.md"')
    expect((await fs.readText("main.md")).length).toBeGreaterThan(0)
    // The Typst files stay
    expect(await fs.exists(TYPST_MAIN_FILE)).toBe(true)
  })

  it("going back to Formatex keeps what is already there", async () => {
    useLibraryStore.getState().hydrate([doc("p")])
    const fs = await openProjectFs("p")
    await fs.writeText("config.toml", 'source = "chapters/one.md"\ntheme = "nord"\n')
    await fs.writeText("main.md", "# Old main\n")
    await changeProjectKind("p", "typst")
    await changeProjectKind("p", "formatex")
    expect(await fs.readText("config.toml")).toBe('source = "chapters/one.md"\ntheme = "nord"\n')
    expect(await fs.readText("main.md")).toBe("# Old main\n")
    // The main file is the one the config names
    expect(current("p").mainFile).toBe("chapters/one.md")
  })

  it("does nothing when the project already is that kind", async () => {
    useLibraryStore.getState().hydrate([doc("p")])
    await changeProjectKind("p", "formatex")
    const fs = await openProjectFs("p")
    expect(await fs.exists("config.toml")).toBe(false)
  })
})
