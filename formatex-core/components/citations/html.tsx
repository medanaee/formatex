import { arabicScript, digits } from "formatex"

interface BibEntry {
  type: string
  key: string
  fields: Record<string, string>
}

const citeOrderByDoc = new WeakMap<object, Map<string, number>>()

function collectCiteOrder(doc: any): Map<string, number> {
  const existing = citeOrderByDoc.get(doc)
  if (existing) return existing
  const order = new Map<string, number>()
  const walk = (node: any) => {
    if (!node || typeof node !== "object") return
    if (node.name === "cite" && node.props?.key) {
      for (const raw of String(node.props.key).split(",")) {
        const k = raw.trim()
        if (k && !order.has(k)) order.set(k, order.size + 1)
      }
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child)
    }
  }
  walk(doc.body ?? doc)
  citeOrderByDoc.set(doc, order)
  return order
}

function parseBibtex(text: string): Map<string, BibEntry> {
  const entries = new Map<string, BibEntry>()
  const re = /@(\w+)\s*\{\s*([^,\s]+)\s*,/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const type = match[1].toLowerCase()
    const key = match[2].trim()
    let i = re.lastIndex
    let depth = 1
    while (i < text.length && depth > 0) {
      if (text[i] === "{") depth += 1
      else if (text[i] === "}") depth -= 1
      i += 1
    }
    const body = text.slice(re.lastIndex, i - 1)
    const fields: Record<string, string> = {}
    let pos = 0
    while (pos < body.length) {
      while (pos < body.length && /[\s,]/.test(body[pos])) pos += 1
      const nameMatch = /^([a-zA-Z0-9_-]+)\s*=\s*/.exec(body.slice(pos))
      if (!nameMatch) break
      const fieldName = nameMatch[1].toLowerCase()
      pos += nameMatch[0].length
      let val = ""
      if (body[pos] === "{") {
        let d = 1
        pos += 1
        const start = pos
        while (pos < body.length && d > 0) {
          if (body[pos] === "{") d += 1
          else if (body[pos] === "}") d -= 1
          pos += 1
        }
        val = body.slice(start, pos - 1)
      } else if (body[pos] === '"') {
        pos += 1
        const start = pos
        while (pos < body.length && body[pos] !== '"') pos += 1
        val = body.slice(start, pos)
        pos += 1
      } else {
        const start = pos
        while (pos < body.length && body[pos] !== ",") pos += 1
        val = body.slice(start, pos)
      }
      fields[fieldName] = val.replace(/\s+/g, " ").replace(/[{}]/g, "").trim()
    }
    entries.set(key, { type, key, fields })
    re.lastIndex = i
  }
  return entries
}

function formatEntryText(entry: BibEntry): { author?: string; title?: string; venue?: string; year?: string } {
  const f = entry.fields
  return {
    author: f.author || f.editor,
    title: f.title,
    venue: f.journal || f.booktitle || f.publisher || f.school || f.howpublished,
    year: f.year,
  }
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const name = node.name
  const order = collectCiteOrder(context.document)
  const persian = context.language === "fa"

  if (name === "cite") {
    const keys = String(p.key ?? "").split(",").map(s => s.trim()).filter(Boolean)
    const page = p.page ? String(p.page) : ""
    return (
      <span className="fx-cite-group">
        {keys.map((k, idx) => {
          const num = order.get(k)
          const label = num !== undefined ? digits(num, persian) : k
          return (
            <span key={k}>
              {idx > 0 ? ", " : null}
              <a id={idx === 0 && p.id ? String(p.id) : undefined} className="fx-cite" href={`#bib-${k}`}>
                [{label}{page && idx === keys.length - 1 ? `, ${page}` : ""}]
              </a>
            </span>
          )
        })}
      </span>
    )
  }

  const cfg = (context.document.settings?.bibliography ?? {}) as Record<string, unknown>
  const file = String(p.file ?? cfg.file ?? "examples/references.bib")
  const title = String(p.title ?? cfg.title ?? (persian ? "منابع" : "References"))
  const dirSetting = String(p.dir ?? cfg.dir ?? context.document.settings?.dir ?? "ltr")
  const bibText = context.asset(file, true)
  const parsed = bibText ? parseBibtex(bibText) : new Map<string, BibEntry>()

  const items: { key: string; num: number; entry?: BibEntry }[] = []
  if (order.size > 0) {
    for (const [k, num] of order.entries()) items.push({ key: k, num, entry: parsed.get(k) })
  } else {
    let i = 1
    for (const [k, entry] of parsed.entries()) {
      items.push({ key: k, num: i++, entry })
    }
  }

  const sectionDir = dirSetting === "rtl" || dirSetting === "ltr" ? dirSetting : undefined
  return (
    <section id={p.id ? String(p.id) : undefined} className="fx-bibliography" dir={sectionDir}>
      {title && <h2 className="fx-bib-title">{title}</h2>}
      {items.length > 0 ? (
        <ol className="fx-bib-list">
          {items.map(({ key, num, entry }) => {
            const parts = entry ? formatEntryText(entry) : undefined
            const sample = [parts?.author, parts?.title, parts?.venue].filter(Boolean).join(" ")
            const entryDir = dirSetting === "auto" ? (arabicScript(sample) ? "rtl" : "ltr") : sectionDir
            const numLabel = digits(num, entryDir === "rtl")
            return (
              <li key={key} id={`bib-${key}`} className="fx-bib-item" dir={entryDir}>
                <span className="fx-bib-num">[{numLabel}]</span>
                <span className="fx-bib-body">
                  {parts ? (
                    <>
                      {parts.author && <span className="fx-bib-author">{parts.author}. </span>}
                      {parts.title && <span className="fx-bib-entry-title">«{parts.title}». </span>}
                      {parts.venue && <em className="fx-bib-venue">{parts.venue}</em>}
                      {parts.venue && parts.year ? ", " : parts.year ? " " : ""}
                      {parts.year && <span className="fx-bib-year">{parts.year}</span>}
                      .
                    </>
                  ) : key}
                </span>
              </li>
            )
          })}
        </ol>
      ) : (
        context.children(node)
      )}
    </section>
  )
}
