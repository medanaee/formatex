import React from "react"
import { resolveDir, textOf } from "formatex"

const PEOPLE_KEYS = ["author", "supervisor", "advisor"]

export default function Component({ node, context }) {
  const p = context.props(node)
  const field = key => {
    const val = p[key]
    if (val === undefined || val === null) return ""
    return String(val).trim()
  }

  const institution = field("institution")
  const faculty = field("faculty")
  const department = field("department")
  const type = field("type")
  const title = field("title")
  const subtitle = field("subtitle")
  const date = field("date")
  const logo = field("logo")
  const logoSrc = logo ? context.asset(logo) : ""
  const framed = p.frame === true || p.frame === "true"

  const dir = resolveDir(p.dir, `${title} ${institution} ${textOf(node)}`, context.language)
  const rtl = dir === "rtl"
  const labels = rtl
    ? { author: "نگارش", supervisor: "استاد راهنما", advisor: "استاد مشاور" }
    : { author: "Author", supervisor: "Supervisor", advisor: "Advisor" }

  const people = PEOPLE_KEYS.map(key => [key, field(key)]).filter(([, val]) => val !== "")
  const hasTop = !!(logoSrc || institution || faculty || department)
  const hasMain = !!(type || title || subtitle)
  const hasBody = textOf(node).trim() !== ""

  return (
    <section
      id={p.id ? String(p.id) : undefined}
      dir={dir}
      className={`fx-cover${framed ? " fx-cover-frame" : ""}`}
    >
      <div className="fx-cover-top">
        {hasTop && (
          <>
            {logoSrc && <img className="fx-cover-logo" src={logoSrc} alt="" />}
            {institution && <div className="fx-cover-institution">{institution}</div>}
            {faculty && <div className="fx-cover-faculty">{faculty}</div>}
            {department && <div className="fx-cover-department">{department}</div>}
          </>
        )}
      </div>

      <div className="fx-cover-main">
        {hasMain && (
          <>
            {type && <div className="fx-cover-type">{type}</div>}
            {title && <div className="fx-cover-title">{title}</div>}
            {subtitle && <div className="fx-cover-subtitle">{subtitle}</div>}
          </>
        )}
      </div>

      <div className="fx-cover-lower">
        {people.length > 0 && (
          <dl className="fx-cover-people">
            {people.map(([key, val]) => (
              <React.Fragment key={key}>
                <dt>{labels[key]}:</dt>
                <dd>{val}</dd>
              </React.Fragment>
            ))}
          </dl>
        )}
        {hasBody && <div className="fx-cover-body">{context.children(node)}</div>}
      </div>

      <div className="fx-cover-foot">
        {date && <div className="fx-cover-date">{date}</div>}
      </div>
    </section>
  )
}
