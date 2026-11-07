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

const EXAMPLE = `\`\`\`typst
#import "/src/kit.typ": *

// Two tags that have nothing to do with each other can live in one file; the name of the file does not matter.
#let note-tags = (
  note: (attrs, body) => block(width: 100%, inset: 8pt * zoom, fill: theme.secondary, radius: 4pt * zoom, body),
  stamp: (attrs, body) => {
    let size = parse-length(attrs.at("size", default: "1em"), attrs: attrs)
    text(size: size, fill: theme.accent, weight: "bold", body)
  },
)

// Optional: gives autocomplete and checks the attributes written in a document.
#let note-schema = (
  "note": (kind: "block", description: (en: "A tinted note", fa: "یادداشت رنگی"), attrs: (:)),
  "stamp": (
    kind: "inline",
    description: (en: "A bold accent word", fa: "واژهٔ پررنگ با رنگ تأکید"),
    attrs: ("size": (type: "length", default: "1em", doc: (en: "Text size", fa: "اندازهٔ متن"))),
  ),
)

// Optional: what the tags are for, in both languages, and an example; the Skill page of the app uses it.
#let note-docs = (
  en: (about: "A tinted note box, and a bold accent word."),
  fa: (about: "کادر یادداشت رنگی و واژهٔ پررنگ."),
  example: (en: "<note>Check this</note> <stamp>new</stamp>", fa: "<note>این را بررسی کنید</note> <stamp>جدید</stamp>"),
)
\`\`\``

