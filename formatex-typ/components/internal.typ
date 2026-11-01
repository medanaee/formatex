#import "/src/kit.typ": *


#let internal-tags = (
    // Added by `list-pages` around lists in multi-column documents.
    listpages: (attrs, body) => page(columns: 1, body),
    "include": (attrs, body) => panic("<include src=\"" + attrs.at("src", default: "") + "\"> must stand alone on its own line, with blank lines around it"),
)

#let internal-schema = (
  "listpages": (
    kind: "block",
    description: (en: "Internal: gives a run of lists its own one-column page", fa: "داخلی: به دنباله‌ای از فهرست‌ها صفحهٔ تک‌ستونهٔ جدا می‌دهد"),
    attrs: (:),
  ),
  "include": (
    kind: "block",
    description: (en: "Include another Markdown file; must stand alone on its own line with blank lines around it", fa: "گنجاندن فایل Markdown دیگر؛ باید تنها در یک خط و با خط خالی دور آن باشد"),
    attrs: (
      "src": (type: "path", required: true, doc: (en: "Path of the Markdown file to include", fa: "مسیر فایل Markdown برای گنجاندن")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let internal-docs = (
  en: (
    about: `````md
Including other Markdown files: `<include src="...">` puts a file in place, so a long document can be split into chapters that continue each other's numbering. `<listpages>` is internal.

- `<include src="chapters/a.md">` is replaced by the file's text before rendering, so heading numbers, the table of contents, figure, table and equation numbers and `<ref>` continue across files. Only the main file's front matter counts.
- Paths are from the project root; `./` or `../` makes a path relative to the file that holds the tag. Nested includes work; a loop is a compile error. Write headings at the level they should have in the main document.
- The tag must stand on its own line with blank lines around it (not inside a paragraph or list); inside fenced code it stays text.
`````.text,
  ),
  fa: (
    about: `````md
درج فایل‌های Markdown دیگر: `<include src="...">` یک فایل را در جای خودش می‌گذارد؛ پس سند بلند به فصل‌هایی تقسیم می‌شود که شماره‌گذاری هم را ادامه می‌دهند. `<listpages>` داخلی است.

- ‏`<include src="chapters/a.md">` پیش از حروف‌چینی با متن آن فایل جایگزین می‌شود؛ پس شمارهٔ تیترها، فهرست مطالب، شمارهٔ شکل و جدول و معادله و `<ref>` در سراسر فایل‌ها ادامه پیدا می‌کنند. فقط front matter فایل اصلی اعتبار دارد.
- مسیرها از ریشهٔ پروژه‌اند؛ با `./` یا `../` مسیر نسبت به فایلی است که تگ را دارد. includeهای تودرتو کار می‌کنند؛ حلقه خطای ساخت است. تیترها را با همان سطحی بنویسید که در سند اصلی باید داشته باشند.
- تگ باید تنها در یک خط و با خط خالی دورش بیاید (نه درون پاراگراف یا فهرست)؛ داخل بلوک کد متن می‌ماند.
`````.text,
  ),
  example: (
    en: `````md
## Introduction

<include src="chapters/intro.md"></include>

<include src="chapters/method.md" />
`````.text,
    fa: `````md
## مقدمه

<include src="chapters/intro.md"></include>

<include src="chapters/method.md" />
`````.text,
  ),
)
