import { Icon, arabicScript, captionPosition, codeLanguage, digits, flowDir, textDir, textOf } from "formatex"

const FILE_ICONS = {
  png: "file-image", jpg: "file-image", jpeg: "file-image", gif: "file-image", svg: "file-image", webp: "file-image",
  pdf: "file-pdf", zip: "file-zipper", gz: "file-zipper", tar: "file-zipper", "7z": "file-zipper", rar: "file-zipper",
  csv: "file-csv", txt: "file-lines", log: "file-lines", bib: "book", lock: "lock",
  mp4: "file-video", mov: "file-video", mp3: "file-audio", wav: "file-audio",
  xlsx: "file-excel", xls: "file-excel", docx: "file-word", doc: "file-word", pptx: "file-powerpoint",
}

const LANG_ICONS = {
  Bash: "terminal",
  PowerShell: "terminal",
  SQL: "database",
  TOML: "gear",
  YAML: "file-lines",
  Markdown: "file-lines",
  LaTeX: "book",
  Typst: "book",
}

function treeIcon(name, folder, open) {
  if (folder) return open ? "folder-open" : "folder"
  const lowered = name.toLowerCase()
  if (lowered.startsWith(".git") || lowered.startsWith(".env")) return "gear"
  const parts = lowered.split(".")
  const key = parts.length < 2 ? lowered : parts[parts.length - 1]
  if (FILE_ICONS[key]) return FILE_ICONS[key]
  const lang = codeLanguage(key)
  if (!lang || lang === key) return "file"
  return LANG_ICONS[lang] ?? "file-code"
}

function parseTreeItems(source) {
  const rawItems = []
  const stack = []
  for (const rawLine of source.split("\n")) {
    const line = rawLine.replace(/\r$/, "").replaceAll("\t", "    ")
    if (line.trim() === "") continue
    const match = /^((?:[ │├└┬┼─|`+\\]|-{2,})*)(.*)$/.exec(line)
    const prefix = match?.[1] ?? ""
    const rest = match?.[2] ?? line
    const indent = [...prefix].length
    while (stack.length > 0 && stack[stack.length - 1] >= indent) stack.pop()
    const depth = stack.length
    stack.push(indent)
    const noteMatch = /^(.*?)\s+#\s*(.*)$/.exec(rest)
    const rawName = (noteMatch ? noteMatch[1] : rest).trim()
    const note = noteMatch ? noteMatch[2].trim() : ""
    rawItems.push({ depth, name: rawName, note })
  }

  const withMeta = rawItems.map((item, i) => {
    const next = rawItems[i + 1]
    const children = !!next && next.depth > item.depth
    let more = false
    for (let j = i + 1; j < rawItems.length; j += 1) {
      const dj = rawItems[j].depth
      if (dj <= item.depth) {
        more = dj === item.depth
        break
      }
    }
    const folder = children || item.name.endsWith("/")
    const name = item.name === "/" ? "/" : item.name.replace(/\/+$/, "")
    return { ...item, name, folder, children, more }
  })

  const open = []
  return withMeta.map(item => {
    const guides = []
    for (let k = 1; k < item.depth; k += 1) guides.push(!!open[k])
    open.length = item.depth
    open[item.depth] = item.more
    return { ...item, guides }
  })
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const icons = p.icons !== false && p.icons !== "false"
  const source = p.src
    ? context.asset(String(p.src), true)
    : (() => {
        const codeNode = node.children?.find(ch => ch.type === "code")
        if (codeNode?.value !== undefined) return String(codeNode.value)
        if (node.value !== undefined) {
          return String(node.value).replace(/^\s*(```|~~~)[^\n]*\n?/, "").replace(/\n?(```|~~~)\s*$/, "")
        }
        return textOf(node)
      })()

  const items = source ? parseTreeItems(source) : []

  const body = (
    <div id={!p.caption && !context.numbers.has(node.key) && p.id ? String(p.id) : undefined} className="fx-tree" dir="ltr">
      {items.map((item, idx) => (
        <div key={idx} className="fx-tree-row">
          {item.guides.map((hasLine, gIdx) => (
            <span key={gIdx} className="fx-tree-slot" aria-hidden="true">
              {hasLine && (
                <svg className="fx-tree-svg" viewBox="0 0 24 24" preserveAspectRatio="none">
                  <path d="M12 0V24" fill="none" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              )}
            </span>
          ))}
          {item.depth >= 1 && (
            <span className="fx-tree-slot" aria-hidden="true">
              <svg className="fx-tree-svg" viewBox="0 0 24 24" preserveAspectRatio="none">
                <path className="fx-tree-elbow-sharp" d="M12 0V12H24" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path className="fx-tree-elbow-round" d="M12 0V7Q12 12 17 12H24" fill="none" stroke="currentColor" strokeWidth="1.2" />
                {item.more && <path d="M12 12V24" fill="none" stroke="currentColor" strokeWidth="1.2" />}
              </svg>
            </span>
          )}
          {icons && (
            <span className={`fx-tree-icon${item.folder ? " fx-tree-icon-folder" : ""}`} aria-hidden="true">
              <Icon name={treeIcon(item.name, item.folder, item.children)} />
            </span>
          )}
          <span className={`fx-tree-name${item.folder ? " fx-tree-name-folder" : ""}`}>
            {item.name}{item.folder && !icons && item.name !== "/" ? "/" : ""}
          </span>
          {item.note && (
            <span className="fx-tree-note" dir={textDir(item.note) ?? "ltr"}>{item.note}</span>
          )}
        </div>
      ))}
    </div>
  )

  const caption = p.caption ? String(p.caption) : ""
  const numbered = context.numbers.has(node.key)
  if (!numbered && !caption) return body

  const figDir = flowDir(p.dir)
  const rtl = figDir === "rtl" || (figDir !== "ltr" && (caption ? arabicScript(caption) : context.language === "fa"))
  const number = context.numbers.get(node.key)
  const position = captionPosition(context.document.settings, "figure", p, "below")
  const figcaption = (
    <figcaption className="fx-fig-caption">
      {numbered && <span className="fx-fig-number">{rtl ? "شکل" : "Figure"} {digits(number ?? 0, rtl)}</span>}
      {numbered && caption ? ": " : ""}
      {caption}
    </figcaption>
  )

  return (
    <figure id={p.id ? String(p.id) : undefined} dir={figDir} className="fx-fig fx-tree-figure">
      {position === "above" && figcaption}
      {body}
      {position !== "above" && figcaption}
    </figure>
  )
}
