import { beforeEach, describe, expect, it } from "vitest"
import { useLibraryStore } from "./useLibraryStore"

describe("library folders", () => {
  beforeEach(() => useLibraryStore.setState({ documents: [], folders: [], folderId: null, clipboard: null }))

  it("files a project in a folder, and moving a folder into itself or below itself is refused", () => {
    const store = useLibraryStore.getState()
    const a = store.createFolder("A", null)
    const b = store.createFolder("B", a.id)
    const doc = store.createDocument("Doc", null)
    store.move([doc.id], [], b.id)
    expect(useLibraryStore.getState().documents[0].parentId).toBe(b.id)
    store.move([], [a.id], b.id)
    expect(useLibraryStore.getState().folders.find((f) => f.id === a.id)?.parentId).toBeNull()
    store.move([], [b.id], null)
    expect(useLibraryStore.getState().folders.find((f) => f.id === b.id)?.parentId).toBeNull()
  })

  it("deleting a folder moves what was in it up one level", () => {
    const store = useLibraryStore.getState()
    const a = store.createFolder("A", null)
    const b = store.createFolder("B", a.id)
    const doc = store.createDocument("Doc", b.id)
    store.removeFolder(b.id)
    expect(useLibraryStore.getState().documents.find((d) => d.id === doc.id)?.parentId).toBe(a.id)
  })

  it("duplicates a project record with a new id and a suffix", () => {
    const store = useLibraryStore.getState()
    const doc = store.createDocument("Doc", null)
    const copy = store.duplicateDocument(doc.id, "(copy)")
    expect(copy?.id).not.toBe(doc.id)
    expect(copy?.title).toBe("Doc (copy)")
  })
})
