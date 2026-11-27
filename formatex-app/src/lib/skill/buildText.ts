import type { SkillLevel } from "@/lib/skill/generate"
import type { FixedLanguage } from "@/lib/skill/text"

const ORDER: readonly SkillLevel[] = ["minimal", "compact", "standard", "full"]

/** A piece of the skill for building components, with the smallest size that shows it. */
interface Block {
  min: SkillLevel
  text: string
}

/**
 * The names of the engine this text documents (what `/src/kit.typ` gives a component). A test checks that the engine still defines each
 * of them, so the skill cannot describe a helper that is gone.
 */
export const KIT_NAMES = ["theme", "zoom", "feel", "doc-dir", "content-dir", "is-phone", "column-count", "color-presets", "at-of", "setting-prefix", "parse-length", "resolve-color", "tinted", "panel", "root-path", "plain-text", "span-columns", "flag-attr", "pick-hue"] as const

const EXAMPLE = `\`\`\`text
extras/note/
  manifest.toml
  schema.json
  docs.json
  typst.typ
  html.tsx
  html.css
\`\`\`

manifest.toml:
\`\`\`toml
name = "note"
version = "1.0.0"
typ = "typst.typ"
html = "html.tsx"
css = "html.css"
schema = "schema.json"
docs = "docs.json"
\`\`\`

schema.json:
\`\`\`json
{
  "note": {
    "kind": "block",
    "description": { "en": "A note", "fa": "یادداشت" },
    "attrs": {}
  }
}
\`\`\`

docs.json:
\`\`\`json
{
  "en": { "about": "A note containing ordinary Markdown." },
  "fa": { "about": "یادداشت با محتوای معمولی Markdown." },
  "example": { "en": "<note>Text</note>", "fa": "<note>متن</note>" }
}
\`\`\`

typst.typ:
\`\`\`typst
#import "/src/kit.typ": *
#let note-tags = (
  note: (attrs, body) => context {
    let tone = tinted(theme.accent)
    block(width: 100%, inset: 8pt * zoom, fill: tone.fill,
      stroke: 0.6pt * zoom + tone.border, radius: feel.box,
      text(fill: theme.fg, body))
  },
)
\`\`\`

html.tsx:
\`\`\`tsx
export default function Note({ node, context }) {
  return <aside className="border-s-2 border-primary bg-muted/40 p-3 text-foreground">{context.children(node)}</aside>
}
\`\`\`

html.css:
\`\`\`css
/* Optional package-specific styles; preserve the document's tokens and direction. */
\`\`\`
`