const EN: Block[] = [
  {
    min: "minimal",
    text: `## Building your own components

A component is a **Typst file in the project**. It gives the document new tags (\`<note>\`, \`<stamp>\`) that are written in the Markdown file like the built-in ones. Write one only when plain Markdown and the built-in tags are not enough.

- A file can define **any number of tags**, related or not. The **name of the file does not matter**, and a project can have any number of files, **anywhere** in it.
- List the files in the \`components\` setting, in \`config.toml\` (every document) or in the front matter of one document, the way you would import them: \`components = ["extras/notes.typ", "stamps.typ"]\`. Paths are relative to the project folder. Front matter adds to \`config.toml\`.
- A tag name is lowercase letters, digits and \`-\`, starting with a letter. It must not be a built-in tag (\`alert\`, \`box\`, ...) or a tag of another file: that is an error.`,
  },
  {
    min: "minimal",
    text: `### What a file defines

- \`<x>-tags\` (**required**): a dictionary \`tag-name: (attrs, body) => content\`. \`attrs\` holds the attributes written on the tag, **all strings**, read with \`attrs.at("size", default: "1em")\`. \`body\` is what stands between the opening and the closing tag.
- \`<x>-schema\` (optional): describes the tags by tag name. With it the app completes the tag and its attributes and the engine checks them; without it the tag still works and attributes are not checked.
- \`<x>-docs\` (optional): what the tags are for and an example, in English and Persian.

\`<x>\` is any label (\`note\`, \`my-tags\`); schema and docs are matched to a tag by the **tag name**, not by \`<x>\` or by the file.`,
  },
  {
    min: "minimal",
    text: `### Typst is not JavaScript or Python

Nearly every compile error in a component file is one of these. Check them before you finish:

- **Strings use double quotes only.** \`'text'\` does not exist in Typst (the error is "the character \`'\` is not valid in code", often followed by many more). A string that holds quotes escapes them: \`"<coffee level=\\"75\\">x</coffee>"\`; or write it as a raw block, \`\` \`<coffee level="75">x</coffee>\`.text \`\` (a block of several lines: \`\`\`\`\`md ... \`\`\`\`\`.text). This is where it goes wrong most: the \`example:\` of \`<x>-docs\` always holds tags with quoted attributes, so write \`example: (en: "<coffee level=\\"75\\">Latte</coffee>", fa: "...")\`, never \`'...'\`.
- **Code and content are two modes.** Inside \`( )\` and \`{ }\` you are in code: \`let x = 1\`, no \`#\`. Inside \`[ ]\` you are in content: code there needs \`#\` (\`#let\`, \`#if\`, \`#place(...)\`). Do not put \`#\` in code and do not leave it out in \`[ ]\`. Build the picture in a \`{ }\` block and keep \`[ ]\` for text.
- **Code takes ASCII only.** Persian digits (۷۵), \`٪\`, curly quotes and Persian letters are fine inside a string or in content (\`"۷۵٪"\`, \`[۷۵٪]\`), never in code (\`level: ۷۵\` fails).
- **\`75%\` without quotes is a ratio, \`"75%"\` is a string.** An attribute is always a string: \`float(attrs.at("level", default: "60").trim("%"))\`.
- **A length in \`em\` cannot be compared or added to one in \`pt\`** ("cannot compare 1.8em with 3pt"): \`parse-length\` can return \`em\`. Write the tag as \`(attrs, body) => context { ... }\` and resolve it first: \`parse-length(...).to-absolute()\`.
- **An argument belongs to certain functions only** ("unexpected argument: clip"). \`clip\` is an argument of \`block\` and \`box\`, not of \`rect\`; a clipped rounded shape is \`block(width: ..., height: ..., radius: ..., stroke: ..., fill: ..., clip: true, ...)\`. If you are not sure a function takes an argument, do not use it.
- **A variable must not have the name of a Typst function.** \`let h = ...\` hides the function \`h()\` (horizontal space), so a later \`h(6pt)\` fails with "expected function, found length". The same for \`v\`, \`w\` is safe but \`text\`, \`box\`, \`block\`, \`grid\`, \`rect\`, \`line\`, \`align\`, \`image\`, \`link\`, \`par\`, \`content\`, \`str\`, \`type\`, \`numbering\`, \`counter\` are not. Give variables descriptive names (\`cup-height\`, \`bar-width\`), never one letter that is also a function.
- **A one-item array needs its comma** \`(x,)\`; an empty dictionary is \`(:)\`.
- A single wrong character can give a dozen errors: fix the first one and compile again.`,
  },
  {
    min: "minimal",
    text: `### The document decides the look

A component is drawn on pages the author chose: one of eight themes (light or dark, or their own), one of three feels, any scale, either text direction, a phone-width page or columns. So **never write a fixed color, corner radius, font, size or \`left\` / \`right\`**. Take them from the document:

- **Colors** from \`theme\`. A fill that text sits on is a tint, \`tinted(...)\` or \`resolve-color(...)\`, and the text on it stays \`theme.fg\`. A strong color is for lines, icons and marks, never for a background under text.
- **Corner radii** from \`feel\` (\`feel.box\`, \`feel.badge\`, ...), **sizes** as \`N * zoom\` or \`em\`.
- **Order and sides** from the text direction (\`start\` / \`end\`, \`content-dir(body)\`), **widths** as \`100%\` or \`em\`, never a fixed width.`,
  },
  {
    min: "compact",
    text: `### The schema

\`<x>-schema\` is a dictionary \`"tag-name": (kind, description, attrs, ...)\`:

- \`kind\`: \`"inline"\` (inside a line of text), \`"block"\` (a block on its own) or \`"void"\` (self-closing, no body, like \`<v />\`).
- \`description\`: \`(en: "...", fa: "...")\`.
- \`attrs\`: \`"name": (type, default, required, values, doc)\`. \`type\` is \`string\`, \`number\`, \`int\`, \`bool\`, \`length\`, \`color\`, \`path\` or \`enum\` (an enum lists its \`values\`). \`doc\` is \`(en: ..., fa: ...)\`. The engine rejects an enum value that is not in \`values\`, a bool, int or number that is not one, and a missing required attribute.
- Optional: \`children\` (the tags it may hold), \`scoped: true\` (only valid inside its parent tags), \`display\` (how the tag is spelled when it has capitals).

### The docs

\`<x>-docs\` is \`(en: (about: "..."), fa: (about: "..."), example: (en: "...", fa: "..."))\`. \`about\` is Markdown (add \`more:\` for details); \`example\` is what a document writes.`,
  },
  {
    min: "standard",
    text: `### Colors: what each one is for

\`theme\` is a dictionary of Typst colors that differs in every theme (light: paper, sepia, ocean, sage; dark: midnight, nord, zinc, dracula; and the project's own \`[themes.x]\`); \`theme.dark\` says which kind it is.

- \`bg\` the page. \`fg\` the body text, and the text on any pale fill. \`heading\` titles. \`muted\` secondary text: captions, labels, hints.
- \`accent\` what must stand out: links, marks, bars, icons, a thin border. \`secondary\` soft background tints: table header rows, highlights (it equals \`accent\` in every theme except zinc, where it is gray).
- \`rule\` thin lines and borders. \`code-bg\` and \`code-stroke\` the fill and outline of a code box.

**The mistake that makes a component unreadable:** \`accent\` (or any strong hue) as a fill with text of the same hue, or dark text, on it, such as green text on a green card. \`accent\` is a color for text, lines and icons, not a background to write on. A colored panel is a **tint**:

\`\`\`typst
let tone = tinted(theme.accent)   // or tinted(color-presets.at("green"))
block(fill: tone.fill, stroke: 0.6pt * zoom + tone.border, radius: feel.box, inset: 8pt * zoom, text(fill: theme.fg, body))
\`\`\`

\`tinted(hue)\` returns \`(fill, border, icon)\`: \`fill\` is the hue mixed 10% (16% on dark themes) into \`bg\`, so it is pale and \`theme.fg\` reads on it; \`border\` is a stronger mix; \`icon\` is the hue moved to read on that fill: use it for icons, numbers and marks, not for paragraphs. The engine has no "text on accent" color, so a solid strong fill under text is not possible: use a tint.

A color the author gives as an attribute (\`green\`, \`blue-200\`, \`#1d4ed8\`) goes through \`resolve-color(value, attrs: attrs)\`, which returns the same \`(fill, border, icon)\`, adapted to the theme. A name is from the Tailwind palette (slate, gray, zinc, neutral, stone, red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose), with an optional shade (\`blue-200\`); a hex color is used as given on light themes and toned down on dark ones.

### Feels: the three looks

\`feel\` is one of three, chosen per document, and a component must follow it:

- \`formal\` (the default): square and official. Every radius is 0, tables are ruled, the header is a plain ruled line, fonts are New Computer Modern and XB Niloofar.
- \`standard\`: slightly rounded (box 6pt, alert 8pt, badge 4pt, code 6pt, image 6pt), lined tables, Inter and IRANSansX.
- \`friendly\`: very rounded (box 14pt, alert 16pt, badge 9pt, code 14pt, image 16pt, frame 24pt), card tables, Lexend and Pelak.

The radii are in \`feel.<kind>\` and already scaled by \`zoom\`: \`box\`, \`alert\`, \`badge\`, \`code\`, \`inline\`, \`image\`, \`theorem\`, \`frame\`, \`band\`, \`heading\`. Take the one of the same kind: a card is \`feel.box\` (a notice, \`feel.alert\`), a pill \`feel.badge\`, a picture \`feel.image\`. \`feel.table\`, \`feel.header\` and \`feel.steps\` are style names (strings), \`feel.latin\` and \`feel.persian\` the fonts: do not set a font, the text inherits it.

### Direction, page and scale

- The text direction is per document (\`doc-dir\`: auto, rtl or ltr) and per block: \`content-dir(body)\` gives the direction of a piece of text. Order the parts of a component by it (an icon before the text, whatever side that is) and align with \`start\` / \`end\`, not \`left\` / \`right\`; a drawing is not mirrored, so keep it symmetric or make it direction-free.
- \`is-phone\` is true on a narrow page (about 110 mm), and \`column-count\` is the number of text columns: \`width: 100%\` is the width of the column, so a fixed width wider than that overflows.
- \`zoom\` is the scale of the whole document (1 at 100%); a size is \`8pt * zoom\` or in \`em\`.`,
  },
  {
    min: "standard",
    text: `### What the engine gives a component

\`#import "/src/kit.typ": *\` is the whole public API. Use only these:

- \`parse-length(value, attrs: attrs)\`: a length attribute (\`"12pt"\`, \`"1em"\`, \`"5mm"\`) to a Typst length; \`resolve-color(value, attrs: attrs)\`: a color preset name or hex to \`(fill, border, icon)\`; \`tinted(color)\`, \`panel(...)\`: tinted and panel colors.
- \`root-path(path)\`: a project-relative path (an image, a data file) to a path Typst can read; \`plain-text(body)\`: the text of a body; \`span-columns\`, \`flag-attr\`, \`pick-hue\`: helpers for columns, bool attributes and hues.

A component draws with plain Typst (\`block\`, \`box\`, \`text\`, \`grid\`, ...). The text direction follows the document: do not set it unless the tag is about direction.`,
  },
  {
    min: "standard",
    text: `### Errors

Report a mistake in the document with an \`assert\` whose message starts with \`at-of(attrs)\`, so it carries the line of the tag:

\`\`\`typst
note: (attrs, body) => {
  assert("kind" not in attrs or attrs.kind in ("tip", "warning"), message: at-of(attrs) + "<note>: kind must be tip or warning")
  // ...
}
\`\`\`

Give the shared helpers \`attrs: attrs\` too (\`parse-length(v, attrs: attrs)\`), so their messages carry the line. The app shows an error from a component **twice**: on the line of the tag in the Markdown file, and on the line of the code in the component's own \`.typ\` file. A tag with a schema also has its attributes checked before the code runs.`,
  },
  {
    min: "full",
    text: `### A complete file

${EXAMPLE}

Declare it, then use the tags in the Markdown:

\`\`\`toml
# config.toml
components = ["notes.typ"]
\`\`\`

\`\`\`markdown
<note>Check the totals.</note> The release is <stamp size="0.9em">new</stamp>.
\`\`\`

### Mistakes to avoid

- Forgetting to list the file in \`components\`: the tag is then plain text.
- A tag name that is already built in, or defined in two files.
- Reading an attribute as a number: attributes are strings; convert them (\`float(attrs.at("n"))\`, \`parse-length\`).
- A fixed color or a fixed size (\`red\`, \`12pt\`) instead of \`theme\`, \`zoom\` and \`em\`.
- A schema \`kind\` that does not match how the tag is used (a \`block\` tag inside a line of text).
- Importing anything but \`/src/kit.typ\` from the engine: other files are not a stable API.`,
  },
]

