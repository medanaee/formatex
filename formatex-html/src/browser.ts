import { DocumentError, type Location, type DocumentIR } from "@formatex/core"
import type { RenderOptions } from "./render"
import { MissingAssetsError, type AssetRequest } from "./assets"
let worker: Worker | undefined
let serial = 0
const pending = new Map<number, { resolve: (html: string) => void; reject: (error: Error) => void }>()

/** Worker transport contains no native or app-specific services. */
export function renderInWorker(document: DocumentIR, options: RenderOptions): Promise<string> {
  worker ??= new Worker(new URL("./render.worker.ts", import.meta.url), { type: "module" })
  worker.onmessage = (event: MessageEvent<{ id: number; html?: string; error?: string; requests?: AssetRequest[]; at?: Location }>) => {
    const request = pending.get(event.data.id)
    pending.delete(event.data.id)
    if (event.data.requests) request?.reject(new MissingAssetsError(event.data.requests))
    else if (event.data.error) request?.reject(event.data.at ? new DocumentError(event.data.error,event.data.at) : new Error(event.data.error))
    else request?.resolve(event.data.html ?? "")
  }
  worker.onerror = event => { for (const request of pending.values()) request.reject(new Error(event.message)); pending.clear(); worker?.terminate(); worker = undefined }
  const id = ++serial
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); worker!.postMessage({ id, document, options }) })
}
