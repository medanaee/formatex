#import "/src/kit.typ": *

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
      span-columns(attrs, "code", captioned(
        "code", raw, "کد", "Listing", code-block,
        caption: caption, id: id,
        numbering: caption-flag(attrs, "numbering"), position: attrs.at("caption-position", default: none),
        listed: caption-flag(attrs, "lol") != false,
      ))
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
      "caption": (type: "string", doc: (en: "Caption of the code: «توضیح». With `numbering` on it follows the number: «کد ۱: توضیح» / \"Listing 1: ...\". Not parsed as Markdown.", fa: "عنوان کد: «توضیح». با `numbering` روشن بعد از شماره می‌آید: «کد ۱: توضیح» / \"Listing 1: ...\". به‌عنوان Markdown پردازش نمی‌شود.")),
      "numbering": (type: "bool", doc: (en: "Number the listing («کد ۱»). Default: `[code] numbering` (off): with it on, a listing gets a number as soon as it has a caption; with it off, only the caption shows until you set `numbering=\"true\"` here.", fa: "کد شماره بخورد («کد ۱»). پیش‌فرض: `[code] numbering` (خاموش): با روشن بودن آن، کد به‌محض داشتن عنوان شماره می‌گیرد؛ با خاموش بودن فقط عنوان دیده می‌شود تا اینجا `numbering=\"true\"` بگذارید.")),
      "caption-position": (type: "enum", values: ("above", "below"), doc: (en: "Where the number and caption go. Default: `[code] caption-position` (`above`).", fa: "جای شماره و عنوان. پیش‌فرض: `[code] caption-position` (`above`).")),
      "lol": (type: "bool", default: "true", doc: (en: "`false` leaves this listing out of `<lol>`.", fa: "`false` این کد را از `<lol>` بیرون می‌گذارد.")),
      "id": (type: "string", doc: (en: "Target for `<ref>`.", fa: "هدف `<ref>`.")),
      "span": (type: "enum", values: ("column", "all"), default: "column", doc: (en: "`column` (default) or `all`. In a multi-column document, `all` puts the listing across all columns, at the top or bottom of a page; useful for wide code. No effect with one column.", fa: "`column` (پیش‌فرض) یا `all`. در سند چندستونه، `all` کد را روی همهٔ ستون‌ها، در بالا یا پایین صفحه، می‌گذارد؛ برای کدهای پهن. در سند تک‌ستونه اثری ندارد.")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let code-docs = (
  en: (
    about: `````md
A code listing with syntax highlighting: the code stands in a fenced block inside the tag, or comes from a project file with `src` (and a line range with `lines`). `highlight` marks lines; `caption` makes a numbered listing that `<lol>` lists.

- Give the code in a fenced block inside the tag (leave blank lines around it), or `src="path"` with `lines="6-16"` for a range of a project file; the language comes from the fence or the file extension.
- `highlight="9-10,15"` marks lines (numbers count in the file when `src` is used). `caption` + `id` make a numbered listing that `<lol>` lists and `<ref>` can point at.
- A fenced block in a language Typst does not know, or with no language, still gets a rough coloring (comments, strings, numbers, common keywords, `Types` and `calls(`); `text`, `txt`, `plain`, `console` and `output` stay uncolored.
- A plain fenced block without the tag is highlighted too; `<code>` adds the line range, the highlight and the caption.
`````.text,
  ),
  fa: (
    about: `````md
فهرست کد با رنگ‌آمیزی نحو: کد در یک بلوک کد داخل تگ می‌آید یا با `src` از یک فایل پروژه (و بازهٔ خط‌ها با `lines`). `highlight` خط‌ها را برجسته می‌کند و `caption` آن را کدِ شماره‌دار می‌کند که `<lol>` فهرستش می‌کند.

- کد را در یک بلوک کد داخل تگ بدهید (دورش خط خالی بگذارید)، یا با `src="path"` و `lines="6-16"` بازه‌ای از یک فایل پروژه؛ زبان از بلوک یا پسوند فایل می‌آید.
- `highlight="9-10,15"` خط‌ها را برجسته می‌کند (با `src` شماره‌ها شمارهٔ خط فایل‌اند). `caption` و `id` یک کدِ شماره‌دار می‌سازند که `<lol>` فهرستش می‌کند و `<ref>` به آن اشاره می‌کند.
- بلوک کدی که زبانش را Typst نمی‌شناسد (یا بی‌زبان) هم یک رنگ‌آمیزی تقریبی می‌گیرد (توضیح، رشته، عدد، کلیدواژه‌های رایج، `Type` و `call(`)؛ زبان‌های `text`، `txt`، `plain`، `console` و `output` بی‌رنگ می‌مانند.
- یک بلوک کد ساده بدون تگ هم رنگ‌آمیزی می‌شود؛ `<code>` بازهٔ خط، برجسته‌سازی و عنوان را اضافه می‌کند.
`````.text,
  ),
  example: (
    en: `````md
<code src="examples/sample.py" lines="6-16" highlight="9-10,15" caption="Fibonacci with a cache" id="code-fib"></code>

<code highlight="2">

```js
const a = 1;
const b = a + 1;
```

</code>
`````.text,
    fa: `````md
<code src="examples/sample.py" lines="6-16" highlight="9-10,15" caption="Fibonacci with a cache" id="code-fib"></code>

<code highlight="2">

```js
const a = 1;
const b = a + 1;
```

</code>
`````.text,
  ),
)
