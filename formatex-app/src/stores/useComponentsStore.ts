import { create } from "zustand"
import { componentsApi, type CheckOutput, type ComponentInfo } from "@/lib/components/api"
import { newComponentSource, type ComponentKind } from "@/lib/components/template"
import { useSchemaStore } from "@/stores/useSchemaStore"

/** Typing is saved after a pause; the save also checks that the whole library still loads. */
const SAVE_DELAY_MS = 800

export type ComponentSaveState = "saved" | "saving" | "error"

interface ComponentsState {
  components: ComponentInfo[]
  loaded: boolean
  /** Text of the components that were opened. */
  texts: Record<string, string>
  /** The built-in version of the opened built-ins, to compare with and to revert to. */
  builtins: Record<string, string | null>
  saveState: ComponentSaveState
  /** What the last change did to the library: it loads, or the errors (with the component and line). */
  check: CheckOutput | null

  refresh: () => Promise<void>
  open: (name: string) => Promise<void>
  edit: (name: string, text: string) => void
  create: (name: string, kind: ComponentKind) => Promise<void>
  remove: (name: string) => Promise<void>
  setEnabled: (name: string, enabled: boolean) => Promise<void>
}

const pending = new Map<string, ReturnType<typeof setTimeout>>()

export const useComponentsStore = create<ComponentsState>()((set, get) => {
  /** After the library changed: the list, the check result and the schema autocomplete reads. */
  async function applied(check: CheckOutput) {
    set({ check })
    await get().refresh()
    await useSchemaStore.getState().refresh()
  }

  async function save(name: string): Promise<void> {
    const text = get().texts[name]
    if (text === undefined) return
    try {
      await applied(await componentsApi.save(name, text))
      if (pending.size === 0) set({ saveState: "saved" })
    } catch (error) {
      console.error("[formatex] could not save the component", name, error)
      set({ saveState: "error" })
    }
  }

  return {
    components: [],
    loaded: false,
    texts: {},
    builtins: {},
    saveState: "saved",
    check: null,

    refresh: async () => set({ components: await componentsApi.list(), loaded: true }),

    open: async (name) => {
      if (get().texts[name] !== undefined) return
      const { source, builtin } = await componentsApi.source(name)
      set((state) => ({ texts: { ...state.texts, [name]: source }, builtins: { ...state.builtins, [name]: builtin } }))
    },

    edit: (name, text) => {
      set((state) => ({ texts: { ...state.texts, [name]: text }, saveState: "saving" }))
      clearTimeout(pending.get(name))
      pending.set(
        name,
        setTimeout(() => {
          pending.delete(name)
          void save(name)
        }, SAVE_DELAY_MS)
      )
    },

    create: async (name, kind) => {
      const source = newComponentSource(name, kind)
      set((state) => ({ texts: { ...state.texts, [name]: source }, builtins: { ...state.builtins, [name]: null } }))
      await applied(await componentsApi.save(name, source))
    },

    remove: async (name) => {
      clearTimeout(pending.get(name))
      pending.delete(name)
      // The text in use may change (a built-in comes back): read it again when it is opened
      set((state) => {
        const { [name]: _removed, ...texts } = state.texts
        return { texts }
      })
      await applied(await componentsApi.remove(name))
    },

    setEnabled: async (name, enabled) => {
      await applied(await componentsApi.setEnabled(name, enabled))
    },
  }
})
