import { CONFIG_FILE, DEFAULT_CONFIG } from "@/lib/projects"
import { useEditorStore } from "@/stores/useEditorStore"
import { useWorkspaceStore } from "@/stores/useWorkspaceStore"

/**
 * The project's settings are its config file, opened in the editor like any file (the visual settings panel, or the source):
 * `config.toml` of a project in the app, `.formatex/config.toml` of a project in a folder (the editor reads and writes both under
 * the name `config.toml`; the file system puts it in the right place). A project that has none yet gets the default one.
 */
export async function openProjectSettings(): Promise<void> {
  useWorkspaceStore.getState().set({ tab: "edit", filesSheet: false })
  const store = useEditorStore.getState()
  await store.load(CONFIG_FILE).catch(() => store.edit(CONFIG_FILE, DEFAULT_CONFIG))
  await useEditorStore.getState().select(CONFIG_FILE)
}