const EN: Block[] = [
  {
    min: "minimal",
    text: `## Building your own components

A component is a **folder package**. Use one only when ordinary Markdown and existing tags cannot express the document. Shared packages contain these six named files: \`manifest.toml\`, \`schema.json\`, \`docs.json\`, \`typst.typ\`, \`html.tsx\`, \`html.css\`.

Declare component **folder paths in Markdown front matter** (relative to the \`.md\` file, or starting with \`/\` for the project root):
\`\`\`yaml
---
components:
  - extras/note
---
\`\`\`

Tag names use lowercase letters, digits and \`-\`, beginning with a letter. Check existing schemas to avoid duplicate tags.`,
  },
  {
    min: "minimal",
    text: `### Shared contract and two implementations

- \`manifest.toml\` names the package and references \`typ\`, \`html\`, \`css\`, \`schema\`, \`docs\` files. Use \`typ = "typst.typ"\` and \`html = "html.tsx"\`; \`typ = false\` or \`html = false\` declares an absent implementation.
- \`schema.json\` owns tag kinds, properties, defaults, allowed values, domains and scoped-child rules. \`docs.json\` owns English/Persian Markdown descriptions and usage examples. Keep these data separate from both implementations.
- \`typst.typ\` exports the package's \`<name>-tags\` dictionary \`(tag: (attrs, body) => content)\` for PDF; import \`/src/kit.typ\` and use its helpers. \`html.tsx\` exports either a default React component \`({ node, context }) => JSX\` (single-tag packages) or a tag-to-component dictionary \`export default { tagA: ComponentA, tagB: ComponentB }\` (preferred for multi-tag packages); render \`context.children(node)\` rather than parsing Markdown.
- \`html.css\` contains component styles; Tailwind classes in TSX are compiled into the required static CSS.

The common pipeline executes in Typst and invokes Rust/WASM pulldown-cmark once to build shared IR.`,
  },
  {
    min: "minimal",
    text: `### One configuration and output namespaces

Use one \`config.toml\`: shared root/tables plus \`[html]\` / \`[typ]\` overrides. Front matter follows the same structure. An HTML-only property must have the \`html\` prefix: \`[html.code] copy-button = true\` or local \`html.copy-button="true"\`, never bare \`copy-button\`. Paged-only settings belong under \`typ\`, for example \`[typ] page = "desktop-a4"\`; header/footer belong under \`typ.header\` / \`typ.footer\`.

After schema defaults, precedence is project shared -> project output -> document shared -> document output -> local shared -> local output, merged by key. Keep kebab-case: \`{{ setting.html.code.copy-button }}\` is valid Typst field access. Local props do not mutate document-wide \`setting\`; vars/var-types stay shared language facilities.`,
  },
  {
    min: "minimal",
    text: `### Let the document decide the look

PDF uses \`theme\`, \`zoom\`, \`feel\` and \`content-dir(body)\`; HTML uses the shared document tokens, logical CSS and semantic Tailwind classes. Keep text on a readable tint, not on a solid accent fill. Use \`tinted(...)\` / \`resolve-color(...)\` and \`theme.fg\` in Typst; take radii from \`feel\` (formal is square) and lengths from \`zoom\` or \`em\`.

Use start/end sides rather than fixed left/right, and responsive widths rather than a fixed width that overflows a phone. Test light/dark, Persian/English and all feels in both outputs. Renderer availability and full application parity still need verification for a new package.`,
  },
  {
    min: "compact",
    text: `### schema.json and docs.json

\`schema.json\` maps each tag name to a JSON object with \`kind\` (\`inline\`, \`block\`, \`void\` or a supported mixed kind), bilingual \`description\`, \`attrs\`, optional \`children\` and \`scoped\`. An attribute describes \`type\`, optional \`default\`, \`required\`, \`values\`, bilingual \`doc\` and \`domain\` (\`shared\`, \`html\` or \`typ\`). Types include string, number, int, bool, length, color, path and enum. JSON booleans are \`true\` / \`false\`; keep values/defaults consistent with their types and the resolver.

\`docs.json\` has \`en\` / \`fa\` objects with Markdown \`about\` and optional \`more\`, plus \`example.en\` / \`example.fa\` strings. Write descriptions, rules and examples in both languages. JSON uses double quotes and escaped newlines; do not place executable code or raw Typst declarations in these data files.

The manifest is the authority for filenames and implementation availability. A package with neither renderer is invalid. Typst-only packages use SVG fallback in HTML; an HTML-only subtree is omitted from PDF without reserving space/counters/list entries. Diagnose references to omitted targets; an existing broken implementation is an error, not an automatic fallback.`,
  },
  {
    min: "standard",
    text: `### Typst implementation and kit

\`#import "/src/kit.typ": *\` supplies \`theme\`, \`zoom\`, \`feel\`, \`doc-dir\`, \`content-dir\`, \`is-phone\`, \`column-count\` and the shared helpers. Use \`parse-length(value, attrs: attrs)\` for lengths, \`resolve-color(value, attrs: attrs)\` / \`tinted(color)\` for colors, \`panel(...)\` for panels, \`root-path(path)\` for project assets and \`plain-text(body)\` for text. Other documented helpers include \`span-columns\`, \`flag-attr\`, \`pick-hue\`, \`color-presets\`, \`at-of\` and \`setting-prefix\`.

Typst strings use double quotes; use ASCII digits in numeric code. Code inside \`( )\` / \`{ }\` does not take \`#\`, while code embedded in \`[ ]\` content does. Do not shadow built-in names such as \`text\`, \`box\`, \`grid\`, \`h\` or \`v\`. An \`em\` length needs context before comparison with \`pt\`; use \`context\` and \`.to-absolute()\` when necessary. Read handler attributes with \`attrs.at(...)\` and the appropriate conversion helper instead of assuming a numeric input.

Core owns common preparation/parser/IR/schema; the PDF backend owns layout. Do not edit generated \`formatex-typ\` source copies or add another expression/include evaluation in the component.`,
  },
  {
    min: "standard",
    text: `### HTML implementation

\`html.tsx\` renders the shared IR node with \`{ node, context }\`. Export a single default function for one tag (\`export default function Component({ node, context })\`) or, for multi-tag packages, export a tag-to-component dictionary (\`export default { tagA: ComponentA, tagB: ComponentB }\`). Use \`context.props(node)\` for resolved typed props and \`context.children(node)\` for structured children. It may use the allowed React/document runtime imports and public document UI surface, with Tailwind and \`html.css\`; it must not import app/Tauri/editor state or parse source Markdown.

HTML owns reflow and displayed asset dimensions; Typst owns a requested drawing's interior. Preserve intrinsic dimensions and aspect ratio and avoid duplicate captions/SVG IDs. Use the existing context/asset service rather than starting a compiler process or reading arbitrary host files.

The base shell/viewer belongs to the independent React HTML engine, not each tag. Offline export includes its supported runtime/assets and required static Tailwind CSS, without a Tailwind CDN/compiler on the reader's device. Check custom interactive behavior explicitly; static React markup alone does not preserve arbitrary event handlers.`,
  },
  {
    min: "standard",
    text: `### Diagnostics and page values

Report a Typst document error with \`assert(..., message: at-of(attrs) + "...")\` and pass \`attrs: attrs\` to helpers so errors retain the Markdown tag/property location. Keep the implementation-file trace as useful extra context, not the only diagnostic. Schema errors should name the invalid property/value and its original source.

PDF resolves actual \`PAGE\` / \`PAGES\`. HTML must report an explicit source error for active expressions requiring page values; do not invent browser page counts. \`SECTION\` / \`SECTION_NUMBER\` may use the shared IR's section context. Deferred expressions cannot mutate ordinary document vars. Preview mapping uses core provenance; export must strip source maps/private source files/preview IPC.

A complete package check includes parsing, output-domain/default validation, PDF/HTML behavior, known source errors, Unicode/RTL, offline assets and the requested phone/tablet/desktop layouts. Do not call all of these verified merely because one demo compiles.`,
  },
  {
    min: "full",
    text: `### A complete package

` + EXAMPLE + `

Use it in Markdown with the front-matter folder declaration:
\`\`\`markdown
---
components:
  - extras/note
---

<note>

Check the totals.

</note>
\`\`\`

### Mistakes to avoid

- Omitting \`manifest.toml\` or mismatching the six package filenames (\`manifest.toml\`, \`schema.json\`, \`docs.json\`, \`typst.typ\`, \`html.tsx\`, \`html.css\`).
- Duplicating schema/docs inside renderer code instead of keeping them in \`schema.json\` and \`docs.json\`.
- Bare HTML-only props, root paged settings, invalid typed JSON defaults, or precedence based on source attribute order.
- Hardcoded theme colors, rounded corners in formal mode, fixed-width overflow, duplicated captions or unmapped errors.
- A second Markdown parser or repeated \`{{ }}\` execution; shipping private source/map/preview payloads in export.
- Assuming full HTML/native/source-map/performance parity from one successful PDF build.`,
  },
]

