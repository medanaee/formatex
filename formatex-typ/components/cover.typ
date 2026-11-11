#import "/src/kit.typ": *
#import "/src/page.typ": page-size
#let cover-page(attrs, body) = context {
  let c = attrs
  let field(key) = {
    let v = c.at(key, default: "")
    if v == "" or v == () { none } else { str(v) }
  }
  let title = field("title")
  let dir = resolve-dir(c.at("dir", default: "auto"), c.at("title", default: "") + " " + c.at("institution", default: "") + body)
  let labels = if dir == rtl {
    (author: "نگارش", supervisor: "استاد راهنما", advisor: "استاد مشاور")
  } else {
    (author: "Author", supervisor: "Supervisor", advisor: "Advisor")
  }

  let people = ()
  for key in ("author", "supervisor", "advisor") {
    let v = field(key)
    if v != none {
      people.push(text(fill: theme.muted, labels.at(key) + ":"))
      people.push(text(weight: "bold", v))
    }
  }

  let logo = c.at("logo", default: none)
  let cover-content = {
    set text(dir: dir)
    set align(center)
    if logo != none and logo != "" {
      image(root-path(logo), height: 3cm)
      v(0.8em)
    }
    if field("institution") != none { text(size: 1.4em, weight: "bold", fill: theme.heading, field("institution")) }
    if field("faculty") != none { linebreak(); text(size: 1.15em, field("faculty")) }
    if field("department") != none { linebreak(); text(size: 1.05em, fill: theme.muted, field("department")) }
    v(1fr)
    if field("type") != none {
      text(size: 1.15em, fill: theme.muted, field("type"))
      v(0.8em)
    }
    if title != none { text(size: 2.2em, weight: "bold", fill: theme.heading, title) }
    if field("subtitle") != none {
      v(0.4em)
      text(size: 1.3em, fill: theme.muted, field("subtitle"))
    }
    v(1fr)
    if people.len() > 0 {
      grid(
        columns: 2,
        column-gutter: 1em,
        row-gutter: 0.9em,
        align: (end, start),
        ..people,
      )
    }
    if plain-text(body).trim() != "" { v(1em); block(width: 100%, body) }
    v(1fr)
    if field("date") != none { text(size: 1.1em, field("date")) }
  }

  // The reset happens on the cover itself so the next page's header already sees page 1.
  page(numbering: none, header: none, footer: none, columns: 1, {
    counter(page).update(0)
    let framed = c.at("frame", default: "false") == "true"
    block(width: 100%, height: 100%, breakable: false,
      stroke: if framed { 1.5pt * zoom + theme.rule }, radius: feel.frame,
      inset: if framed { 1.2cm } else { 0pt },
      layout(region => {
        let natural = measure(block(width: region.width, cover-content))
        if natural.height > region.height {
          scale(region.height / natural.height * 100%, origin: top + center, reflow: true, block(width: region.width, cover-content))
        } else { block(width: region.width, height: region.height, cover-content) }
      }),
    )
  })
}
#let cover-tags = (
  cover: (attrs, body) => cover-page(attrs, body),
)
#let cover-html = (
  cover: (attrs, body) => context {
    let d = resolve-dir(attrs.at("dir", default: "auto"), attrs.at("title", default: "") + " " + attrs.at("institution", default: "") + body)
    let labels = if d == rtl { (author: "نگارش", supervisor: "استاد راهنما", advisor: "استاد مشاور") } else { (author: "Author", supervisor: "Supervisor", advisor: "Advisor") }
    html.elem("section", attrs: (class: "fx-cover" + if attrs.at("frame", default: "false") == "true" { " fx-cover-framed" } else { "" }, dir: if d == rtl { "rtl" } else { "ltr" }, style: "height: " + str(calc.round(page-size.height / 1mm, digits: 3)) + "mm"), {
      html.elem("div", attrs: (class: "fx-cover-inner"), {
        html.elem("div", attrs: (class: "fx-cover-institution-group"), {
          if attrs.at("logo", default: "") != "" { image(root-path(attrs.logo), height: 3cm) }
          for k in ("institution", "faculty", "department") { if attrs.at(k, default: "") != "" { html.elem("div", attrs: (class: "fx-cover-" + k), attrs.at(k)) } }
        })
        html.elem("div", attrs: (class: "fx-cover-titles"), {
          for k in ("type", "title", "subtitle") { if attrs.at(k, default: "") != "" { html.elem("div", attrs: (class: "fx-cover-" + k), attrs.at(k)) } }
        })
        html.elem("div", attrs: (class: "fx-cover-details"), {
          html.elem("dl", attrs: (class: "fx-cover-people"), {
            for k in labels.keys() { if attrs.at(k, default: "") != "" { html.elem("dt", labels.at(k) + ":"); html.elem("dd", attrs.at(k)) } }
          })
          body
        })
        html.elem("div", attrs: (class: "fx-cover-date"), attrs.at("date", default: ""))
      })
    })
  },
)
#let cover-css = `````css
.fx-cover { box-sizing: border-box; width: 100%; overflow: auto; margin-block: .8em; padding: clamp(16px, 5%, 42px); text-align: center; background: var(--bg); color: var(--fg); break-before: page; break-after: page; }
.fx-cover-framed { border: 1px solid var(--rule); border-radius: var(--r-frame); }
.fx-cover-inner { min-height: 100%; display: flex; flex-direction: column; justify-content: space-between; gap: 1.5em; }
.fx-cover-inner > * { flex-shrink: 0; }
.fx-cover-institution { font-size: 1.4em; font-weight: bold; color: var(--heading); }
.fx-cover-faculty { font-size: 1.15em; } .fx-cover-department, .fx-cover-type, .fx-cover-subtitle { color: var(--muted); }
.fx-cover-title { color: var(--heading); font-size: 2.2em; font-weight: bold; overflow-wrap: anywhere; }
.fx-cover-subtitle { font-size: 1.2em; margin-block-start: .4em; }
.fx-cover-people { display: grid; grid-template-columns: auto auto; gap: .5em .8em; width: fit-content; max-width: 100%; margin-inline: auto; }
.fx-cover-people dt { color: var(--muted); text-align: end; } .fx-cover-people dd { margin: 0; font-weight: bold; text-align: start; overflow-wrap: anywhere; }
.fx-cover img { max-height: 3cm; max-width: 100%; object-fit: contain; margin-inline: auto; } .fx-doc .fx-cover p { text-align: center; }
`````.text
#let cover-schema = (
  cover: (kind: "block", description: (en: "full-page cover", fa: "جلد تمام‌صفحه"), attrs: (
    "logo": (type: "path", doc: (en: "logo", fa: "logo")),
    "institution": (type: "string", doc: (en: "institution", fa: "institution")),
    "faculty": (type: "string", doc: (en: "faculty", fa: "faculty")),
    "department": (type: "string", doc: (en: "department", fa: "department")),
    "type": (type: "string", doc: (en: "type", fa: "type")),
    "title": (type: "string", doc: (en: "title", fa: "title")),
    "subtitle": (type: "string", doc: (en: "subtitle", fa: "subtitle")),
    "author": (type: "string", doc: (en: "author", fa: "author")),
    "supervisor": (type: "string", doc: (en: "supervisor", fa: "supervisor")),
    "advisor": (type: "string", doc: (en: "advisor", fa: "advisor")),
    "date": (type: "string", doc: (en: "date", fa: "date")),
    frame: (type: "bool", default: "false", doc: (en: "Draw a frame.", fa: "نمایش قاب.")),
    dir: (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Text direction.", fa: "جهت متن.")),
  )),
)
#let cover-docs = (
  en: (about: "A standalone cover at this position. PDF uses one unnumbered page without header/footer; the following page starts at 1. HTML reserves the configured page height and scrolls overflowing details. Attributes are strings; the optional body is Markdown. Replace the removed cover configuration with this tag.",),
  fa: (about: "جلد مستقل در محل تگ. در PDF یک صفحهٔ بدون شماره و سرصفحه و پاصفحه می‌گیرد و صفحهٔ بعد از ۱ شروع می‌شود. در HTML ارتفاع اندازهٔ صفحه را می‌گیرد و اطلاعات بلند داخلش اسکرول می‌خورند. ویژگی‌ها رشته و بدنهٔ اختیاری Markdown است. این تگ جای تنظیم قدیمی جلد را می‌گیرد.",),
  example: (en: "<cover title=\"Research report\" author=\"A. Writer\"></cover>", fa: "<cover title=\"گزارش پژوهش\" author=\"نام نویسنده\"></cover>"),
)
