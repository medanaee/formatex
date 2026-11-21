import React from "react"
import { Icon, hueOf, presetHex, resolveDir, textOf } from "formatex"

export default function Component({ node, context }) {
  const p = context.props(node)
  const isSide = node.name === "pros" || node.name === "cons"
  const sides = isSide ? [node] : (node.children ?? []).filter(child => child.name === "pros" || child.name === "cons")
  const sample = sides.map(side => textOf(side)).join(" ")
  const dir = resolveDir(p.dir, sample, context.language)
  const rtl = dir === "rtl"

  const renderBody = (side, pro) => {
    return (side.children ?? []).map(child => {
      if (child.type === "list" && !child.ordered) {
        return (
          <ul key={child.key} className="fx-compare-list">
            {(child.children ?? []).map(item => (
              <li key={item.key}>
                <span className="fx-compare-mark" aria-hidden="true">
                  <span className="fx-compare-mark-plain"><Icon name={pro ? "check" : "xmark"} /></span>
                  <span className="fx-compare-mark-circle"><Icon name={pro ? "circle-check" : "circle-xmark"} /></span>
                </span>
                <div className="fx-compare-item">{context.children(item)}</div>
              </li>
            ))}
          </ul>
        )
      }
      return <React.Fragment key={child.key}>{context.render(child)}</React.Fragment>
    })
  }

  const renderSide = side => {
    const pro = side.name === "pros"
    const sp = context.props(side)
    const fallback = pro ? presetHex("green")! : presetHex("red")!
    const tint = hueOf(sp.color, fallback)
    const title = sp.title ? String(sp.title) : pro ? (rtl ? "مزایا" : "Pros") : (rtl ? "معایب" : "Cons")
    return (
      <section key={side.key} className={`fx-compare-side fx-compare-${pro ? "pros" : "cons"} ${tint.className}`} style={tint.style}>
        <header className="fx-compare-head">
          <Icon name={pro ? "thumbs-up" : "thumbs-down"} />
          <span>{title}</span>
        </header>
        <div className="fx-compare-body">{renderBody(side, pro)}</div>
      </section>
    )
  }

  if (isSide) return <div id={p.id ? String(p.id) : undefined} dir={dir} className="fx-compare fx-compare-single">{renderSide(node)}</div>

  return (
    <div id={p.id ? String(p.id) : undefined} dir={dir} className="fx-compare" style={{ ["--fx-compare-cols" as string]: String(Math.max(1, sides.length)) }}>
      {sides.map(renderSide)}
    </div>
  )
}
