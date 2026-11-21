import { Fragment } from "react"
import { Icon, arabicScript, codeLanguageInfo, digits, flowDir, resolveDir, textOf } from "formatex"

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function diffLines(text) {
  const lines = text.replace(/\r/g, "").split("\n")
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop()
  return lines
}

function sideRaw(side, context) {
  if (!side) return { lines: [], lang: "" }
  const sp = context.props(side)
  if (sp.src) {
    const srcPath = String(sp.src)
    return { lines: diffLines(context.asset(srcPath, true)), lang: srcPath.split(".").pop() ?? "" }
  }
  const codeNode = side.children?.find(ch => ch.type === "code")
  if (codeNode) return { lines: diffLines(codeNode.value ?? ""), lang: codeNode.lang ?? "" }
  const text = side.value !== undefined
    ? String(side.value).replace(/^\s*(```|~~~)[^\n]*\n?/, "").replace(/\n?(```|~~~)\s*$/, "")
    : textOf(side)
  return { lines: diffLines(text), lang: "" }
}

function computeOps(oldLines, newLines) {
  const a = oldLines.map(line => line.replace(/\s+$/, ""))
  const b = newLines.map(line => line.replace(/\s+$/, ""))
  const n = a.length
  const m = b.length
  let pre = 0
  while (pre < n && pre < m && a[pre] === b[pre]) pre += 1
  let suf = 0
  while (suf < n - pre && suf < m - pre && a[n - 1 - suf] === b[m - 1 - suf]) suf += 1
  const p = n - pre - suf
  const q = m - pre - suf

  const rows = Array.from({ length: p + 1 }, () => new Array(q + 1).fill(0))
  for (let i = p - 1; i >= 0; i -= 1) {
    for (let j = q - 1; j >= 0; j -= 1) {
      rows[i][j] = a[pre + i] === b[pre + j]
        ? rows[i + 1][j + 1] + 1
        : Math.max(rows[i + 1][j], rows[i][j + 1])
    }
  }

  const eq = (oi, ni) => ({ kind: "eq", oi, ni, on: oi + 1, nn: ni + 1 })
  const ops = []
  for (let k = 0; k < pre; k += 1) ops.push(eq(k, k))
  let i = 0
  let j = 0
  while (i < p || j < q) {
    if (i < p && j < q && a[pre + i] === b[pre + j]) {
      ops.push(eq(pre + i, pre + j))
      i += 1
      j += 1
    } else if (i < p && (j === q || rows[i + 1][j] >= rows[i][j + 1])) {
      ops.push({ kind: "del", oi: pre + i, ni: null, on: pre + i + 1, nn: null })
      i += 1
    } else {
      ops.push({ kind: "add", oi: null, ni: pre + j, on: null, nn: pre + j + 1 })
      j += 1
    }
  }
  for (let k = 0; k < suf; k += 1) ops.push(eq(n - suf + k, m - suf + k))
  return ops
}

function splitOps(ops) {
  const rows = []
  let k = 0
  while (k < ops.length) {
    const op = ops[k]
    if (op.kind === "eq") {
      rows.push({ left: op, right: op })
      k += 1
      continue
    }
    const dels = []
    const adds = []
    while (k < ops.length && (ops[k].kind === "del" || ops[k].kind === "add")) {
      if (ops[k].kind === "del") dels.push(ops[k])
      else adds.push(ops[k])
      k += 1
    }
    const len = Math.max(dels.length, adds.length)
    for (let r = 0; r < len; r += 1) {
      rows.push({ left: dels[r] ?? null, right: adds[r] ?? null })
    }
  }
  return rows
}

function parseHighlighted(stored, rawLines) {
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    } catch {}
  }
  return rawLines.map(escapeHtml)
}

