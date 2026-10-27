#import "/src/kit.typ": *

#let toc-tags = (
    toc: (attrs, body) => {
      let d = attrs.at("dir", default: "rtl")
      let title = attrs.at("title", default: if d == "ltr" { "Contents" } else { "فهرست مطالب" })
      let (break-before, break-after) = page-breaks(attrs)
      // "rtl": every number Persian, section numbers on the right; "ltr": Latin, on the left;
      // "auto": each entry's number follows its own title.
      let nums = list-numbers(attrs, "toc", if d == "ltr" { "ltr" } else { "rtl" })
      let pages = list-pages-on(attrs, "toc")
      // Levels counted from the document's top heading level, like [heading] max-level:
      // with headings starting at ##, depth="1" lists only the sections.
      let depth = attrs.at("depth", default: none)
      if depth != none {
        assert(depth.match(regex("^[1-9][0-9]*$")) != none, message: at-of(attrs) + "<toc> depth must be a whole number from 1, got " + repr(depth))
        depth = int(depth)
      }

      show outline.entry: it => context {
        let entry-rtl = content-dir(it.element.body) != ltr
        let entry-dir = if nums != "auto" { if nums == "rtl" { rtl } else { ltr } } else if d == "rtl" { rtl } else if d == "ltr" { ltr } else if entry-rtl { rtl } else { ltr }
        let fa-digits = if nums == "auto" { entry-rtl } else { nums == "rtl" }
        let min-level = calc.min(..query(heading.where(outlined: true)).map(h => h.level))
        let indent = (it.level - min-level) * 1.5em
        set text(dir: entry-dir)
        let number = if it.element.numbering != none [
          #heading-number(counter(heading).at(it.element.location()), fa-digits)#h(0.5em)
        ]
        // Unicode isolates keep each title's own direction inside a forced-direction line.
        let isolate(x) = [#if entry-rtl { "\u{2067}" } else { "\u{2066}" }#x#"\u{2069}"]
        let entry-text = if nums == "auto" { isolate[#number#it.body()] } else [#number#isolate(it.body())]
        let page-number = if nums == "auto" { it.page() } else { page-digits(it.element, fa-digits) }
        link(
          it.element.location(),
          pad(
            ..if entry-dir == rtl { (right: indent) } else { (left: indent) },
            if pages [#entry-text #box(width: 1fr, it.fill) #page-number] else { entry-text },
          ),
        )
      }
      if break-before { pagebreak(weak: true) }
      block(below: 2em, {
        set text(dir: if d == "ltr" { ltr } else { rtl })
        if depth == none { outline(title: title) } else {
          context {
            let all = query(heading.where(outlined: true))
            let numbered = all.filter(h => h.numbering != none)
            if numbered.len() > 0 { all = numbered }
            let top = if all.len() == 0 { 1 } else { calc.min(..all.map(h => h.level)) }
            outline(title: title, depth: top + depth - 1)
          }
        }
      })
      if break-after { pagebreak(weak: true) }
    },
)

#let toc-schema = (
  "toc": (
    kind: "block",
    description: (en: "table of contents", fa: "فهرست مطالب"),
    attrs: (
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "rtl", doc: (en: "`rtl` (all entries RTL), `ltr`, `auto` (each entry follows its heading)", fa: "`rtl` (همهٔ ردیف‌ها راست‌به‌چپ)، `ltr`، `auto` (هر ردیف از تیتر خودش پیروی می‌کند)")),
      "title": (type: "string", doc: (en: "Any text", fa: "هر متنی")),
      "numbers": (type: "enum", values: ("rtl", "ltr", "auto"), doc: (en: "`rtl`: all numbers Persian, section numbers on the right. `ltr`: all Latin, section numbers on the left. `auto`: each entry's number follows its own title. Page numbers use the same digits.", fa: "`rtl`: همهٔ شماره‌ها فارسی و شمارهٔ بخش‌ها سمت راست. `ltr`: همه لاتین و سمت چپ. `auto`: شمارهٔ هر ردیف از عنوان خودش پیروی می‌کند. شمارهٔ صفحه‌ها هم همان رقم‌ها را می‌گیرند.")),
      "depth": (type: "int", doc: (en: "How many heading levels are listed, counted from the document's top level: with headings starting at `##`, `1` = only sections (`۱`), `2` = also subsections (`۱.۱`)", fa: "چند سطح تیتر در فهرست بیاید، از بالاترین سطح سند شمرده می‌شود: اگر تیترها از `##` شروع شوند، `1` = فقط بخش‌ها (`۱`)، `2` = زیربخش‌ها هم (`۱.۱`)")),
      "pages": (type: "bool", default: "true", doc: (en: "`true`: dot leaders and page numbers; `false`: titles only", fa: "`true`: نقطه‌چین و شمارهٔ صفحه؛ `false`: فقط عنوان‌ها")),
      "break": (type: "enum", values: ("true", "false", "before", "after"), default: "false", doc: (en: "`true` (page break before and after: own page), `before`, `after`, `false`", fa: "`true` (شکست صفحه قبل و بعد: صفحهٔ جداگانه)، `before`، `after`، `false`")),
    ),
  ),
)



