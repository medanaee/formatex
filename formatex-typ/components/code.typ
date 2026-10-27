#import "/src/prelude.typ": *
#import "/src/lib/basics.typ": *

// "3,7-9" -> (3, 7, 8, 9)
#let parse-line-set(s) = {
  let out = ()
  for part in s.split(",").map(p => p.trim()).filter(p => p != "") {
    let ends = part.split("-").map(p => int(p.trim()))
    out += range(ends.first(), ends.last() + 1)
  }
  out
}

#let code-tags = (
    // <code src="file.py" lines="10-20" highlight="12,15-16" caption="..." id="...">,
    // or the same attributes around a fenced code block.
    code: (attrs, body) => {
      let (source, lang) = if "src" in attrs {
        (read(root-path(attrs.src)), attrs.at("lang", default: attrs.src.split(".").last()))
      } else {
        let r = find-raw(body)
        assert(r != none, message: at-of(attrs) + "<code> needs src=\"file\" or a fenced code block inside it")
        (r.text, attrs.at("lang", default: r.at("lang", default: none)))
      }
      let all = source.split("\n").map(l => l.trim("\r", at: end))
      let first = 1
      if "lines" in attrs {
        let ends = attrs.lines.split("-").map(p => int(p.trim()))
        first = ends.first()
        let last = calc.min(ends.last(), all.len())
        assert(first >= 1 and first <= last, message: at-of(attrs) + "<code> lines " + repr(attrs.lines) + " is outside the code (" + str(all.len()) + " lines)")
        all = all.slice(first - 1, last)
      }
      let code-block = raw(all.join("\n"), lang: lang, block: true)
      let caption = attrs.at("caption", default: none)
      let id = attrs.at("id", default: none)

      code-options.update((start: first, highlight: parse-line-set(attrs.at("highlight", default: ""))))
      span-columns(attrs, "code", if caption == none and id == none { code-block } else {
        context {
          let detected = if caption != none { content-dir(caption) }
          let d = if detected == none { last-dir.get() } else { detected }
          set text(dir: d)
          let fig = figure(
            code-block,
            kind: raw,
            caption: caption,
            supplement: if d == rtl [کد] else [Listing],
            numbering: n => numbering(if d == rtl { "۱" } else { "1" }, n),
          )
          if id != none [#fig#label(id)] else { fig }
        }
      })
      code-options.update((:))
    },
)

#let code-schema = (
  "code": (
    kind: "block",
    description: (en: "code from a file, line ranges, highlights", fa: "کد از فایل، بازهٔ خط‌ها، برجسته‌سازی"),
    attrs: (
      "src": (type: "path", doc: (en: "File to load, relative to the project root. Without it, the fenced code block inside the tag is used.", fa: "فایلی که بارگذاری می‌شود، نسبت به پوشهٔ ریشهٔ پروژه. بدون آن، بلوک کد داخل تگ استفاده می‌شود.")),
      "lang": (type: "string", doc: (en: "Highlighting language. Default: the file extension, or the fence language.", fa: "زبان رنگ‌آمیزی. پیش‌فرض: پسوند فایل یا زبان بلوک کد.")),
      "lines": (type: "string", doc: (en: "`10-20`: show only these lines. Line numbers keep the file's numbering.", fa: "`10-20`: فقط این خط‌ها را نشان بده. شمارهٔ خط‌ها همان شماره‌گذاری فایل را نگه می‌دارد.")),
      "highlight": (type: "string", doc: (en: "`3`, `3,7-9`: lines drawn with a tinted band. Uses the shown line numbers.", fa: "`3`، `3,7-9`: خط‌هایی که با نوار ته‌رنگ کشیده می‌شوند. از شمارهٔ خط‌های نمایش‌داده‌شده استفاده می‌کند.")),
      "caption": (type: "string", doc: (en: "Numbered caption above the code: «کد ۱: ...» / \"Listing 1: ...\". Not parsed as Markdown.", fa: "عنوان شماره‌دار بالای کد: «کد ۱: ...» / \"Listing 1: ...\". به‌عنوان Markdown پردازش نمی‌شود.")),
      "id": (type: "string", doc: (en: "Target for `<ref>`. Gives a number even without a caption.", fa: "هدف `<ref>`. حتی بدون عنوان هم شماره می‌دهد.")),
      "span": (type: "enum", values: ("column", "all"), default: "column", doc: (en: "`column` (default) or `all`. In a multi-column document, `all` puts the listing across all columns, at the top or bottom of a page; useful for wide code. No effect with one column.", fa: "`column` (پیش‌فرض) یا `all`. در سند چندستونه، `all` کد را روی همهٔ ستون‌ها، در بالا یا پایین صفحه، می‌گذارد؛ برای کدهای پهن. در سند تک‌ستونه اثری ندارد.")),
    ),
  ),
)



