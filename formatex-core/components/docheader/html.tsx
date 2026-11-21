import React from "react"
import { edgeOf, flowDir, lengthCss, paintOf, presetHex, textDir, textOf } from "formatex"

function titleColorProps(color) {
  const raw = color ? String(color).trim() : ""
  if (!raw) return { className: "", style: {} }
  if (raw.startsWith("#")) return { className: "fx-heading-hex", style: { ["--fx-heading-ink" as string]: raw } }
  const hex = presetHex(raw)
  if (hex) return { className: "fx-heading-ink", style: { ["--fx-heading-ink" as string]: hex } }
  return { className: "", style: {} }
}

function renderImage(imgNode, context, extraClass = "") {
  if (!imgNode) return null
  const p = context.props(imgNode)
  const width = lengthCss(p.width)
  const height = lengthCss(p.height) ?? (width ? undefined : "4em")
  const radius = lengthCss(p.radius)
  const src = context.asset(String(p.src ?? ""))
  if (!src) return null
  return (
    <img
      className={`fx-docheader-img${extraClass ? ` ${extraClass}` : ""}`}
      src={src}
      alt={p.alt ? String(p.alt) : ""}
      style={{ width, height, borderRadius: radius }}
    />
  )
}

export default function Component({ node, context }) {
  const p = context.props(node)
  if (node.name === "main" || node.name === "info") return <div className={`fx-docheader-${node.name}`}>{context.children(node)}</div>
  if (node.name === "title") {
    const size = ["1", "2", "3"].includes(String(p.size ?? "1")) ? String(p.size ?? "1") : "1"
    const ink = titleColorProps(p.color)
    return <div className={`fx-docheader-title fx-docheader-size-${size} ${ink.className}`.trim()} style={ink.style}>{context.children(node)}</div>
  }
  if (node.name === "l-img" || node.name === "r-img") return renderImage(node, context)

  const mains = (node.children ?? []).filter(child => child.name === "main")
  const scopes = [node, ...mains]
  const collect = name => scopes.flatMap(scope => (scope.children ?? []).filter(child => child.name === name))

  const titles = []
  for (const [key, size] of [["title", "1"], ["subtitle", "2"], ["subtitle2", "3"]]) {
    if (p[key] !== undefined && p[key] !== null && String(p[key]) !== "") {
      const sample = String(p[key])
      const content = node.rich?.[key] ? node.rich[key].map(child => <React.Fragment key={child.key}>{context.render(child)}</React.Fragment>) : sample
      titles.push({ key: `attr-${key}`, size, color: "", content, sample })
    }
  }
  for (const titleNode of collect("title")) {
    const tp = context.props(titleNode)
    const size = ["1", "2", "3"].includes(String(tp.size ?? "1")) ? String(tp.size ?? "1") : "1"
    titles.push({
      key: titleNode.key,
      size,
      color: tp.color ? String(tp.color) : "",
      content: context.children(titleNode),
      sample: textOf(titleNode),
    })
  }

  const leftImages = collect("l-img")
  const rightImages = collect("r-img")
  const leftImg = leftImages[leftImages.length - 1] ?? null
  const rightImg = rightImages[rightImages.length - 1] ?? null
  const infos = collect("info")

  const both = p.color ? String(p.color) : ""
  const borderGiven = p["border-color"] ? String(p["border-color"]) : both
  const fillGiven = p["fill-color"] ? String(p["fill-color"]) : both
  const rawSides = p.border === true || p.border === "true" ? "lrtb" : p.border === false || p.border === "false" ? "" : String(p.border ?? "")
  const hasL = rawSides.includes("l")
  const hasR = rawSides.includes("r")
  const hasT = rawSides.includes("t")
  const hasB = rawSides.includes("b")
  const framedBorder = hasL || hasR || hasT || hasB
  const framedFill = p.fill === true || p.fill === "true"
  const framed = framedBorder || framedFill

  const fillPaint = framedFill && fillGiven ? paintOf(fillGiven) : { className: "", style: {} }
  const borderEdge = framedBorder && borderGiven ? edgeOf(borderGiven) : { className: "", style: {} }
  const r = lengthCss(p.radius) ?? "var(--fx-radius-box)"
  const cornerStyle = framedBorder
    ? {
        borderTopLeftRadius: hasT && hasL ? r : "0",
        borderTopRightRadius: hasT && hasR ? r : "0",
        borderBottomLeftRadius: hasB && hasL ? r : "0",
        borderBottomRightRadius: hasB && hasR ? r : "0",
      }
    : framedFill
      ? { borderRadius: r }
      : { borderRadius: "0" }

  const frameStyle = {
    ...fillPaint.style,
    ...borderEdge.style,
    ...cornerStyle,
    borderLeftWidth: hasL ? "0.08em" : "0",
    borderRightWidth: hasR ? "0.08em" : "0",
    borderTopWidth: hasT ? "0.08em" : "0",
    borderBottomWidth: hasB ? "0.08em" : "0",
    padding: framed ? ((node.props?.padding !== undefined || node.props?.["html.padding"] !== undefined ? lengthCss(p.padding) : undefined) ?? "0.65em 0.95em") : "0",
  }

  const headerDir = flowDir(p.dir)
  const titleBlock = (
    <div className="fx-docheader-titles">
      {titles.map(item => {
        const ink = titleColorProps(item.color)
        const dir = textDir(item.sample) ?? headerDir
        return (
          <div key={item.key} dir={dir} className={`fx-docheader-title fx-docheader-size-${item.size} ${ink.className}`.trim()} style={ink.style}>
            {item.content}
          </div>
        )
      })}
    </div>
  )

  return (
    <header
      id={p.id ? String(p.id) : undefined}
      dir={headerDir}
      className={["fx-docheader", fillPaint.className, borderEdge.className, framedFill ? "fx-docheader-filled" : ""].filter(Boolean).join(" ")}
      style={frameStyle}
    >
      {leftImg || rightImg ? (
        <div className="fx-docheader-row" dir="ltr">
          <div className="fx-docheader-side fx-docheader-side-l">
            {renderImage(leftImg, context)}
            {rightImg && <div className="fx-docheader-ghost" aria-hidden="true">{renderImage(rightImg, context)}</div>}
          </div>
          {titleBlock}
          <div className="fx-docheader-side fx-docheader-side-r">
            {renderImage(rightImg, context)}
            {leftImg && <div className="fx-docheader-ghost" aria-hidden="true">{renderImage(leftImg, context)}</div>}
          </div>
        </div>
      ) : titleBlock}
      {infos.map(info => (
        <div key={info.key} className="fx-docheader-info">
          {context.children(info)}
        </div>
      ))}
    </header>
  )
}
