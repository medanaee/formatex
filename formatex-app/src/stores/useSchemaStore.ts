import { create } from "zustand"
import { componentsApi } from "@/lib/components/api"
import { schema as bundled, type Schema } from "@/lib/editor/schema"
import { isTauri } from "@/lib/platform"

interface SchemaState {
  /** The tags autocomplete knows. It starts as the engine's built-in schema and, in the app, is replaced by the real one. */
  schema: Schema
  /** Reads the schema again (after a component was added, changed, disabled or deleted). */
  refresh: () => Promise<void>
}

/**
 * The schema of every tag, built-in and the user's. The app computes it from the component library (`engine_schema`), so a new
 * component's tags appear in autocomplete as soon as its file is saved.
 */
export const useSchemaStore = create<SchemaState>()((set) => ({
  schema: bundled,
  refresh: async () => {
    if (!isTauri()) return
    try {
      set({ schema: await componentsApi.schema() })
    } catch (error) {
      // The library does not load right now (a broken component): keep the last schema; the Components screen shows why
      console.warn("[formatex] could not read the schema", error)
    }
  },
}))
