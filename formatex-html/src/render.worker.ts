import { renderHtml, type RenderOptions } from "./render"
import { DocumentError, type DocumentIR } from "@formatex/core"
import { MissingAssetsError } from "./assets"

// Component code executes in a worker without a window, app stores, or Tauri IPC.
self.onmessage = async (event: MessageEvent<{ id: number; document: DocumentIR; options: RenderOptions }>) => {
  const { id, document, options } = event.data
  try {
    const html = await renderHtml(document, options)
    self.postMessage({ id, html })
  }
  catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : String(error), requests: error instanceof MissingAssetsError ? error.requests : undefined, at: error instanceof DocumentError ? error.at : undefined }) }
}