const FA: Block[] = [
  {
    min: "minimal",
    text: `## ساختن کامپوننت دلخواه

کامپوننت یک **بستهٔ پوشه‌ای** است. فقط وقتی بسازید که Markdown و تگ‌های موجود کافی نیستند. هر بسته این شش فایل را دارد: \`manifest.toml\`، \`schema.json\`، \`docs.json\`، \`typst.typ\`، \`html.tsx\` و \`html.css\`.

**مسیر پوشهٔ کامپوننت را در front matter فایل Markdown** معرفی کنید (نسبت به پوشهٔ همان فایل \`.md\`، یا با \`/\` از ریشهٔ پروژه):
\`\`\`yaml
---
components:
  - extras/note
---
\`\`\`

نام تگ با حرف کوچک شروع می‌شود و حرف کوچک، رقم و \`-\` دارد. schema موجود را برای تگ تکراری بررسی کنید.`,
  },
  {
    min: "minimal",
    text: `### قرارداد مشترک و دو پیاده‌سازی

- \`manifest.toml\` نام بسته و فایل‌های \`typ\`، \`html\`، \`css\`، \`schema\` و \`docs\` را معرفی می‌کند. از \`typ = "typst.typ"\` و \`html = "html.tsx"\` استفاده کنید؛ \`typ = false\` یا \`html = false\` یعنی آن پیاده‌سازی وجود ندارد.
- \`schema.json\` نوع تگ، ویژگی، پیش‌فرض، مقدار مجاز، حوزه و قاعدهٔ فرزند محدود به والد را دارد. \`docs.json\` توضیح Markdown و نمونهٔ فارسی/انگلیسی را نگه می‌دارد. این داده‌ها را از هر دو پیاده‌سازی جدا نگه دارید.
- \`typst.typ\` دیکشنری \`<name>-tags\` به‌شکل \`(tag: (attrs, body) => content)\` برای PDF دارد؛ \`/src/kit.typ\` و کمک‌کننده‌هایش را به کار ببرید. \`html.tsx\` یا یک کامپوننت پیش‌فرض React با \`{ node, context }\` می‌دهد (برای پکیج تک‌تگی) یا یک دیکشنری از نام تگ به کامپوننت \`export default { tagA: ComponentA, tagB: ComponentB }\` (روش تمیزتر و پیشنهادی برای پکیج‌های چندتگی)؛ \`context.children(node)\` را رندر کنید.
- \`html.css\` سبک کامپوننت است؛ کلاس‌های Tailwind در TSX به CSS ثابت لازم تبدیل می‌شوند.

خط لولهٔ مشترک در Typst اجرا می‌شود و پارسر Rust/WASM مبتنی بر pulldown-cmark را یک بار برای IR مشترک فراخوانی می‌کند.`,
  },
  {
    min: "minimal",
    text: `### یک تنظیم و حوزه‌های خروجی

یک \`config.toml\` داشته باشید: مقدارهای مشترک ریشه/جدول‌ها و بازنویسی‌های \`[html]\` / \`[typ]\`. front matter همین ساختار را دارد. ویژگی فقط HTML پیشوند \`html\` می‌خواهد: \`[html.code] copy-button = true\` یا \`html.copy-button="true"\` محلی، نه \`copy-button\` تنها. تنظیم فقط صفحه‌بندی زیر \`typ\` است؛ مثلاً \`[typ] page = "desktop-a4"\` و سربرگ/پابرگ زیر \`typ.header\` / \`typ.footer\`.

بعد از پیش‌فرض schema، تقدم دقیق این است: مشترک پروژه -> خروجی پروژه -> مشترک سند -> خروجی سند -> مشترک محلی -> خروجی محلی، با ادغام کلیدبه‌کلید. kebab-case را نگه دارید: \`{{ setting.html.code.copy-button }}\` دسترسی معتبر Typst است. ویژگی محلی \`setting\` سراسری را عوض نمی‌کند؛ vars/var-types ابزار مشترک زبان‌اند.`,
  },
  {
    min: "minimal",
    text: `### ظاهر را سند تعیین می‌کند

PDF از \`theme\`، \`zoom\`، \`feel\` و \`content-dir(body)\` استفاده می‌کند؛ HTML از توکن مشترک، CSS منطقی و Tailwind معنایی. متن را روی ته‌رنگ خوانا بگذارید، نه رنگ تأکید توپُر. در Typst از \`tinted(...)\` / \`resolve-color(...)\` و \`theme.fg\`، شعاع از \`feel\` (رسمی مربع است) و اندازه از \`zoom\` یا \`em\` بگیرید.

سمت شروع/پایان را به‌جای چپ/راست ثابت و پهنای واکنش‌گرا را به‌جای پهنای بیرون‌زننده از گوشی به کار ببرید. روشن/تیره، فارسی/انگلیسی و همهٔ حالت‌ها را در هر دو خروجی بررسی کنید. وجود پیاده‌سازی و برابری کامل اپ برای بستهٔ تازه نیازمند آزمون است.`,
  },
  {
    min: "compact",
    text: `### schema.json و docs.json

\`schema.json\` هر نام تگ را به شیء JSON با \`kind\` (inline، block، void یا نوع ترکیبی پشتیبانی‌شده)، \`description\` دوزبانه، \`attrs\` و در صورت نیاز \`children\` / \`scoped\` وصل می‌کند. ویژگی \`type\`، \`default\`، \`required\`، \`values\`، \`doc\` دوزبانه و \`domain\` (shared، html یا typ) دارد. نوع‌ها string، number، int، bool، length، color، path و enum هستند. bool در JSON مقدار \`true\` / \`false\` دارد؛ مقدار و پیش‌فرض را با نوع و حل‌کننده هماهنگ نگه دارید.

\`docs.json\` شیءهای \`en\` / \`fa\` با Markdownِ \`about\` و \`more\` اختیاری و رشته‌های \`example.en\` / \`example.fa\` دارد. توضیح، قاعده و نمونه را دوزبانه بنویسید. JSON گیومهٔ دوتایی و خط جدید escape‌شده می‌خواهد؛ در این فایل‌های داده کد اجرایی یا تعریف Typst نگذارید.

manifest مرجع نام فایل و وجود پیاده‌سازی است. بستهٔ بدون هر دو رندرکننده نامعتبر است. فقط Typst در HTML از SVG استفاده می‌کند؛ زیرشاخهٔ فقط HTML از PDF بدون فضا/شمارنده/ورودی فهرست کنار می‌رود. ارجاع به هدف حذف‌شده خطای روشن می‌خواهد؛ پیاده‌سازی موجودِ خراب خطاست، نه مجوز fallback خودکار.`,
  },
  {
    min: "standard",
    text: `### پیاده‌سازی Typst و kit

\`#import "/src/kit.typ": *\` مقدارهای \`theme\`، \`zoom\`، \`feel\`، \`doc-dir\`، \`content-dir\`، \`is-phone\`، \`column-count\` و کمک‌کننده‌های مشترک را می‌دهد. برای طول از \`parse-length(value, attrs: attrs)\`، رنگ از \`resolve-color(value, attrs: attrs)\` / \`tinted(color)\`، پنل از \`panel(...)\`، مسیر دارایی از \`root-path(path)\` و متن بدنه از \`plain-text(body)\` استفاده کنید. کمک‌کننده‌های مستند دیگر \`span-columns\`، \`flag-attr\`، \`pick-hue\`، \`color-presets\`، \`at-of\` و \`setting-prefix\` هستند.

رشتهٔ Typst گیومهٔ دوتایی دارد و عدد کد رقم ASCII می‌خواهد. کد در \`( )\` / \`{ }\` پیشوند \`#\` ندارد؛ کد داخل محتوای \`[ ]\` دارد. نام تابع آماده مثل \`text\`، \`box\`، \`grid\`، \`h\` یا \`v\` را نپوشانید. طول \`em\` پیش از مقایسه با \`pt\` نیازمند بافت است؛ در صورت نیاز از \`context\` و \`.to-absolute()\` استفاده کنید. ویژگی را با \`attrs.at(...)\` و کمک‌کنندهٔ تبدیل بخوانید، نه با فرض عدد بودن.

هسته مالک آماده‌سازی/پارسر/IR/schema است و PDF مالک صفحه‌آرایی. نسخهٔ تولیدشدهٔ \`formatex-typ\` را ویرایش نکنید و عبارت/include را دوباره در کامپوننت اجرا نکنید.`,
  },
  {
    min: "standard",
    text: `### پیاده‌سازی HTML

\`html.tsx\` گرهٔ IR مشترک را با \`{ node, context }\` رندر می‌کند. برای پکیج تک‌تگی یک تابع پیش‌فرض (\`export default function Component({ node, context })\`) و برای پکیج‌های چندتگی یک دیکشنری از نام تگ به کامپوننت (\`export default { tagA: ComponentA, tagB: ComponentB }\`) خروجی دهید. ویژگی حل‌شدهٔ نوع‌دار را با \`context.props(node)\` و فرزند ساختاری را با \`context.children(node)\` بگیرید. importهای مجاز React/زمان اجرای سند و UI عمومی، Tailwind و \`html.css\` قابل استفاده‌اند؛ import وضعیت اپ/Tauri/ویرایشگر یا پارس Markdown منبع مجاز نیست.

HTML مالک جریان متن و اندازهٔ نمایشی دارایی است و Typst مالک داخل رسم درخواستی. اندازه و نسبت ذاتی را نگه دارید و عنوان یا شناسهٔ SVG را دوباره نسازید. از سرویس بافت/دارایی موجود استفاده کنید، نه فرایند کامپایلر یا خواندن دلخواه فایل میزبان.

پوسته/نمایشگر متعلق به موتور React مستقل است، نه هر تگ. خروجی آفلاین زمان اجرا/دارایی پشتیبانی‌شده و CSS ثابت Tailwind را همراه دارد؛ CDN یا کامپایلر Tailwind در دستگاه خواننده ندارد. رفتار تعاملی دلخواه را جدا بررسی کنید؛ HTML ثابت React خودبه‌خود هر event handler را حفظ نمی‌کند.`,
  },
  {
    min: "standard",
    text: `### خطاها و مقدارهای صفحه

خطای سند در Typst را با \`assert(..., message: at-of(attrs) + "...")\` گزارش کنید و \`attrs: attrs\` به کمک‌کننده بدهید تا مکان اصلی تگ/ویژگی Markdown بماند. ردگیری فایل پیاده‌سازی اطلاعات تکمیلی است، نه تنها خطا. خطای schema باید نام ویژگی/مقدار و منبع اصلی را مشخص کند.

PDF مقدار واقعی \`PAGE\` / \`PAGES\` را دارد. HTML برای عبارت فعالِ نیازمند این مقدارها خطای منبع روشن می‌دهد؛ تعداد صفحهٔ مرورگر نسازید. \`SECTION\` / \`SECTION_NUMBER\` می‌توانند از بافت بخش در IR مشترک بیایند. عبارت دیرهنگام vars عادی را تغییر نمی‌دهد. نگاشت پیش‌نمایش از منبع هسته است؛ خروجی باید نگاشت/فایل خصوصی منبع/IPC پیش‌نمایش را حذف کند.

بررسی کامل بسته شامل پارس، حوزه/پیش‌فرض نوع‌دار، PDF/HTML، خطاهای منبع، Unicode/راست‌به‌چپ، دارایی آفلاین و چیدمان گوشی/تبلت/دسکتاپ است. با کامپایل یک دمو همهٔ این‌ها را تأییدشده ننامید.`,
  },
  {
    min: "full",
    text: `### یک بستهٔ کامل

` + EXAMPLE + `

در Markdown با پوشهٔ معرفی‌شده در front matter به کار ببرید:
\`\`\`markdown
---
components:
  - extras/note
---

<note>

جمع‌ها را بررسی کنید.

</note>
\`\`\`

### اشتباه‌هایی که باید از آن‌ها پرهیز کرد

- نبودن \`manifest.toml\` یا ناهماهنگی نام شش فایل بسته (\`manifest.toml\`، \`schema.json\`، \`docs.json\`، \`typst.typ\`، \`html.tsx\`، \`html.css\`).
- تکرار schema/docs درون کد رندرکننده به‌جای نگهداری در \`schema.json\` و \`docs.json\`.
- ویژگی فقط HTML بدون پیشوند، تنظیم صفحه در ریشه، پیش‌فرض JSON با نوع غلط یا تقدم وابسته به ترتیب ویژگی‌ها.
- رنگ ثابت، گوشهٔ گرد در حالت رسمی، پهنای بیرون‌زننده، عنوان تکراری یا خطای بدون منبع.
- پارسر Markdown دوم یا اجرای دوبارهٔ \`{{ }}\`؛ فایل خصوصی منبع/نگاشت/IPC پیش‌نمایش در خروجی.
- نتیجه‌گیری برابری کامل HTML/بومی/نگاشت/کارایی از یک PDF موفق.`,
  },
]

/** The skill for building components: the blocks of the size asked for, in one language. */
export function buildingSkill(language: FixedLanguage, level: SkillLevel): string {
  const reach = ORDER.indexOf(level)
  const blocks = (language === "fa" ? FA : EN).filter((block) => ORDER.indexOf(block.min) <= reach)
  return blocks.map((block) => block.text).join("\n\n")
}
