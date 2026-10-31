import type { CSSProperties, ReactNode } from "react"
import { Check, CircleX, File, FolderOpen, Info, Lightbulb, TriangleAlert, X } from "lucide-react"
import type { Copy } from "@/content"

/** Every tag of the engine (`formatex-typ/dist/tags.json`): the wall shows them going by. */
const TAGS = "alert align badge box cetz chart chat user ai cite bibliography code compare pros cons def diff before old after new del ins dir div docheader main title l-img r-img info exercise choices answer answers fig caption lof lot lol fn footnote grid item icon img listpages include kbd letter lilaq a span anchor picheader progress ref v pagebreak steps step theorem lemma definition corollary example remark proof toc todo todos tree".split(" ")

/** A line of the source colored like the editor (the colors of the drawn editor above): tags, attributes, strings, table rows. */
function Code({ source }: { source: string }) {
  return (
    <>
      {source.split("\n").map((line, n) => (
        <div key={n} className="wl">
          <span className="wn">{n + 1}</span>
          <span>
            {line.startsWith("|")
              ? <span className="tb">{line}</span>
              : line.split(/(<\/?[\w-]+|\/?>|"[^"]*"|[\w-]+(?==))/g).map((part, i) =>
                  /^<\/?[\w-]+$|^\/?>$/.test(part) ? <span key={i} className="k">{part}</span> : /^"/.test(part) ? <span key={i} className="s">{part}</span> : /^[\w-]+$/.test(part) && line.includes(part + "=") ? <span key={i} className="a">{part}</span> : part,
                )}
          </span>
        </div>
      ))}
    </>
  )
}

function Card({ tag, className = "", children, source }: { tag: string; className?: string; children: ReactNode; source: string }) {
  return (
    <div className={`wcard ${className}`} tabIndex={0}>
      <span className="wtag mono">&lt;{tag}&gt;</span>
      <div className="wbody">{children}</div>
      <div className="wsrc mono" dir="ltr" aria-hidden="true">
        <Code source={source} />
      </div>
    </div>
  )
}

const hue = (color: string) => ({ "--h": color }) as CSSProperties

export function Wall({ t }: { t: Copy["wall"] }) {
  const c = t.cards
  const row = (offset: number) => TAGS.slice(offset).concat(TAGS.slice(0, offset))
  return (
    <section id="components" className="py-28">
      <div className="mx-auto max-w-6xl px-[clamp(16px,4vw,48px)]">
        <span className="eyebrow">{t.eyebrow}</span>
        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
          <span className="wall-count" dir="ltr">
            {t.count}
          </span>
          <h2 className="h2 !mt-0 pb-2">{t.title}</h2>
        </div>
        <p className="lead">{t.text}</p>

        <div className="wall pg">
          <Card tag="alert" className="span2" source={'<alert type="tip">\n  …\n</alert>'}>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                [c.alerts[0], "#3b82f6", Info],
                [c.alerts[1], "#14b8a6", Lightbulb],
                [c.alerts[2], "#eab308", TriangleAlert],
                [c.alerts[3], "#ef4444", CircleX],
              ].map(([label, color, Icon]) => {
                const I = Icon as typeof Info
                return (
                  <div key={color as string} className="c-alert !p-2.5 text-[13px]" style={hue(color as string)}>
                    <I className="size-[1.15em] shrink-0" />
                    {label as string}
                  </div>
                )
              })}
            </div>
          </Card>

          <Card tag="chart" source={'<chart type="pie">\n| A | 45 |\n| B | 30 |\n| C | 25 |\n</chart>'}>
            <div className="flex items-center justify-center gap-4">
              <div className="donut" aria-hidden="true" />
              <ul className="legend" dir="ltr">
                <li style={hue("#3b82f6")}>A 45</li>
                <li style={hue("#22c55e")}>B 30</li>
                <li style={hue("#a855f7")}>C 25</li>
              </ul>
            </div>
          </Card>

          <Card tag="kbd" source={"<kbd>Ctrl</kbd> + <kbd>P</kbd>\n<badge color=\"green\">new</badge>"}>
            <div className="flex flex-wrap items-center gap-1.5">
              <kbd className="c-kbd">Ctrl</kbd>+<kbd className="c-kbd">P</kbd>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="c-badge" style={hue("#22c55e")}>
                new
              </span>
              <span className="c-badge" style={hue("#a855f7")}>
                beta
              </span>
            </div>
          </Card>

          <Card tag="progress" className="span2" source={'<progress value="72" />\n<progress rating="4" />'}>
            <div className="c-progress">
              <i style={{ width: "72%" }} />
            </div>
            <div className="mt-3 flex items-center gap-2 text-[13px]">
              {c.rating}
              <span className="stars" dir="ltr">
                ★★★★<span>★</span>
              </span>
            </div>
          </Card>

          <Card tag="steps" className="tall" source={"<steps>\n  <step>…</step>\n  <step>…</step>\n</steps>"}>
            <ol className="c-steps">
              {c.steps.map((step) => (
                <li key={step}>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card tag="todo" source={"<todo>\n  …\n</todo>"}>
            <div className="c-todo">
              <b className="mono">TODO</b>
              {c.todo}
            </div>
          </Card>

          <Card tag="compare" className="span2" source={"<compare>\n  <pros>…</pros>\n  <cons>…</cons>\n</compare>"}>
            <div className="grid grid-cols-2 gap-2.5 text-[13px]">
              <div className="c-box" style={hue("#22c55e")}>
                {c.pros.map((pro) => (
                  <span key={pro} className="li">
                    <Check className="size-3.5" />
                    {pro}
                  </span>
                ))}
              </div>
              <div className="c-box" style={hue("#ef4444")}>
                <span className="li">
                  <X className="size-3.5" />
                  {c.cons}
                </span>
              </div>
            </div>
          </Card>

          <Card tag="theorem" className="span2" source={"<theorem>\n  …\n</theorem>"}>
            <div className="c-theorem">
              <b>{c.theorem.name}</b> <em>{c.theorem.text}</em>
            </div>
          </Card>

          <Card tag="chat" className="span2" source={"<chat>\n  <user>…</user>\n  <ai>…</ai>\n</chat>"}>
            <div className="c-chat">
              <p className="me">{c.chat.user}</p>
              <p className="ai">{c.chat.ai}</p>
            </div>
          </Card>

          <Card tag="diff" source={"<diff>\n<old>…</old>\n<new>…</new>\n</diff>"}>
            <div className="c-diff mono" dir="ltr">
              <span className="del">- total = a + b</span>
              <span className="ins">+ total = sum(rows)</span>
            </div>
          </Card>

          <Card tag="tree" source={"<tree>\nproject/\n  main.md\n</tree>"}>
            <div className="c-tree !p-2.5 !text-xs" dir="ltr">
              <ul>
                <li>
                  <FolderOpen className="size-[1em]" />
                  project
                  <ul>
                    <li>
                      <File className="size-[1em]" />
                      main.md
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </div>

      <div className="ticker" dir="ltr" aria-hidden="true">
        {[0, 31].map((offset, r) => (
          <div key={offset} className="lane" data-rev={r === 1}>
            <div className="track">
              {[...row(offset), ...row(offset)].map((name, i) => (
                <span key={i} className="mono">
                  &lt;{name}&gt;
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">{t.hint}</p>
    </section>
  )
}
