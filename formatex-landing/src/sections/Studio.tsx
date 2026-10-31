import { useState, type ReactNode } from "react"
import { Check, FileDown, FileText, Folder, FolderOpen, Pencil } from "lucide-react"
import type { Copy } from "@/content"

/** A drawn copy of the app's editor: the files, the Markdown with its tags, and the page it sets. Lines and blocks find each other. */
export function Studio({ t }: { t: Copy["studio"] }) {
  const [hot, setHot] = useState<number | null>(null)
  const [tab, setTab] = useState<"edit" | "preview">("edit")
  const { doc } = t
  const values = doc.rows.map(([, value]) => Number(value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))))
  const top = Math.max(...values)

  // Each block is a few source lines with a number; the page repeats the numbers, so the two sides can light each other up.
  const line = (block: number | null, n: number, children: ReactNode) => (
    <div key={n} className="st-line" data-hot={block !== null && hot === block} onPointerEnter={() => block !== null && setHot(block)} onPointerLeave={() => setHot(null)}>
      <span className="st-n">{n}</span>
      <span className="st-code" dir="auto">
        {children}
      </span>
    </div>
  )
  const tag = (name: string, attrs = "") => (
    <>
      <span className="k">&lt;{name}</span>
      {attrs && <> <span className="a">{attrs.split("=")[0]}</span>=<span className="s">{attrs.split("=").slice(1).join("=")}</span></>}
      <span className="k">&gt;</span>
    </>
  )
  const close = (name: string) => <span className="k">&lt;/{name}&gt;</span>

  const lines: ReactNode[] = [
    line(0, 1, <><span className="h"># </span>{doc.title}</>),
    line(null, 2, <>&nbsp;</>),
    line(1, 3, doc.body),
    line(null, 4, <>&nbsp;</>),
    line(2, 5, tag("alert", 'type="info"')),
    line(2, 6, <>{"  "}{doc.alert}</>),
    line(2, 7, close("alert")),
    line(null, 8, <>&nbsp;</>),
    line(3, 9, <><span className="k">&lt;chart</span> <span className="a">type</span>=<span className="s">"bar"</span> <span className="a">caption</span>=<span className="s">"{doc.caption}"</span><span className="k">&gt;</span></>),
    line(3, 10, <span className="tb">| {doc.rows[0][0]} | {doc.rows[0][1]} |</span>),
    line(3, 11, <span className="tb">| {doc.rows[1][0]} | {doc.rows[1][1]} |</span>),
    line(3, 12, <span className="tb">| {doc.rows[2][0]} | {doc.rows[2][1]} |</span>),
    line(3, 13, close("chart")),
  ]

  const block = (index: number, children: ReactNode) => (
    <div className="st-block" data-hot={hot === index} onPointerEnter={() => setHot(index)} onPointerLeave={() => setHot(null)}>
      {children}
    </div>
  )

  return (
    <section id="how" className="mx-auto max-w-[1320px] px-[clamp(30px,4vw,48px)] py-28">
      <span className="eyebrow">{t.eyebrow}</span>
      <h2 className="h2">
        {t.title[0]}
        <br />
        <span className="text-(--accent)">{t.title[1]}</span>
      </h2>
      <p className="lead">{t.text}</p>

      <div className="studio" data-tab={tab}>
        <div className="st-title">
          <img src="/icon.png" width={18} height={18} alt="" draggable={false} />
          <span className="st-name">
            {doc.title}
            <Pencil className="size-3 opacity-50" />
          </span>
          <span className="flex-1" />
          <div className="st-seg" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "edit"} onClick={() => setTab("edit")}>
              {t.edit}
            </button>
            <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>
              {t.preview}
            </button>
          </div>
          <span className="st-export">
            <FileDown className="size-3.5" />
            {t.export}
          </span>
        </div>

        <div className="st-body">
          <aside className="st-files">
            <div className="st-head">{t.files}</div>
            <ul dir="ltr">
              <li>
                <FolderOpen className="size-3.5" /> project
              </li>
              <li className="on sub">
                <FileText className="size-3.5" /> main.md
              </li>
              <li className="sub">
                <FileText className="size-3.5" /> config.toml
              </li>
              <li className="sub">
                <Folder className="size-3.5" /> img
              </li>
              <li className="sub">
                <FileText className="size-3.5" /> refs.bib
              </li>
            </ul>
          </aside>

          <div className="st-editor" dir="ltr">
            {lines}
          </div>

          <div className="st-preview">
            <div className="st-page">
              {block(0, <h3>{doc.title}</h3>)}
              {block(1, <p>{doc.body}</p>)}
              {block(
                2,
                <div className="c-alert" style={{ "--h": "#3b82f6" } as React.CSSProperties}>
                  <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  <span>{doc.alert}</span>
                </div>,
              )}
              {block(
                3,
                <figure className="c-chart">
                  <div className="plot">
                    {values.map((value, i) => (
                      <div key={doc.rows[i][0]} className="col">
                        <span className="val">{doc.rows[i][1]}</span>
                        <i style={{ height: `${(value / top) * 100}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="labels">
                    {doc.rows.map(([label]) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                  <figcaption>{doc.caption}</figcaption>
                </figure>,
              )}
            </div>
          </div>
        </div>

        <div className="st-status">
          <Check className="size-3.5 text-(--green)" />
          {t.compiled}
          <span className="flex-1" />
          <span dir="ltr">Ln 5, Col 1</span>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">{t.hover}</p>
    </section>
  )
}
