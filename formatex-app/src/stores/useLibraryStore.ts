import { create } from "zustand"
import type { DocumentItem, FolderItem } from "@/lib/db/types"

/** What is in the clipboard of the library: projects and folders, to be copied (projects only) or moved. */
export interface LibraryClipboard {
  docs: string[]
  folders: string[]
  mode: "copy" | "cut"
}

interface LibraryState {
  documents: DocumentItem[]
  folders: FolderItem[]
  /** The folder being shown; null is the top level. Not stored. */
  folderId: string | null
  clipboard: LibraryClipboard | null
  /** False until the storage has been read; the boot screen keeps the app hidden until then. */
  loaded: boolean
  hydrate: (documents: DocumentItem[], folders?: FolderItem[]) => void
  /** `location`: the folder of the user's that holds the project's files (none: the app's own storage). */
  createDocument: (title: string, parentId?: string | null, location?: string | null) => DocumentItem
  /** A new project record titled "<title> (copy)" next to the original; its files are copied by the caller. */
  duplicateDocument: (id: string, suffix: string) => DocumentItem | null
  renameDocument: (id: string, title: string) => void
  setMainFile: (id: string, mainFile: string) => void
  /** Moves a project's files' home: a folder of the user's, or `null` for the app's own storage (the files are copied by the caller). */
  setLocation: (id: string, location: string | null) => void
  /** Marks a project as changed now (a file in it was edited), so the library lists it first. */
  touch: (id: string) => void
  removeDocument: (id: string) => void

  openFolder: (id: string | null) => void
  createFolder: (name: string, parentId?: string | null) => FolderItem
  renameFolder: (id: string, name: string) => void
  /** Deletes the folder; what was in it moves up to the folder's own parent. */
  removeFolder: (id: string) => void
  /** Moves projects and folders into a folder (null: the top level). A folder cannot go into itself or below itself. */
  move: (docs: string[], folders: string[], target: string | null) => void
  setClipboard: (clipboard: LibraryClipboard | null) => void
}

const patch = (documents: DocumentItem[], id: string, changes: Partial<DocumentItem>): DocumentItem[] =>
  documents.map((doc) => (doc.id === id ? { ...doc, ...changes, updatedAt: Date.now() } : doc))

/** Whether `candidate` is `folderId` or lies somewhere below it. */
export function isInside(folders: FolderItem[], candidate: string | null, folderId: string): boolean {
  for (let current = candidate, guard = 0; current && guard < 1000; guard++) {
    if (current === folderId) return true
    current = folders.find((folder) => folder.id === current)?.parentId ?? null
  }
  return false
}

/**
 * The library in memory. Components read and change it here; `lib/db/sync.ts` watches it and writes the changes to storage, so
 * a store action never awaits the database.
 */
export const useLibraryStore = create<LibraryState>()((set, get) => ({
  documents: [],
  folders: [],
  folderId: null,
  clipboard: null,
  loaded: false,

  hydrate: (documents, folders = []) => set({ documents, folders, loaded: true }),

  createDocument: (title, parentId = get().folderId, location = null) => {
    const now = Date.now()
    const doc: DocumentItem = { id: crypto.randomUUID(), title, mainFile: "main.md", parentId, location, createdAt: now, updatedAt: now }
    set((state) => ({ documents: [doc, ...state.documents] }))
    return doc
  },

  duplicateDocument: (id, suffix) => {
    const source = get().documents.find((doc) => doc.id === id)
    if (!source) return null
    const now = Date.now()
    // A copy is always kept in the app (copying files out of a folder must not write into the same folder)
    const copy: DocumentItem = { ...source, id: crypto.randomUUID(), title: `${source.title} ${suffix}`, location: null, createdAt: now, updatedAt: now }
    set((state) => ({ documents: [copy, ...state.documents] }))
    return copy
  },

  renameDocument: (id, title) => set((state) => ({ documents: patch(state.documents, id, { title }) })),

  setMainFile: (id, mainFile) => set((state) => ({ documents: patch(state.documents, id, { mainFile }) })),

  setLocation: (id, location) => set((state) => ({ documents: patch(state.documents, id, { location }) })),

  touch: (id) => set((state) => ({ documents: patch(state.documents, id, {}) })),

  removeDocument: (id) => set((state) => ({ documents: state.documents.filter((doc) => doc.id !== id) })),

  openFolder: (folderId) => set({ folderId }),

  createFolder: (name, parentId = get().folderId) => {
    const now = Date.now()
    const folder: FolderItem = { id: crypto.randomUUID(), name, parentId, createdAt: now, updatedAt: now }
    set((state) => ({ folders: [...state.folders, folder] }))
    return folder
  },

  renameFolder: (id, name) => set((state) => ({ folders: state.folders.map((folder) => (folder.id === id ? { ...folder, name, updatedAt: Date.now() } : folder)) })),

  removeFolder: (id) =>
    set((state) => {
      const parent = state.folders.find((folder) => folder.id === id)?.parentId ?? null
      return {
        folders: state.folders.filter((folder) => folder.id !== id).map((folder) => (folder.parentId === id ? { ...folder, parentId: parent } : folder)),
        documents: state.documents.map((doc) => (doc.parentId === id ? { ...doc, parentId: parent } : doc)),
        folderId: state.folderId === id ? parent : state.folderId,
      }
    }),

  move: (docs, folders, target) =>
    set((state) => ({
      // A project keeps its "last changed" time when it is only filed somewhere else
      documents: state.documents.map((doc) => (docs.includes(doc.id) ? { ...doc, parentId: target } : doc)),
      folders: state.folders.map((folder) =>
        folders.includes(folder.id) && !isInside(state.folders, target, folder.id) ? { ...folder, parentId: target, updatedAt: Date.now() } : folder
      ),
    })),

  setClipboard: (clipboard) => set({ clipboard }),
}))
