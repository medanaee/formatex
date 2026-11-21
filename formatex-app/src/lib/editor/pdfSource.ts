import type { PageMap, PageSource } from "@/lib/compiler"
import type { PreviewPlace } from "./previewLookup"

type IndexedRange = {box:PageSource;range:PageSource["source"][number];prefixEnd:number}
const indexes = new WeakMap<PageMap, Map<string,IndexedRange[]>>()
function indexOf(map:PageMap):Map<string,IndexedRange[]> {
  const existing=indexes.get(map); if(existing) return existing
  const files=new Map<string,IndexedRange[]>()
  for(const box of map.sources??[]) for(const range of box.source) {
    const entries=files.get(range.file)??[]; entries.push({box,range,prefixEnd:0}); files.set(range.file,entries)
  }
  for(const entries of files.values()) {
    entries.sort((a,b)=>a.range.utf16Start-b.range.utf16Start)
    let end=0; for(const entry of entries) {end=Math.max(end,entry.range.utf16End);entry.prefixEnd=end}
  }
  indexes.set(map,files); return files
}

/** Direct provenance wins over all text matching, including duplicate words and includes. */
export function pdfSourceAt(map: PageMap | null | undefined, x: number, y: number): PageSource["source"][number] | null {
  const candidates = (map?.sources ?? []).filter(box => x >= box.x - .5 && x <= box.x + box.w + .5 && y >= box.y - .5 && y <= box.y + box.h + .5)
  candidates.sort((a, b) => a.w * a.h - b.w * b.h)
  return candidates[0]?.source[0] ?? null
}

export function sourceOffset(source: string, line: number, column: number): number {
  let start = 0
  for (let at = 1; at < line; at++) { const end = source.indexOf("\n", start); if (end < 0) return source.length; start = end + 1 }
  const end = source.indexOf("\n", start)
  return Math.min(start + Math.max(0, column - 1), end < 0 ? source.length : end)
}

/** The actual wrapped row containing the source word, rather than the paragraph's first row. */
export function pdfPlaceAt(pages: (PageMap | null)[], file: string, offset: number): PreviewPlace | null {
  let best: { box: PageSource; page: number; length: number } | undefined
  pages.forEach((map, page) => {
    const entries=map?indexOf(map).get(file):undefined; if(!entries) return
    let low=0,high=entries.length
    while(low<high) {const mid=(low+high)>>>1;if(entries[mid].range.utf16Start<=offset)low=mid+1;else high=mid}
    for(let i=low-1;i>=0 && entries[i].prefixEnd>offset;i--) {
    const {box,range}=entries[i]
    if (offset >= range.utf16End) continue
    const length = range.utf16End - range.utf16Start
    if (!best || length < best.length) best = { box, page, length }
  } })
  return best ? { page: best.page, y: best.box.y, h: best.box.h, approximate: false } : null
}
