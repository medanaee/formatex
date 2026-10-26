#import "/src/prelude.typ": *


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