const FA: Block[] = [
  {
    min: "minimal",
    text: `## ساختن کامپوننت دلخواه

کامپوننت یک **فایل Typst در پروژه** است. به سند تگ تازه می‌دهد (\`<note>\`، \`<stamp>\`) که در فایل Markdown مثل تگ‌های آماده نوشته می‌شود. فقط وقتی بسازید که Markdown ساده و تگ‌های آماده کافی نیست.

- یک فایل می‌تواند **هر تعداد تگ** داشته باشد، مرتبط یا نامرتبط. **نام فایل مهم نیست** و یک پروژه می‌تواند هر تعداد فایل داشته باشد، **هر جای** پروژه.
- فایل‌ها را مثل ایمپورت در تنظیم \`components\` بنویسید: در \`config.toml\` (برای همهٔ سندها) یا در front matter یک سند: \`components = ["extras/notes.typ", "stamps.typ"]\`. مسیرها نسبت به پوشهٔ پروژه‌اند. front matter به \`config.toml\` افزوده می‌شود.
- نام تگ حرف کوچک، رقم و \`-\` است و با حرف شروع می‌شود. نباید تگ آماده (\`alert\`، \`box\`، ...) یا تگ فایل دیگر باشد: خطا می‌دهد.`,
  },
  {
    min: "minimal",
    text: `### فایل چه چیزهایی تعریف می‌کند

- \`<x>-tags\` (**الزامی**): دیکشنری \`نام-تگ: (attrs, body) => content\`. \`attrs\` ویژگی‌هایی است که روی تگ نوشته شده، **همه رشته**، با \`attrs.at("size", default: "1em")\` خوانده می‌شود. \`body\` آنچه بین تگ بازکننده و بسته‌کننده است.
- \`<x>-schema\` (اختیاری): تگ‌ها را به‌نام تگ توصیف می‌کند. با آن اپ تگ و ویژگی‌هایش را تکمیل می‌کند و موتور آن‌ها را بررسی می‌کند؛ بدون آن تگ باز کار می‌کند و ویژگی‌ها بررسی نمی‌شوند.
- \`<x>-docs\` (اختیاری): تگ‌ها برای چیست و یک مثال، به فارسی و انگلیسی.

\`<x>\` هر برچسبی است (\`note\`، \`my-tags\`)؛ schema و docs با **نام تگ** به تگ وصل می‌شوند، نه با \`<x>\` و نه با فایل.`,
  },
  {
    min: "minimal",
    text: `### Typst، جاوااسکریپت یا پایتون نیست

تقریباً هر خطای کامپایل در فایل کامپوننت یکی از این‌هاست. پیش از پایان بررسی‌شان کنید:

- **رشته فقط با گیومهٔ دوتایی نوشته می‌شود.** \`'text'\` در Typst وجود ندارد (خطا: «the character \`'\` is not valid in code» و معمولاً ده‌ها خطای پشت‌سرش). رشته‌ای که گیومه دارد آن‌ها را escape می‌کند: \`"<coffee level=\\"75\\">x</coffee>"\`؛ یا به‌شکل بلوک raw می‌نویسد: \`\` \`<coffee level="75">x</coffee>\`.text \`\` (برای چند خط: \`\`\`\`\`md ... \`\`\`\`\`.text). بیشترین اشتباه همین‌جاست: \`example:\` در \`<x>-docs\` همیشه تگ با ویژگی‌های گیومه‌دار دارد؛ پس بنویسید \`example: (en: "<coffee level=\\"75\\">Latte</coffee>", fa: "...")\` و هرگز \`'...'\`.
- **کد و محتوا دو حالت‌اند.** داخل \`( )\` و \`{ }\` در حالت کد هستید: \`let x = 1\`، بدون \`#\`. داخل \`[ ]\` در حالت محتوا هستید: کد آن‌جا \`#\` می‌خواهد (\`#let\`، \`#if\`، \`#place(...)\`). در کد \`#\` نگذارید و در \`[ ]\` از قلم نیندازید. تصویر را در بلوک \`{ }\` بسازید و \`[ ]\` را برای متن نگه دارید.
- **کد فقط ASCII می‌گیرد.** رقم فارسی (۷۵)، \`٪\`، گیومهٔ خمیده و حرف فارسی داخل رشته یا محتوا درست است (\`"۷۵٪"\`، \`[۷۵٪]\`) و در کد هرگز (\`level: ۷۵\` خطا می‌دهد).
- **\`75%\` بدون گیومه نسبت است و \`"75%"\` رشته.** ویژگی همیشه رشته است: \`float(attrs.at("level", default: "60").trim("%"))\`.
- **طول با واحد \`em\` را نمی‌شود با طول \`pt\` مقایسه یا جمع کرد** («cannot compare 1.8em with 3pt»): \`parse-length\` ممکن است \`em\` بدهد. تگ را \`(attrs, body) => context { ... }\` بنویسید و اول مطلقش کنید: \`parse-length(...).to-absolute()\`.
- **هر آرگومان مال چند تابع مشخص است** («unexpected argument: clip»). \`clip\` آرگومان \`block\` و \`box\` است، نه \`rect\`؛ شکل گوشه‌گرد بریده‌شده \`block(width: ..., height: ..., radius: ..., stroke: ..., fill: ..., clip: true, ...)\` است. اگر مطمئن نیستید تابعی آن آرگومان را می‌گیرد، به کار نبرید.
- **نام متغیر نباید نام تابع Typst باشد.** \`let h = ...\` تابع \`h()\` (فاصلهٔ افقی) را می‌پوشاند و \`h(6pt)\` بعدی خطای «expected function, found length» می‌دهد. همین‌طور \`v\`، و \`text\`، \`box\`، \`block\`، \`grid\`، \`rect\`، \`line\`، \`align\`، \`image\`، \`link\`، \`par\`، \`content\`، \`str\`، \`type\`، \`numbering\`، \`counter\` (\`w\` امن است). نام توصیفی بگذارید (\`cup-height\`، \`bar-width\`)، نه یک حرف که نام تابع هم هست.
- **آرایهٔ تک‌عضوی ویرگول می‌خواهد** \`(x,)\`؛ دیکشنری خالی \`(:)\` است.
- یک نویسهٔ اشتباه می‌تواند ده‌ها خطا بدهد: اولین خطا را درست کنید و دوباره کامپایل کنید.`,
  },
  {
    min: "minimal",
    text: `### ظاهر را سند تعیین می‌کند

کامپوننت روی صفحه‌ای کشیده می‌شود که نویسنده انتخاب کرده: یکی از هشت تم (روشن یا تیره، یا تم خودش)، یکی از سه «حالت کلی»، هر مقیاس، هر دو جهت متن، صفحهٔ باریک موبایل یا چند ستون. پس **هرگز رنگ، شعاع گوشه، فونت، اندازه یا \`left\` / \`right\` ثابت ننویسید**. از سند بگیرید:

- **رنگ** از \`theme\`. زمینه‌ای که متن رویش می‌نشیند «تینت» است، با \`tinted(...)\` یا \`resolve-color(...)\`، و متن رویش همان \`theme.fg\` می‌ماند. رنگ قوی برای خط، آیکون و نشانه است، نه پس‌زمینهٔ زیر متن.
- **شعاع گوشه** از \`feel\` (\`feel.box\`، \`feel.badge\`، ...)، **اندازه** به‌شکل \`N * zoom\` یا \`em\`.
- **ترتیب و سمت‌ها** از جهت متن (\`start\` / \`end\`، \`content-dir(body)\`)، **عرض** به‌شکل \`100%\` یا \`em\`، نه عرض ثابت.`,
  },
  {
    min: "compact",
    text: `### schema

\`<x>-schema\` دیکشنری \`"نام-تگ": (kind, description, attrs, ...)\` است:

- \`kind\`: \`"inline"\` (درون خط)، \`"block"\` (بلوک مستقل) یا \`"void"\` (خودبسته، بدون بدنه، مثل \`<v />\`).
- \`description\`: \`(en: "...", fa: "...")\`.
- \`attrs\`: \`"name": (type, default, required, values, doc)\`. \`type\` یکی از \`string\`، \`number\`، \`int\`، \`bool\`، \`length\`، \`color\`، \`path\` یا \`enum\` است (enum فهرست \`values\` دارد). \`doc\` به‌شکل \`(en: ..., fa: ...)\` است. موتور مقدار enum بیرون از \`values\`، bool یا int یا number نادرست و ویژگی الزامی گم‌شده را رد می‌کند.
- اختیاری: \`children\` (تگ‌هایی که می‌تواند داشته باشد)، \`scoped: true\` (فقط داخل تگ والد)، \`display\` (املای تگ وقتی حرف بزرگ دارد).

### docs

\`<x>-docs\` به‌شکل \`(en: (about: "..."), fa: (about: "..."), example: (en: "...", fa: "..."))\` است. \`about\` Markdown است (برای جزئیات \`more:\` بیفزایید)؛ \`example\` همان است که سند می‌نویسد.`,
  },
  {
    min: "standard",
    text: `### رنگ‌ها: هر کدام برای چیست

\`theme\` دیکشنری رنگ‌های Typst است که در هر تم فرق دارد (روشن: paper، sepia، ocean، sage؛ تیره: midnight، nord، zinc، dracula؛ و \`[themes.x]\` خود پروژه)؛ \`theme.dark\` می‌گوید کدام نوع است.

- \`bg\` صفحه. \`fg\` متن اصلی و متن روی هر زمینهٔ روشن. \`heading\` تیترها. \`muted\` متن فرعی: زیرنویس، برچسب، راهنما.
- \`accent\` آنچه باید دیده شود: لینک، نشانه، نوار، آیکون، حاشیهٔ نازک. \`secondary\` سایه‌های ملایم پس‌زمینه: ردیف سرتیتر جدول، هایلایت (در همهٔ تم‌ها با \`accent\` یکی است جز zinc که خاکستری است).
- \`rule\` خط و حاشیهٔ نازک. \`code-bg\` و \`code-stroke\` پر و دور کادر کد.

**اشتباهی که کامپوننت را ناخوانا می‌کند:** \`accent\` (یا هر رنگ قوی) به‌عنوان زمینه و رویش متن هم‌رنگ یا تیره، مثل متن سبز روی کارت سبز. \`accent\` رنگ متن، خط و آیکون است، نه پس‌زمینه‌ای که رویش بنویسید. پنل رنگی یک **تینت** است:

\`\`\`typst
let tone = tinted(theme.accent)   // یا tinted(color-presets.at("green"))
block(fill: tone.fill, stroke: 0.6pt * zoom + tone.border, radius: feel.box, inset: 8pt * zoom, text(fill: theme.fg, body))
\`\`\`

\`tinted(hue)\` مقدار \`(fill, border, icon)\` برمی‌گرداند: \`fill\` رنگ را ۱۰٪ (در تم تیره ۱۶٪) با \`bg\` مخلوط می‌کند، پس کم‌رنگ است و \`theme.fg\` رویش خوانا می‌ماند؛ \`border\` مخلوط قوی‌تر است؛ \`icon\` رنگ جابه‌جاشده تا روی آن زمینه دیده شود: برای آیکون، عدد و نشانه، نه برای پاراگراف. موتور رنگ «متن روی accent» ندارد، پس زمینهٔ توپُر قوی زیر متن ممکن نیست: تینت بگیرید.

رنگی که نویسنده با ویژگی می‌دهد (\`green\`، \`blue-200\`، \`#1d4ed8\`) از \`resolve-color(value, attrs: attrs)\` رد می‌شود که همان \`(fill, border, icon)\` را، سازگار با تم، می‌دهد. نام از پالت Tailwind است (slate، gray، zinc، neutral، stone، red، orange، amber، yellow، lime، green، emerald، teal، cyan، sky، blue، indigo، violet، purple، fuchsia، pink، rose) با سایهٔ اختیاری (\`blue-200\`)؛ رنگ hex در تم روشن همان‌طور که هست و در تم تیره ملایم‌تر به کار می‌رود.

### حالت‌های کلی: سه ظاهر

\`feel\` یکی از سه است، برای هر سند انتخاب می‌شود، و کامپوننت باید از آن پیروی کند:

- \`formal\` (پیش‌فرض): تیز و رسمی. همهٔ شعاع‌ها ۰، جدول‌ها خط‌دار، هدر یک خط ساده، فونت‌ها New Computer Modern و XB Niloofar.
- \`standard\`: کمی گرد (box ‏۶pt، alert ‏۸pt، badge ‏۴pt، code ‏۶pt، image ‏۶pt)، جدول «lined»، فونت‌های Inter و IRANSansX.
- \`friendly\`: بسیار گرد (box ‏۱۴pt، alert ‏۱۶pt، badge ‏۹pt، code ‏۱۴pt، image ‏۱۶pt، frame ‏۲۴pt)، جدول «card»، فونت‌های Lexend و Pelak.

شعاع‌ها در \`feel.<kind>\` هستند و از پیش در \`zoom\` ضرب شده‌اند: \`box\`، \`alert\`، \`badge\`، \`code\`، \`inline\`، \`image\`، \`theorem\`، \`frame\`، \`band\`، \`heading\`. همنوع را بگیرید: کارت \`feel.box\` (اعلان \`feel.alert\`)، قرص \`feel.badge\`، تصویر \`feel.image\`. \`feel.table\`، \`feel.header\` و \`feel.steps\` نام سبک (رشته) هستند و \`feel.latin\` و \`feel.persian\` فونت‌ها: فونت تعیین نکنید، متن آن را به ارث می‌برد.

### جهت، صفحه و مقیاس

- جهت متن برای هر سند (\`doc-dir\`: auto، rtl یا ltr) و برای هر بلوک است: \`content-dir(body)\` جهت یک تکه متن را می‌دهد. اجزای کامپوننت را بر اساس آن مرتب کنید (آیکون پیش از متن، هر سمتی که باشد) و با \`start\` / \`end\` تراز کنید، نه \`left\` / \`right\`؛ نقاشی آینه نمی‌شود، پس متقارن نگهش دارید یا مستقل از جهتش کنید.
- \`is-phone\` در صفحهٔ باریک (حدود ۱۱۰ میلی‌متر) درست است و \`column-count\` تعداد ستون‌های متن؛ \`width: 100%\` عرض ستون است، پس عرض ثابت بزرگ‌تر از آن بیرون می‌زند.
- \`zoom\` مقیاس کل سند است (۱ در ۱۰۰٪)؛ اندازه \`8pt * zoom\` یا با \`em\` نوشته می‌شود.`,
  },
  {
    min: "standard",
    text: `### موتور چه چیزی به کامپوننت می‌دهد

\`#import "/src/kit.typ": *\` کل API عمومی است. فقط از این‌ها استفاده کنید:

- \`parse-length(value, attrs: attrs)\`: ویژگی طول (\`"12pt"\`، \`"1em"\`، \`"5mm"\`) را به طول Typst می‌برد؛ \`resolve-color(value, attrs: attrs)\`: نام رنگ آماده یا hex را به \`(fill, border, icon)\` می‌برد؛ \`tinted(color)\` و \`panel(...)\`: رنگ‌های ملایم و پنل.
- \`root-path(path)\`: مسیر نسبت به پروژه (تصویر، فایل داده) را به مسیری می‌برد که Typst بخواند؛ \`plain-text(body)\`: متن یک بدنه؛ \`span-columns\`، \`flag-attr\`، \`pick-hue\`: کمک‌کننده برای ستون، ویژگی bool و رنگ‌مایه.

کامپوننت با Typst ساده می‌کشد (\`block\`، \`box\`، \`text\`، \`grid\`، ...). جهت متن از سند می‌آید؛ مگر تگ دربارهٔ جهت باشد آن را تعیین نکنید.`,
  },
  {
    min: "standard",
    text: `### خطاها

اشتباه در سند را با \`assert\` گزارش کنید که پیامش با \`at-of(attrs)\` شروع شود تا خطِ تگ را همراه داشته باشد:

\`\`\`typst
note: (attrs, body) => {
  assert("kind" not in attrs or attrs.kind in ("tip", "warning"), message: at-of(attrs) + "<note>: kind must be tip or warning")
  // ...
}
\`\`\`

به کمک‌کننده‌های مشترک هم \`attrs: attrs\` بدهید (\`parse-length(v, attrs: attrs)\`) تا پیامشان خط را داشته باشد. اپ خطای کامپوننت را **دو بار** نشان می‌دهد: روی خط تگ در فایل Markdown و روی خط کد در فایل \`.typ\` خود کامپوننت. تگی که schema دارد پیش از اجرای کد ویژگی‌هایش هم بررسی می‌شود.`,
  },
  {
    min: "full",
    text: `### یک فایل کامل

${EXAMPLE}

آن را معرفی کنید و تگ‌ها را در Markdown بنویسید:

\`\`\`toml
# config.toml
components = ["notes.typ"]
\`\`\`

\`\`\`markdown
<note>جمع‌ها را بررسی کنید.</note> انتشار <stamp size="0.9em">جدید</stamp> است.
\`\`\`

### اشتباه‌هایی که باید از آن‌ها پرهیز کرد

- فراموش کردن نوشتن فایل در \`components\`: تگ آن‌وقت متن ساده می‌ماند.
- نام تگی که از پیش آماده است یا در دو فایل تعریف شده.
- خواندن ویژگی به‌شکل عدد: ویژگی‌ها رشته‌اند؛ تبدیلشان کنید (\`float(attrs.at("n"))\`، \`parse-length\`).
- رنگ یا اندازهٔ ثابت (\`red\`، \`12pt\`) به‌جای \`theme\`، \`zoom\` و \`em\`.
- \`kind\` در schema که با کاربرد تگ نمی‌خواند (تگ \`block\` درون یک خط متن).
- ایمپورت چیزی جز \`/src/kit.typ\` از موتور: فایل‌های دیگر API پایدار نیستند.`,
  },
]

/** The skill for building components: the blocks of the size asked for, in one language. */
export function buildingSkill(language: FixedLanguage, level: SkillLevel): string {
  const reach = ORDER.indexOf(level)
  const blocks = (language === "fa" ? FA : EN).filter((block) => ORDER.indexOf(block.min) <= reach)
  return blocks.map((block) => block.text).join("\n\n")
}
