import { useEffect, useMemo } from "react"
import { frontMatterEntries, type FrontMatterEntry } from "@/lib/editor/overrides"
import { useEditorStore } from "@/stores/useEditorStore"

const NONE: FrontMatterEntry[] = []

/** The settings the project's main document sets in its front matter (read live from the editor's text, loaded on demand). */
export function useFrontMatterEntries(): { entries: FrontMatterEntry[]; file: string } {
  const projectId = useEditorStore((state) => state.projectId)
  const file = useEditorStore((state) => state.mainFile)
  const text = useEditorStore((state) => state.texts[state.mainFile])
  useEffect(() => {
    if (projectId && text === undefined) void useEditorStore.getState().load(file)
  }, [projectId, file, text])
  const entries = useMemo(() => (text === undefined ? NONE : frontMatterEntries(text)), [text])
  return { entries, file }
}
