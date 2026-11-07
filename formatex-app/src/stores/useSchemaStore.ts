import { create } from "zustand"
import { componentsApi } from "@/lib/components/api"
import { schema as bundled, type Schema } from "@/lib/editor/schema"
import { isTauri } from "@/lib/platform"

interface SchemaState {
  /** The tags autocomplete knows: those of the open project when it has components of its own, else the library's. It starts as the engine's built-in schema and, in the app, is replaced by the real one. */
  schema: Schema
  /** The library's schema (built-in and the user's components), without any project. */
  base: Schema
  /** The schema of the open project, which adds the components its `components` setting lists; `null` when it lists none. */
  project: Schema | null
  /** Sets (or, with `null`, drops) the schema of the open project. */
  setProject: (project: Schema | null) => void
  /** Reads the schema again (after a component was added, changed, disabled or deleted). */
  refresh: () => Promise<void>
}

/**
 * The schema of every tag, built-in and the user's. The app computes it from the component library (`engine_schema`), so a new
 * component's tags appear in autocomplete as soon as its file is saved.
 */
export const useSchemaStore = create<SchemaState>()((set) => ({
  schema: bundled,
  base: bundled,
  project: null,
  setProject: (project) => set((state) => ({ project, schema: project ?? state.base })),
  refresh: async () => {
    if (!isTauri()) return
    try {
      // The project's schema was built on the old library: the editor asks for it again
      const base = await componentsApi.schema()
      set({ base, project: null, schema: base })
    } catch (error) {
      // The library does not load right now (a broken component): keep the last schema; the Components screen shows why
      console.warn("[formatex] could not read the schema", error)
    }
  },
}))
