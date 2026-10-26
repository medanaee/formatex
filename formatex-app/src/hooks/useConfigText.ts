import { useEffect } from "react"
import { CONFIG_FILE } from "@/lib/projects"
import { useEditorStore } from "@/stores/useEditorStore"

/** The text of the project's `config.toml` (loaded on demand) and a way to replace it; the editor, the file and the preview follow. */
export function useConfigText(): [string | undefined, (next: string) => void] {
  const projectId = useEditorStore((state) => state.projectId)
  const text = useEditorStore((state) => state.texts[CONFIG_FILE])
  useEffect(() => {
    if (projectId) void useEditorStore.getState().load(CONFIG_FILE)
  }, [projectId])
  return [text, (next) => useEditorStore.getState().edit(CONFIG_FILE, next)]
}
