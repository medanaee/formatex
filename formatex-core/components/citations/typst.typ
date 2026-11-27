#import "/src/kit.typ": *

#let citations-tags = (
    cite: (attrs, body) => {
      let page = attrs.at("page", default: none)
      let form = attrs.at("form", default: "normal")
      attrs.key.split(",").map(k => cite(
        label(k.trim()),
        form: form,
        supplement: if page != none [#page],
      )).join()
    },
    bibliography: (attrs, body) => {
      // Settings come from the document's front matter (`bibliography:`); the tag's attributes win.
      let cfg = front-matter.at("bibliography", default: none)
      if cfg == none { cfg = (:) }
      assert(type(cfg) == dictionary, message: setting-prefix("bibliography") + "`bibliography` in the front matter must be a table (file, style, title, dir), got " + repr(cfg))
      let setting(key, default) = {
        let v = attrs.at(key, default: cfg.at(key, default: none))
        if v == none { default } else { v }
      }
      let d = setting("dir", doc-dir)
      // The title is a heading, so it gets its own direction from the heading rule.
      set text(dir: if d == "rtl" { rtl } else { ltr })
      // "auto": each entry follows its own language (Persian entries read right-to-left).
      show grid.cell: c => {
        let cd = if d == "auto" { text-dir(c.body) } else { none }
        if cd == none { c } else { set text(dir: cd); c }
      }
      let bib-file = if "file" in attrs {
        root-path(attrs.file, attrs: attrs)
      } else if cfg.at("file", default: none) != none {
        root-path(cfg.at("file"), from: source-path)
      } else {
        "/examples/references.bib"
      }
      bibliography(
        bib-file,
        style: setting("style", "ieee"),
        title: setting("title", "منابع"),
      )
    },
)

#let citations-rules(doc) = {
  // Brackets stay plain, and the line sits above their bottom hooks;
  // otherwise "[1]" reads as a box.
  show cite: it => {
    show regex("[^\[\]]+"): reference-style.with(offset: 1.2pt * zoom)
    it
  }
  doc
}

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
