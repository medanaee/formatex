import type { Diagnostic } from "@/lib/compiler"
import { isTauri } from "@/lib/platform"
import type { Schema } from "@/lib/editor/schema"
import * as web from "./webComponents"

export type ComponentOrigin = "builtin" | "user" | "store"

export interface ComponentInfo {
  name: string
  origin: ComponentOrigin
  /** A built-in that the user replaced with their own version. */
  modified: boolean
  enabled: boolean
  /** The tags the component declares. */
  tags: string[]
  /** Why the component is left out of the registry, when it is. */
  problem: string | null
}

export interface ComponentSource {
  /** The text in use (the user's version when there is one). */
  source: string
  /** The built-in version, when the component is a built-in. */
  builtin: string | null
}

/** What a change did to the library as a whole: does everything still load? */
export interface CheckOutput {
  ok: boolean
  diagnostics: Diagnostic[]
}

async function invoke<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core")
  return invoke<T>(command, args)
}

/**
 * The component library. In the app the Rust side owns it: it keeps the files, generates the registry the engine imports, and
 * checks that everything loads. A browser keeps the components in localStorage, without a compiler to check them.
 */
export const componentsApi = {
  list: (): Promise<ComponentInfo[]> => (isTauri() ? invoke("components_list") : web.list()),
  source: (name: string): Promise<ComponentSource> => (isTauri() ? invoke("component_source", { name }) : web.source(name)),
  /** Saves (or creates) a component. `origin` is "user", or "store" for one that was downloaded. */
  save: (name: string, source: string, origin: ComponentOrigin = "user"): Promise<CheckOutput> =>
    isTauri() ? invoke("component_save", { name, source, origin }) : web.save(name, source),
  /** Deletes a user's component, or the user's version of a built-in (the built-in comes back). */
  remove: (name: string): Promise<CheckOutput> => (isTauri() ? invoke("component_delete", { name }) : web.remove(name)),
  setEnabled: (name: string, enabled: boolean): Promise<CheckOutput> =>
    isTauri() ? invoke("component_set_enabled", { name, enabled }) : web.setEnabled(name, enabled),
  /** The schema of every enabled tag, the user's included (the app only). */
  schema: (): Promise<Schema> => invoke("engine_schema"),
}
