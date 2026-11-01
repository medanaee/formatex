#import "/src/kit.typ": *

// <typ>: Typst written straight into the document. The tag holds a fenced code block of Typst markup, or `src="file.typ"` names a
// Typst file; either way the result is set in place, as if the text of that file stood here.
//
// A file given as `src` is included by Typst itself, so the `#include "..."` / `#import "..."` lines inside it resolve the way
// they do in any Typst project (relative to the file that holds them), however deeply the files are nested. The code block has no
// file of its own, so its relative paths are read as paths from the project root, like `src` and `<include>`.

// The paths of `#include "..."` and `#import "..."` in a code block are written from the project root; Typst resolves a path
// from the file that runs `eval` (a component file), so they are rooted here. Absolute paths, packages (`@preview/...`) and
// URLs are left as they are.
#let typ-root-paths(code) = code.replace(
  regex("\\b(include|import)(\\s+)\"([^\"@/:][^\"]*)\""),
  m => m.captures.at(0) + m.captures.at(1) + "\"/" + m.captures.at(2) + "\"",
)

#let typ-tags = (
    typ: (attrs, body) => {
      let given = attrs.at("dir", default: "auto")
      assert(given in ("auto", "rtl", "ltr"), message: at-of(attrs) + "<typ> dir must be auto, rtl or ltr, got " + repr(given))
      let inside = if "src" in attrs {
        // A file: Typst includes it, nested includes and all
        include root-path(attrs.src)
      } else {
        let r = find-raw(body)
        assert(r != none, message: at-of(attrs) + "<typ> needs a fenced code block of Typst inside it, or src=\"file.typ\"")
        // Without a file of its own the code sees the theme, the zoom and the feel; anything else it imports itself
        // (`#import "/src/kit.typ": *` brings the whole kit of the engine).
        eval(typ-root-paths(r.text), mode: "markup", scope: (theme: theme, zoom: zoom, feel: feel))
      }
      if given == "auto" { inside } else { text(dir: if given == "rtl" { rtl } else { ltr }, inside) }
    },
)

#let typ-schema = (
  "typ": (
    kind: "block",
    description: (en: "Typst code or a Typst file, set in place", fa: "کد Typst یا یک فایل Typst، در همین جا حروف‌چینی می‌شود"),
    attrs: (
      "src": (type: "path", doc: (en: "A Typst file (`src=\"parts/intro.typ\"`) instead of the code block. Its own `#include` and `#import` lines work as in any Typst project, however deeply nested.", fa: "یک فایل Typst (`src=\"parts/intro.typ\"`) به‌جای بلوک کد. خط‌های `#include` و `#import` خودِ فایل مثل هر پروژه‌ی Typst کار می‌کنند، هر قدر تودرتو.")),
      "dir": (type: "enum", values: ("auto", "rtl", "ltr"), default: "auto", doc: (en: "Text direction of the result. `auto` (default) leaves it to the document's rules.", fa: "جهت متن نتیجه. `auto` (پیش‌فرض) آن را به قاعده‌های سند می‌سپارد.")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let typ-docs = (
  en: (
    about: `````md
Typst written straight into the document: a fenced code block of Typst markup inside the tag, or a `.typ` file with `src`, set in place as if its text stood there.

- A `src` file is included by Typst itself, so the `#include "..."` / `#import "..."` lines inside it resolve as in any Typst project, relative to the file that holds them, at any depth; each file is set where it is included.
- A code block has no file of its own, so its relative `#include` / `#import` paths are read from the project root. Absolute paths, `@preview/...` packages and URLs stay as written.
- A code block sees `theme`, `zoom` and `feel`; anything else it imports itself (`#import "/src/kit.typ": *` brings the engine's whole kit). A `src` file sees nothing by default: start it with that import when it needs the theme.
- It is markup: headings join the numbering and the table of contents, text takes the theme, and `#set` / `#show` inside a file or block stay inside it. `dir` forces the text direction.
`````.text,
  ),
  fa: (
    about: `````md
Typst که مستقیم در سند نوشته می‌شود: یک بلوک کد مارک‌آپ Typst داخل تگ، یا فایل `.typ` با `src`؛ در همان جا حروف‌چینی می‌شود، انگار متنش همان‌جا نوشته شده.

- فایل `src` را خود Typst `include` می‌کند؛ پس خط‌های `#include "..."` / `#import "..."` داخلش مثل هر پروژهٔ Typst حل می‌شوند: نسبت به فایلی که آن‌ها را دارد و در هر عمقی؛ هر فایل همان‌جا که `include` شده حروف‌چینی می‌شود.
- بلوک کد فایل خودش را ندارد؛ پس مسیرهای نسبیِ `#include` / `#import` آن از ریشهٔ پروژه خوانده می‌شود. مسیر مطلق، بسته‌های `@preview/...` و نشانی‌ها همان‌طور که نوشته‌اید می‌مانند.
- بلوک کد `theme`، `zoom` و `feel` را می‌بیند؛ هر چیز دیگر را خودش import می‌کند (`#import "/src/kit.typ": *` همهٔ جعبه‌ابزار موتور را می‌آورد). فایل `src` به‌طور پیش‌فرض چیزی نمی‌بیند: اگر تم می‌خواهد با آن import شروع کنید.
- مارک‌آپ است: تیترها به شماره‌گذاری و فهرست مطالب می‌پیوندند، متن رنگ تم را می‌گیرد و `#set` / `#show` داخل یک فایل یا بلوک همان‌جا می‌ماند. `dir` جهت متن را اجبار می‌کند.
`````.text,
  ),
  example: (
    en: `````md
<typ src="parts/intro.typ"></typ>

<typ>

```typ
== A section written in Typst

The accent is #text(fill: theme.accent)[this color].

#include "parts/table.typ"
```

</typ>
`````.text,
    fa: `````md
<typ src="parts/intro.typ"></typ>

<typ>

```typ
== بخشی که با Typst نوشته شده

رنگ تأکید #text(fill: theme.accent)[این رنگ] است.

#include "parts/table.typ"
```

</typ>
`````.text,
  ),
)
