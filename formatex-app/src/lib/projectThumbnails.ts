import { compilerAvailable, projectPreview } from "@/lib/compiler"
import type { DocumentItem } from "@/lib/db/types"

/** Thumbnails by project and time of last change: an edited project gets a new one, an untouched one keeps its. */
const cache = new Map<string, string | null>()
let chain: Promise<unknown> = Promise.resolve()

const keyOf = (doc: DocumentItem) => `${doc.id}:${doc.updatedAt}:${doc.mainFile}`

export const cachedThumbnail = (doc: DocumentItem): string | null | undefined => cache.get(keyOf(doc))

/**
 * The first page of a project as an image URL (`null` when it cannot be typeset or there is no compiler). Requests run one at a
 * time, so a library of many projects does not start many compilations at once.
 */
export function requestThumbnail(doc: DocumentItem): Promise<string | null> {
  const key = keyOf(doc)
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null)
  if (!compilerAvailable()) return Promise.resolve(null)
  const run = chain.then(async () => {
    if (cache.has(key)) return cache.get(key) ?? null
    let url: string | null = null
    try {
      const svg = await projectPreview(doc.id, doc.mainFile)
      if (svg) url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
    } catch {
      url = null
    }
    // Older thumbnails of the same project are no longer needed
    for (const [other, old] of cache) {
      if (other.startsWith(`${doc.id}:`)) {
        if (old) URL.revokeObjectURL(old)
        cache.delete(other)
      }
    }
    cache.set(key, url)
    return url
  })
  chain = run.catch(() => null)
  return run
}
