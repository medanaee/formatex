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

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let citations-docs = (
  en: (
    about: `````md
Citations and the bibliography. `<cite key="...">` cites entries of a BibTeX file; `<bibliography>` lists the cited ones. Put `<bibliography>` once, at the end; a document with citations must have one. The `.bib` file is named in the front matter (`bibliography: file:`).

- `<cite key="a">` or several keys `key="a, b"`; `page="p. 12"` adds a supplement; `form` is `normal` (default), `prose`, `author`, `year` or `full`.
- `<bibliography>` lists only the cited entries. Put it once, at the end. Every key must exist in the `.bib` file, or the build fails.
- The file, style and title are set in the front matter (`bibliography:` with `file:`, `style:` such as `ieee` or `apa`, `title:`, `dir:`); attributes on the tag override them.
`````.text,
  ),
  fa: (
    about: `````md
استناد و فهرست منابع. `<cite key="...">` به ورودی‌های یک فایل BibTeX استناد می‌دهد و `<bibliography>` فقط منابعِ استنادشده را فهرست می‌کند. `<bibliography>` را یک بار و در پایان بگذارید؛ سندی که استناد دارد باید آن را هم داشته باشد. فایل `.bib` در front matter نام برده می‌شود (`bibliography: file:`).

- `<cite key="a">` یا چند کلید با `key="a, b"`؛ `page="ص. ۱۲"` توضیح تکمیلی می‌افزاید؛ `form` یکی از `normal` (پیش‌فرض)، `prose`، `author`، `year` یا `full` است.
- `<bibliography>` فقط منابعِ استنادشده را فهرست می‌کند. یک بار و در پایان بگذارید. هر کلید باید در فایل `.bib` باشد، وگرنه ساخت شکست می‌خورد.
- فایل، سبک و عنوان در front matter تعیین می‌شود (`bibliography:` با `file:`، `style:` مثل `ieee` یا `apa`، `title:` و `dir:`)؛ ویژگی‌های روی تگ بر آن‌ها مقدم‌اند.
`````.text,
  ),
  example: (
    en: `````md
Transformers are built on attention <cite key="vaswani2017attention"></cite>.
Several sources <cite key="knuth1984texbook, vaswani2017attention"></cite>.
With a page <cite key="knuth1984texbook" page="p. 12"></cite>.

<bibliography></bibliography>
`````.text,
    fa: `````md
ترنسفورمرها بر پایهٔ توجه‌اند <cite key="vaswani2017attention"></cite>.
چند منبع <cite key="knuth1984texbook, vaswani2017attention"></cite>.
با شماره صفحه <cite key="knuth1984texbook" page="ص. ۱۲"></cite>.

<bibliography></bibliography>
`````.text,
  ),
)
