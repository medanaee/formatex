#import "/src/prelude.typ": *
#import "/src/lib/refs.typ": *

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
      assert(type(cfg) == dictionary, message: "`bibliography` in the front matter must be a table (file, style, title, dir), got " + repr(cfg))
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
      bibliography(
        root-path(setting("file", "examples/references.bib")),
        style: setting("style", "ieee"),
        title: setting("title", "منابع"),
      )
    },
)

#let citations-schema = (
  "cite": (
    kind: "inline",
    description: (en: "citations", fa: "استناد"),
    attrs: (
      "key": (type: "string", required: true, doc: (en: "BibTeX key(s), comma-separated", fa: "کلید(های) BibTeX با جداکنندهٔ ویرگول")),
      "page": (type: "string", doc: (en: "Page supplement inside the brackets", fa: "توضیح صفحه داخل کروشه")),
      "form": (type: "enum", values: ("normal", "prose", "author", "year", "full"), default: "normal", doc: (en: "`normal`, `prose`, `author`, `year` or `full`", fa: "`normal`، `prose`، `author`، `year` یا `full`")),
    ),
  ),
  "bibliography": (
    kind: "block",
    description: (en: "citations", fa: "استناد"),
    attrs: (
      "file": (type: "path", doc: (en: "BibTeX file (overrides the front matter)", fa: "فایل BibTeX (جایگزین front matter)")),
      "style": (type: "string", doc: (en: "Citation style, e.g. `ieee`", fa: "سبک ارجاع، مثلاً `ieee`")),
      "title": (type: "string", doc: (en: "Title of the bibliography", fa: "عنوان فهرست منابع")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Direction", fa: "جهت")),
    ),
  ),
)




// rules-order: 30
#let citations-rules(doc) = {
  // Brackets stay plain, and the line sits above their bottom hooks;
  // otherwise "[1]" reads as a box.
  show cite: it => {
    show regex("[^\[\]]+"): reference-style.with(offset: 1.2pt * zoom)
    it
  }
  doc
}
