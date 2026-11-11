// `html-conf`, the document rule of the HTML output (the PDF's is `conf` in src/conf.typ): the language, the stylesheet, and the few
// places where Typst's own HTML needs a hand (code blocks, tables). The look is CSS (src/html/style.typ); the direction of every
// paragraph comes from its first letter in the browser (`unicode-bidi: plaintext`), as `auto-dir` does in the PDF.
#import "/src/core.typ": *
#import "/src/lib/code-fallback.typ": fallback-lines, needs-fallback
#import "/src/lib/captioned.typ": captioned, caption-flag
#import "/src/html/style.typ": html-style, html-font-families, copy-script
#import "/src/html/viewer.typ": viewer-parts, html-option
#import "/src/html/katex.typ": katex-boot-script
#import "/src/lib/lists.typ": list-style
#import "/src/lib/basics.typ": plain-text
#import "/src/html/kit.typ": css-len
#let html-list-depth = state("html-list-depth", 0)

// The same state as src/conf.typ's: `table-attrs` writes it, the show rule of a table reads it
#let table-options = state("table-options", (:))
#let table-defaults = config.at("table", default: (:))

/// `components-css`: the CSS of the components, one string (see `html-css` of components/_registry.typ)
#let html-conf(doc, components-css) = {
  set text(font: (latin-font, persian-font), size: 11pt, fill: theme.fg, lang: html-lang, dir: if doc-dir == "rtl" { rtl } else if doc-dir == "ltr" { ltr } else { auto })
  set heading(numbering: if heading-numbered { heading-numbering } else { none })
  set raw(theme: if theme.dark { "/code-dark.tmTheme" } else { auto })
  // Apply the same global/per-list number and marker settings without PDF guide drawing.
  show: list-style.with((guides: "none"))

  show heading: it => context {
    let o = heading-options.get()
    let underline = o.at("underline", default: heading-underline)
    let fill = o.at("fill", default: heading-fill)
    let hue = if "color" in o { resolve-heading-color(o.color) } else { heading-color }
    let styled = underline or fill
    // `max-level` only limits the [heading] look; a heading that sets fill or underline itself gets it.
    if styled and not ("underline" in o or "fill" in o) {
      let all = query(heading.where(outlined: true))
      let numbered = all.filter(h => h.numbering != none)
      if numbered.len() > 0 { all = numbered }
      let top = if all.len() == 0 { 1 } else { calc.min(..all.map(h => h.level)) }
      if it.level - top + 1 > heading-max-level { styled = false }
    }
    if not styled { fill = false; underline = false }

    let custom-color = "color" in o or hue != heading-color
    let hue-hex = rgb(hue).to-hex()
    let c-var = if custom-color { hue-hex } else { "var(--heading)" }

    let styles = ()
    if custom-color { styles.push("color: " + c-var) }
    if fill {
      let fill-pct = if theme.dark { "9%" } else { "10%" }
      styles.push("background: color-mix(in srgb, " + c-var + " " + fill-pct + ", var(--bg))")
      styles.push("padding: .45em .85em")
    } else if underline {
      styles.push("padding-bottom: .4em")
    }
    if underline {
      styles.push("border-bottom: 1px solid " + c-var)
    }
    if styled {
      let corners = if underline { "var(--r-heading) var(--r-heading) 0 0" } else { "var(--r-heading)" }
      styles.push("border-radius: " + corners)
    }

    let d = content-dir(it.body)
    let rtl-digits = if d != none { d == rtl } else { doc-dir == "rtl" or (doc-dir == "auto" and html-lang == "fa") }

    let num = if it.numbering != none {
      let nums = counter(heading).at(it.location())
      set text(dir: if rtl-digits { rtl } else { ltr })
      if type(it.numbering) == function {
        (it.numbering)(..nums)
      } else {
        heading-number(nums, rtl-digits)
      }
    } else { none }

    let tag = "h" + str(calc.min(6, calc.max(1, it.level)))
    let attrs = (:)
    let id = o.at("id", default: if it.has("label") and it.label != none { str(it.label) } else { none })
    if id != none { attrs.insert("id", id) }
    if d != none { attrs.insert("dir", if d == rtl { "rtl" } else { "ltr" }) }
    if styles.len() > 0 { attrs.insert("style", styles.join("; ")) }

    let body = if num != none [#num~#it.body] else { it.body }
    html.elem(tag, attrs: attrs, body)
  }


  // A code block: the page draws the frame, the header with language label and copy button, then the `<pre>`
  show raw.where(block: true): it => context {
    let lang = code-language(it.lang)
    let lang-name = if lang != none { lang.name } else if it.lang != none { it.lang } else { "" }
    let opts = state("code-options", (:)).get()
    let start = opts.at("start", default: 1)
    let highlighted = opts.at("highlight", default: ())
    let lines = it.lines
    while lines.len() > 1 and lines.last().text.trim() == "" { lines = lines.slice(0, -1) }
    let rendered = if needs-fallback(it) { fallback-lines(lines.map(l => l.text), theme.dark) } else { lines.map(l => l.body) }
    html.elem("div", attrs: (class: "fx-code"), {
      html.elem("div", attrs: (class: "fx-code-header"), html.elem("span", attrs: (class: "fx-code-lang"), lang-name))
      html.elem("pre", html.elem("code", {
        for (i, line) in rendered.enumerate() {
          html.elem("span", attrs: (class: "fx-code-line" + if start + i in highlighted { " fx-code-highlight" } else { "" }, "data-line": str(start + i)), line)
          if i < rendered.len() - 1 { linebreak() }
        }
      }))
    })
  }

  // A table scrolls on its own when it is wider than the window. The options of a `{width=full align=left caption="..." #id}` line above it
  // (the state `table-attrs` writes) are read here: the caption, the number and the id (so `<ref>` finds it), the width and the side it sits on.
  show table: it => context {
    let opts = table-options.get()
    let side = opts.at("align", default: inherited-align(table-defaults.at("align", default: "center")))
    let margin = if side in ("left", "start") { "margin-inline: 0 auto" } else if side in ("right", "end") { "margin-inline: auto 0" } else { none }
    let wide = opts.at("width", default: table-defaults.at("width", default: "auto")) == "full"
    let framed = html.elem("div", attrs: (class: "fx-table" + if wide { " fx-table-full" } else { "" }, dir: doc-dir, ..if margin != none { (style: margin) }), it)
    table-options.update((:))
    captioned(
      "table", table, "جدول", "Table", framed,
      caption: opts.at("caption", default: none), id: opts.at("id", default: none),
      numbering: caption-flag(opts, "numbering"), position: opts.at("caption-position", default: none),
      listed: caption-flag(opts, "lot") != false,
    )
  }
  // A list takes its direction from its first letter, so its markers and indent go to the side its text starts on
  show list: it => context {
    let depth = html-list-depth.get()
    let markers = it.marker
    let marker = if type(markers) == array { markers.at(calc.rem(depth, markers.len())) } else if type(markers) == function { markers(depth) } else { markers }
    html-list-depth.update(depth + 1)
    html.elem("ul", attrs: (class: "fx-ul", dir: doc-dir, style: "margin-inline-start: " + css-len(it.indent)), it.children.map(item => html.elem("li", attrs: (class: "fx-li"), {
      html.elem("span", attrs: (class: "fx-num"), plain-text(marker))
      html.elem("div", attrs: (class: "fx-li-body"), item.body)
    })).join())
    html-list-depth.update(depth)
  }
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
          let num = std.numbering(if type(it.numbering) == str and d == rtl { it.numbering.replace("1", "۱") } else { it.numbering }, n)
          if d == rtl [#num#sym.zws#"\u{200F}"] else [#num]
        })
        html.elem("div", attrs: (class: "fx-li-body"), item.body)
      }))
      n += 1
    }
    html.elem("div", attrs: (dir: doc-dir), html.elem("ol", attrs: (class: "fx-ol"), items.join()))
  }
  show terms: it => html.elem("div", attrs: (dir: doc-dir), it)
  show quote.where(block: true): it => html.elem("div", attrs: (dir: doc-dir), it)

  html-style(components-css)
  html.elem("meta", attrs: (name: "fx-fonts", content: html-font-families.join("|")))
  html.elem("main", attrs: (class: "fx-doc", dir: doc-dir), doc)
  viewer-parts()
  if html-option("copy-code") { html.elem("script", copy-script) }
  context {
    if html-math == "katex" and query(metadata.where(value: "fx-katex")).len() > 0 {
      html.elem("script", katex-boot-script)
    }
  }
}
