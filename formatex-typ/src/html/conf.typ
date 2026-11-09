// `html-conf`, the document rule of the HTML output (the PDF's is `conf` in src/conf.typ): the language, the stylesheet, and the few
// places where Typst's own HTML needs a hand (code blocks, tables). The look is CSS (src/html/style.typ); the direction of every
// paragraph comes from its first letter in the browser (`unicode-bidi: plaintext`), as `auto-dir` does in the PDF.
#import "/src/core.typ": *
#import "/src/lib/code-fallback.typ": fallback-lines, needs-fallback
#import "/src/lib/captioned.typ": captioned, caption-flag
#import "/src/html/style.typ": html-style, html-font-families, copy-script
#import "/src/html/viewer.typ": viewer-parts, html-option

// The same state as src/conf.typ's: `table-attrs` writes it, the show rule of a table reads it
#let table-options = state("table-options", (:))
#let table-defaults = config.at("table", default: (:))

/// `components-css`: the CSS of the components, one string (see `html-css` of components/_registry.typ)
#let html-conf(doc, components-css) = {
  set text(font: (latin-font, persian-font), size: 11pt, fill: theme.fg, lang: html-lang, dir: if doc-dir == "rtl" { rtl } else if doc-dir == "ltr" { ltr } else { auto })
  set heading(numbering: if heading-numbered { heading-numbering } else { none })
  set raw(theme: if theme.dark { "/code-dark.tmTheme" } else { auto })

  // A code block: the page draws the frame, the language label and (with a script) the copy button around Typst's own `<pre>`
  show raw.where(block: true): it => {
    let lang = code-language(it.lang)
    let attrs = (class: "fx-code") + if lang != none { ("data-lang": lang.name) } else { (:) }
    // A language Typst cannot color still gets a rough coloring
    if needs-fallback(it) {
      let lines = it.lines
      while lines.len() > 1 and lines.last().text.trim() == "" { lines = lines.slice(0, -1) }
      let colored = fallback-lines(lines.map(l => l.text), theme.dark)
      return html.elem("div", attrs: attrs, html.elem("pre", html.elem("code", colored.join(linebreak()))))
    }
    html.elem("div", attrs: attrs, it)
  }

  // A table scrolls on its own when it is wider than the window. The options of a `{width=full align=left caption="..." #id}` line above it
  // (the state `table-attrs` writes) are read here: the caption, the number and the id (so `<ref>` finds it), the width and the side it sits on.
  show table: it => context {
    let opts = table-options.get()
    let side = opts.at("align", default: inherited-align(table-defaults.at("align", default: "center")))
    let margin = if side in ("left", "start") { "margin-inline: 0 auto" } else if side in ("right", "end") { "margin-inline: auto 0" } else { none }
    let wide = opts.at("width", default: table-defaults.at("width", default: "auto")) == "full"
    let framed = html.elem("div", attrs: (class: "fx-table" + if wide { " fx-table-full" } else { "" }, dir: "auto", ..if margin != none { (style: margin) }), it)
    table-options.update((:))
    captioned(
      "table", table, "جدول", "Table", framed,
      caption: opts.at("caption", default: none), id: opts.at("id", default: none),
      numbering: caption-flag(opts, "numbering"), position: opts.at("caption-position", default: none),
      listed: caption-flag(opts, "lot") != false,
    )
  }
  // A list takes its direction from its first letter, so its markers and indent go to the side its text starts on
  show list: it => html.elem("div", attrs: (dir: "auto"), it)
  // A numbered list writes its own numbers: the browser cannot count in letters (abjad, alefba) or words, nor add a prefix and a suffix
  show enum: it => {
    let n = if it.start == auto { 1 } else { it.start }
    let items = ()
    for item in it.children {
      let given = item.fields().at("number", default: auto)
      if given != auto and given != none { n = given }
      items.push(html.elem("li", attrs: (class: "fx-li"), {
        // The numbers follow the direction of the item's own text, as in the PDF: ۱. before a Persian item, 1. before an English one
        html.elem("span", attrs: (class: "fx-num"), context {
          let d = content-dir(item.body)
          set text(dir: d)
          std.numbering(if type(it.numbering) == str and d == rtl { it.numbering.replace("1", "۱") } else { it.numbering }, n)
        })
        html.elem("div", attrs: (class: "fx-li-body"), item.body)
      }))
      n += 1
    }
    html.elem("div", attrs: (dir: "auto"), html.elem("ol", attrs: (class: "fx-ol"), items.join()))
  }
  show terms: it => html.elem("div", attrs: (dir: "auto"), it)
  show quote.where(block: true): it => html.elem("div", attrs: (dir: "auto"), it)

  html-style(components-css)
  html.elem("meta", attrs: (name: "fx-fonts", content: html-font-families.join("|")))
  html.elem("main", attrs: (class: "fx-doc"), doc)
  if html-option("copy-code") { html.elem("script", copy-script) }
  viewer-parts()
}
