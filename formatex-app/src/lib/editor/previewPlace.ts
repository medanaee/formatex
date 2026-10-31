import { placeFromMarkers } from "@/lib/editor/markerLookup"
import { previewPlaceOf, type PreviewPlace } from "@/lib/editor/previewLookup"
import { useEditorStore } from "@/stores/useEditorStore"

/**
 * Where a line of a file of the open project is on the preview pages. The engine's markers give the block exactly
 * ([ADR 0009](../../../docs/decisions/0009-exact-source-mapping.md)); when there are none for that line (a build without markers, a line
 * above the first block) the text search over the whole document answers, as before ([ADR 0008](../../../docs/decisions/0008-source-to-preview-mapping.md)).
 */
export function previewPlaceForLine(file: string, source: string, line: number, column: number): PreviewPlace | null {
  const { markers, pages, mainFile } = useEditorStore.getState()
  const maps = pages.map((page) => page.map)
  return placeFromMarkers(markers, maps, file, source, line, column) ?? previewPlaceOf(source, line, column, maps, file === mainFile)
}
