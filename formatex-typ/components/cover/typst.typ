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