export default function Component({ node, context }) {
  const p = context.props(node)
  const name = node.name

  if (name === "del") {
    return (
      <del id={p.id ? String(p.id) : undefined} dir={flowDir(p.dir)} className="fx-diff-del fx-tint">
        {context.children(node)}
      </del>
    )
  }

  if (name === "ins") {
    return (
      <ins id={p.id ? String(p.id) : undefined} dir={flowDir(p.dir)} className="fx-diff-ins fx-tint">
        {context.children(node)}
      </ins>
    )
  }

  if (name !== "diff") return null

  const beforeNode = node.children?.find(ch => ch.name === "before" || ch.name === "old")
  const afterNode = node.children?.find(ch => ch.name === "after" || ch.name === "new")
  const oldRaw = sideRaw(beforeNode, context)
  const newRaw = sideRaw(afterNode, context)
  const oldHtml = parseHighlighted(context.assets[`diff-old:${node.key}`], oldRaw.lines)
  const newHtml = parseHighlighted(context.assets[`diff-new:${node.key}`], newRaw.lines)

  const ops = computeOps(oldRaw.lines, newRaw.lines)
  const mode = p.mode === "unified" ? "unified" : "split"
  const caption = p.caption ? String(p.caption) : ""
  const numbered = context.numbers.has(node.key)
  const dir = resolveDir(p.dir, caption || textOf(node), context.language)
  const rtl = dir === "rtl"
  const rawLang = String(p.lang ?? (oldRaw.lang || newRaw.lang || ""))
  const langInfo = codeLanguageInfo(rawLang)
  const maxNum = Math.max(1, oldRaw.lines.length, newRaw.lines.length)
  const numWidth = `${Math.max(2.05, String(maxNum).length * 0.62 + 0.95).toFixed(2)}em`

  const sideTitle = (side, fa, en) => {
    const rawTitle = side ? context.props(side).title : undefined
    const t = rawTitle !== undefined && rawTitle !== null ? String(rawTitle).trim() : ""
    return t || (rtl ? fa : en)
  }

  let frame
  if (mode === "unified") {
    frame = (
      <div className={`fx-diff-frame${langInfo ? " fx-diff-with-lang" : ""}`} dir="ltr">
        {langInfo && (
          <span className="fx-diff-lang">
            <Icon name={langInfo.icon} />
            <span>{langInfo.name}</span>
          </span>
        )}
        <div className="fx-diff-grid fx-diff-unified" style={{ ["--fx-diff-num-w"]: numWidth }}>
          {ops.map((op, idx) => {
            const cls = op.kind === "del" ? "fx-diff-row-del" : op.kind === "add" ? "fx-diff-row-add" : "fx-diff-row-eq"
            const sign = op.kind === "del" ? "−" : op.kind === "add" ? "+" : ""
            const html = op.ni !== null ? (newHtml[op.ni] ?? "") : (oldHtml[op.oi] ?? "")
            const edge = `${idx === 0 ? " fx-diff-first" : ""}${idx === ops.length - 1 ? " fx-diff-last" : ""}`
            return (
              <Fragment key={idx}>
                <div className={`fx-diff-num ${cls}${edge}`}>{op.on ?? ""}</div>
                <div className={`fx-diff-num ${cls}${edge}`}>{op.nn ?? ""}</div>
                <div className={`fx-diff-sign ${cls}${edge}`}>{sign}</div>
                <div className={`fx-diff-code ${cls}${edge}`}><span dangerouslySetInnerHTML={{ __html: html || " " }} /></div>
              </Fragment>
            )
          })}
        </div>
      </div>
    )
  } else {
    const beforeTitle = sideTitle(beforeNode, "نسخه قبل", "Before")
    const afterTitle = sideTitle(afterNode, "نسخه بعد", "After")
    const paired = splitOps(ops)
    const headerPair = rtl
      ? [
          { cls: "fx-diff-head-add", sign: "+", title: afterTitle },
          { cls: "fx-diff-head-del", sign: "−", title: beforeTitle },
        ]
      : [
          { cls: "fx-diff-head-del", sign: "−", title: beforeTitle },
          { cls: "fx-diff-head-add", sign: "+", title: afterTitle },
        ]

    const renderHalf = (op, isOld, divider, edge) => {
      if (!op) {
        return (
          <>
            <div className={`fx-diff-num fx-diff-empty${divider ? " fx-diff-mid" : ""}${edge}`} />
            <div className={`fx-diff-code fx-diff-empty${edge}`} />
          </>
        )
      }
      const cls = op.kind === "del" ? "fx-diff-row-del" : op.kind === "add" ? "fx-diff-row-add" : "fx-diff-row-eq"
      const num = isOld ? op.on : op.nn
      const html = isOld ? (oldHtml[op.oi] ?? "") : (newHtml[op.ni] ?? "")
      return (
        <>
          <div className={`fx-diff-num ${cls}${divider ? " fx-diff-mid" : ""}${edge}`}>{num ?? ""}</div>
          <div className={`fx-diff-code ${cls}${edge}`}><span dangerouslySetInnerHTML={{ __html: html || " " }} /></div>
        </>
      )
    }

    frame = (
      <div className="fx-diff-frame" dir="ltr">
        <div className="fx-diff-grid fx-diff-split" style={{ ["--fx-diff-num-w"]: numWidth }}>
          {headerPair.map((side, sIdx) => (
            <div key={sIdx} className={`fx-diff-head ${side.cls}${sIdx === 1 ? " fx-diff-mid" : ""}`} dir={dir}>
              <span className="fx-diff-head-sign">{side.sign}</span>
              <span>{side.title}</span>
            </div>
          ))}
          {paired.map((row, idx) => {
            const edge = `${idx === 0 ? " fx-diff-first" : ""}${idx === paired.length - 1 ? " fx-diff-last" : ""}`
            return (
              <Fragment key={idx}>
                {rtl ? renderHalf(row.right, false, false, edge) : renderHalf(row.left, true, false, edge)}
                {rtl ? renderHalf(row.left, true, true, edge) : renderHalf(row.right, false, true, edge)}
              </Fragment>
            )
          })}
        </div>
      </div>
    )
  }

  if (!caption && !numbered) {
    return (
      <div id={p.id ? String(p.id) : undefined} dir={dir} className="fx-diff">
        {frame}
      </div>
    )
  }

  const number = context.numbers.get(node.key)
  const capRtl = dir === "rtl" || (caption ? arabicScript(caption) : context.language === "fa")
  return (
    <figure id={p.id ? String(p.id) : undefined} dir={dir} className="fx-fig fx-diff-figure">
      {frame}
      <figcaption className="fx-fig-caption">
        {numbered && <span className="fx-fig-number">{capRtl ? "تغییرات" : "Diff"} {digits(number ?? 0, capRtl)}</span>}
        {numbered && caption ? ": " : ""}
        {caption}
      </figcaption>
    </figure>
  )
}
