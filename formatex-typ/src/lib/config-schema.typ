// The settings of config.toml and of the YAML front matter: what each key accepts. The same entry shape as the attributes of a
// component's `<name>-schema` and of option-schema.typ: (type, values?, default?, doc: (en, fa)); types: enum, bool, int, number,
// string, path, color. `values` on a non-enum type are suggestions, not a limit (a CSL style name, a font).
//
// Two documents share most keys, so they are written once:
//   shared-attrs / shared-tables   mean the same in config.toml (every document) and in front matter (one document)
//   config-only                    only config.toml
//   front-only                     only front matter (header, footer, cover, bibliography)
// `config-schemas` is what tools/export-schema.mjs writes under `config` in dist/tags.json, and what editors read for autocomplete.
// The code does not read this file: when a setting is added or changed in the engine, change it here too.
// Imports nothing, so any file can use it.
#let d(en, fa) = (en: en, fa: fa)

#let dir-values = ("auto", "rtl", "ltr")
#let color-doc = d(
  "A preset (\"purple\", \"blue\", \"teal\", \"green\", \"yellow\", \"red\", \"pink\") or a hex color (\"#1d4ed8\")",
  "نام یک رنگ آماده (\"purple\"، \"blue\"، \"teal\"، \"green\"، \"yellow\"، \"red\"، \"pink\") یا رنگ hex (\"#1d4ed8\")",
)

#let shared-attrs = (
  "theme": (type: "enum", values: ("paper", "sepia", "ocean", "sage", "midnight", "nord", "zinc", "dracula"), default: "paper", doc: d(
    "Color theme. Light: paper, sepia, ocean, sage. Dark: midnight, nord, zinc, dracula.",
    "پالت رنگی. روشن: paper، sepia، ocean، sage. تیره: midnight، nord، zinc، dracula.",
  )),
  "feel": (type: "enum", values: ("formal", "standard", "friendly"), default: "formal", doc: d(
    "Overall feel: corner rounding and the default fonts. formal: square, official. standard: slightly rounded. friendly: very rounded.",
    "حالت کلی: گردی گوشه‌ها و فونت‌های پیش‌فرض. formal: گوشهٔ تیز و رسمی. standard: کمی گرد. friendly: بسیار گرد و صمیمی.",
  )),
  "page": (type: "enum", values: ("a4", "mobile"), default: "a4", doc: d(
    "Page size: a4 for print, mobile (110 × 245 mm, small margins) for phones.",
    "اندازهٔ صفحه: a4 برای چاپ، mobile (۱۱۰ × ۲۴۵ میلی‌متر با حاشیهٔ کم) برای موبایل.",
  )),
  "margin": (type: "enum", values: ("narrow", "normal", "wide"), default: "normal", doc: d(
    "Page margins on A4: narrow (15 mm sides), normal (about 25 mm), wide (35 mm). Ignored on the mobile page.",
    "حاشیهٔ صفحه در A4: narrow (۱۵ میلی‌متر)، normal (حدود ۲۵)، wide (۳۵). در صفحهٔ mobile نادیده گرفته می‌شود.",
  )),
  "scale": (type: "int", default: "100", doc: d(
    "Size of everything on the page in percent (text, headings, code, tables, paddings). 90 fits more on a page, 115 prints larger.",
    "اندازهٔ همهٔ چیزهای صفحه به درصد (متن، تیتر، کد، جدول، فاصله‌ها). ۹۰ جای بیشتر، ۱۱۵ چاپ درشت‌تر.",
  )),
  "dir": (type: "enum", values: dir-values, default: "auto", doc: d(
    "Text direction. auto: each paragraph follows its own first letter. rtl / ltr force it on everything (code stays left-to-right).",
    "جهت متن. auto: هر پاراگراف از اولین حرفش. rtl / ltr جهت را روی همه اعمال می‌کند (کدها چپ‌به‌راست می‌مانند).",
  )),
  "columns": (type: "int", default: "1", doc: d(
    "Number of text columns. The cover stays one column, <docheader> spans all columns, the mobile page always uses one.",
    "تعداد ستون‌های متن. جلد یک‌ستونه می‌ماند، <docheader> روی همهٔ ستون‌ها می‌افتد، صفحهٔ mobile همیشه یک ستون دارد.",
  )),
  "column-dir": (type: "enum", values: dir-values, default: "auto", doc: d(
    "Which column fills first: rtl = right first, ltr = left first, auto = Typst decides.",
    "کدام ستون اول پر شود: rtl = راست، ltr = چپ، auto = به تشخیص Typst.",
  )),
  "todo": (type: "enum", values: ("show", "hide"), default: "show", doc: d(
    "Draft notes: hide removes every <todo> and the <todos> list (the final version).",
    "یادداشت‌های پیش‌نویس: hide همهٔ <todo> و فهرست <todos> را برمی‌دارد (نسخهٔ نهایی).",
  )),
  "answers": (type: "enum", values: ("show", "hide", "end"), default: "show", doc: d(
    "Answers of <exercise>: show (under each question), hide (question sheet) or end (collected under <answers>).",
    "پاسخ‌های <exercise>: show (زیر هر پرسش)، hide (برگهٔ پرسش) یا end (جمع‌شده زیر <answers>).",
  )),
)

#let shared-tables = (
  "font": (
    doc: d("Fonts (any installed or imported font). They override the feel's fonts; leave a key out to use them.", "فونت‌ها (هر فونت نصب‌شده یا واردشده). فونت‌های حالت کلی را بازنویسی می‌کنند؛ کلید را نگذارید تا فونت پیش‌فرض بماند."),
    attrs: (
      "latin": (type: "string", doc: d("Font for English text. Default: the feel's font.", "فونت متن انگلیسی. پیش‌فرض: فونت حالت کلی.")),
      "persian": (type: "string", doc: d("Font for Persian text. Default: the feel's font.", "فونت متن فارسی. پیش‌فرض: فونت حالت کلی.")),
      "code": (type: "string", default: "Anonymous Pro", doc: d("Font for code blocks and inline code.", "فونت بلوک‌های کد و کد درون‌خطی.")),
    ),
  ),
  "paragraph": (
    doc: d("Body text spacing and alignment. Code blocks keep their own spacing.", "فاصله‌گذاری و تراز متن. بلوک‌های کد فاصله‌گذاری خودشان را دارند."),
    attrs: (
      "justify": (type: "bool", default: "false", doc: d("Both edges of every line flush with the margins (true) or ragged on the end side (false).", "هر دو لبهٔ هر خط به حاشیه بچسبد (true) یا لبهٔ پایانی ناتراز باشد (false).")),
      "letter-spacing": (type: "number", default: "0", doc: d("Extra space between letters in percent of the font size: 0 normal, 2 looser, -2 tighter.", "فاصلهٔ اضافهٔ حروف به درصد اندازهٔ فونت: ۰ عادی، ۲ بازتر، ۲- فشرده‌تر.")),
      "line-spacing": (type: "number", default: "100", doc: d("Gap between the lines of a paragraph in percent of the normal gap: 100 normal, 150 airier, 80 tighter.", "فاصلهٔ خطوط یک پاراگراف به درصد فاصلهٔ عادی: ۱۰۰ عادی، ۱۵۰ بازتر، ۸۰ فشرده‌تر.")),
      "word-spacing": (type: "number", default: "100", doc: d("Space between words in percent of the font's normal space.", "فاصلهٔ کلمات به درصد فاصلهٔ عادی فونت.")),
    ),
  ),
  "heading": (
    doc: d("Look of the headings. Every key can be overridden for one heading with a {...} line.", "ظاهر تیترها. هر کلید را می‌توان برای یک تیتر با خط {...} بازنویسی کرد."),
    attrs: (
      "numbering": (type: "bool", default: "true", doc: d("Automatic heading numbering.", "شماره‌گذاری خودکار تیترها.")),
      "number-prefix": (type: "string", default: "", doc: d("Text right before the number: \"(\" with number-suffix \")\" gives «(۱) مقدمه».", "متن بلافاصله قبل از شماره: \"(\" همراه number-suffix \")\" می‌شود «(۱) مقدمه».")),
      "number-suffix": (type: "string", default: "", doc: d("Text right after the number: \"\" → «۱ مقدمه», \".\" → «۱. مقدمه», \" -\" → «۱ - مقدمه».", "متن بلافاصله بعد از شماره: \"\" → «۱ مقدمه»، \".\" → «۱. مقدمه»، \" -\" → «۱ - مقدمه».")),
      "underline": (type: "bool", default: "false", doc: d("A rule below the heading.", "خط زیر تیتر.")),
      "fill": (type: "bool", default: "false", doc: d("A tinted background behind the heading.", "ته‌رنگ پشت تیتر.")),
      "max-level": (type: "int", default: "2", doc: d("Deepest level that gets this look: 1 = only #, 2 = # and ##, ...", "عمیق‌ترین سطحی که این ظاهر را می‌گیرد: ۱ = فقط #، ۲ = # و ## و ...")),
      "color": (type: "color", default: "", doc: color-doc),
    ),
  ),
  "table": (
    doc: d("Default options for every table. A {width=auto align=left} line right above a table overrides them.", "گزینه‌های پیش‌فرض همهٔ جدول‌ها. یک خط {width=auto align=left} درست بالای جدول آن‌ها را بازنویسی می‌کند."),
    attrs: (
      "width": (type: "enum", values: ("auto", "full"), default: "auto", doc: d("full = the full text width, auto = as wide as the content.", "full = تمام پهنای متن، auto = به پهنای محتوا.")),
      "align": (type: "enum", values: ("center", "left", "right", "start", "end"), default: "center", doc: d("Where an auto-width table sits.", "جای جدولی که پهنایش auto است.")),
      "span": (type: "enum", values: ("column", "all"), default: "column", doc: d("With columns > 1: column stays in its column, all floats across all columns.", "با columns بیشتر از ۱: column در ستون خودش می‌ماند، all روی همهٔ ستون‌ها می‌افتد.")),
    ),
  ),
  "list": (
    doc: d("Default look of lists. A {numbers=abjad ...} line above a list overrides it for that list.", "ظاهر پیش‌فرض لیست‌ها. یک خط {numbers=abjad ...} بالای لیست آن را برای همان لیست بازنویسی می‌کند."),
    attrs: (
      "numbers": (type: "enum", values: ("auto", "fa", "en", "fatxt", "rome", "abc", "abjad", "alefba"), default: "auto", doc: d("Numbers of numbered lists: auto (by the list's language), fa ۱ ۲ ۳, en 1 2 3, fatxt یک دو سه, rome I II III, abc a b c, abjad الف ب ج د, alefba الف ب پ ت.", "شمارهٔ لیست‌های مرتب: auto (از زبان لیست)، fa ۱ ۲ ۳، en 1 2 3، fatxt یک دو سه، rome I II III، abc a b c، abjad الف ب ج د، alefba الف ب پ ت.")),
      "prefix": (type: "string", default: "", doc: d("Text right before the number: \"(\" with suffix \")\" gives «(۱)».", "متن بلافاصله قبل از شماره: \"(\" با پسوند \")\" می‌شود «(۱)».")),
      "suffix": (type: "string", default: ".", doc: d("Text right after the number: \".\" → «۱.», \")\" → «۱)», \"\" → «۱».", "متن بلافاصله بعد از شماره: \".\" → «۱.»، \")\" → «۱)»، \"\" → «۱».")),
      "marker": (type: "string", values: ("disc", "circle", "square", "dash", "triangle", "arrow", "check", "star", "none"), doc: d("Bullet of unnumbered lists: a character or a name; comma-separated for one per nesting level (\"disc,circle,dash\").", "نشانهٔ لیست بی‌شماره: یک نویسه یا نام؛ با ویرگول برای هر سطح تو در تو (\"disc,circle,dash\").")),
      "indent": (type: "string", doc: d("Extra indent of every list, e.g. \"1.5em\" or \"5mm\".", "تورفتگی اضافهٔ همهٔ لیست‌ها، مثلاً \"1.5em\" یا \"5mm\".")),
    ),
  ),
  "chat": (
    doc: d("AI chat transcripts: <chat> with <user> and <ai> messages. Every key can be overridden on one <chat> tag.", "گفتگوهای هوش مصنوعی: <chat> با پیام‌های <user> و <ai>. هر کلید را می‌توان روی یک تگ <chat> بازنویسی کرد."),
    attrs: (
      "style": (type: "enum", values: ("auto", "transcript", "assistant", "bubbles"), default: "auto", doc: d("Look: auto (from the feel), transcript (named turns with a bar), assistant (ChatGPT-like), bubbles (messenger).", "ظاهر: auto (از حالت کلی)، transcript (نوبت‌های نام‌دار با نوار)، assistant (شبیه ChatGPT)، bubbles (پیام‌رسان).")),
      "user-name": (type: "string", default: "", doc: d("Name over the user's messages; empty = «شما» / \"You\".", "نام بالای پیام‌های کاربر؛ خالی = «شما» / \"You\".")),
      "ai-name": (type: "string", default: "", doc: d("Name over the AI's messages; empty = «هوش مصنوعی» / \"AI\".", "نام بالای پیام‌های هوش مصنوعی؛ خالی = «هوش مصنوعی» / \"AI\".")),
      "user-icon": (type: "string", default: "user", doc: d("Avatar icon of the user (a Font Awesome name).", "آیکون کاربر (نام Font Awesome).")),
      "ai-icon": (type: "string", default: "robot", doc: d("Avatar icon of the AI (a Font Awesome name).", "آیکون هوش مصنوعی (نام Font Awesome).")),
      "user-color": (type: "color", default: "", doc: color-doc),
      "ai-color": (type: "color", default: "", doc: color-doc),
      "frame": (type: "bool", default: "true", doc: d("A frame around the whole chat.", "قاب دور کل گفتگو.")),
      "width": (type: "string", default: "80%", doc: d("Widest a bubble gets: a percent of the line or a length (\"12cm\").", "پهن‌ترین اندازهٔ یک حباب: درصدی از خط یا یک طول (\"12cm\").")),
    ),
  ),
  "equation": (
    doc: d("Display equations ($$ ... $$).", "معادله‌های نمایشی ($$ ... $$)."),
    attrs: (
      "numbering": (type: "enum", values: ("labelled", "all", "none"), default: "labelled", doc: d("labelled: only equations followed by {#id} get a number; all: every one; none: never.", "labelled: فقط معادله‌هایی که {#id} دارند شماره می‌گیرند؛ all: همه؛ none: هیچ‌کدام.")),
    ),
  ),
)

#let config-only = (
  attrs: (
    "source": (type: "path", default: "docs/doc_en.md", doc: d("The Markdown file that main.typ compiles (path relative to the project). A build option can override it.", "فایل Markdown که main.typ کامپایل می‌کند (مسیر نسبت به پروژه). گزینهٔ ساخت می‌تواند آن را بازنویسی کند.")),
  ),
  tables: (:),
)

#let header-footer-keys = (
  "start": (type: "string", doc: d("Text on the start side (the right in RTL). Placeholders: {page}, {pages}, {section}, {section-number}.", "متن سمت شروع (راست در RTL). جانشین‌ها: {page}، {pages}، {section}، {section-number}.")),
  "center": (type: "string", doc: d("Text in the middle. The same placeholders.", "متن وسط. همان جانشین‌ها.")),
  "end": (type: "string", doc: d("Text on the end side. The same placeholders.", "متن سمت پایان. همان جانشین‌ها.")),
  "dir": (type: "enum", values: dir-values, default: "auto", doc: d("Direction of the texts: the document's dir, else from the text.", "جهت متن‌ها: جهت سند، وگرنه از خود متن.")),
  "digits": (type: "enum", values: ("fa", "en", "auto"), default: "auto", doc: d("Kind of digits of page numbers: fa Persian, en Latin, auto (Persian when the text is RTL).", "نوع ارقام شمارهٔ صفحه: fa فارسی، en لاتین، auto (فارسی وقتی متن راست‌به‌چپ است).")),
  "skip-first-page": (type: "bool", doc: d("Leave page 1 without it.", "صفحهٔ اول را بدون آن بگذارید.")),
  "enabled": (type: "bool", default: "true", doc: d("false keeps the settings but hides it.", "false تنظیمات را نگه می‌دارد ولی آن را پنهان می‌کند.")),
)

#let front-only = (
  attrs: (:),
  tables: (
    "header": (
      doc: d("The page header of this document.", "سرصفحهٔ این سند."),
      attrs: header-footer-keys + (
        "style": (type: "enum", values: ("minimal", "line", "band", "double"), default: "line", doc: d("minimal: text only. line: text with a rule below. band: shaded strip. double: accent bar above, rule below. The formal feel always uses line.", "minimal: فقط متن. line: متن با خط زیر. band: نوار سایه‌دار. double: نوار رنگی بالا و خط پایین. حالت formal همیشه line است.")),
        "skip-first-page": (type: "bool", default: "true", doc: d("No header on page 1.", "صفحهٔ اول سرصفحه ندارد.")),
        "logo": (type: "path", doc: d("An image shown before the start text.", "تصویری که قبل از متن شروع نشان داده می‌شود.")),
      ),
    ),
    "footer": (
      doc: d("The page footer of this document. Without it each page shows a plain page number at the bottom centre.", "پاصفحهٔ این سند. بدون آن هر صفحه فقط شمارهٔ صفحه را در وسط پایین دارد."),
      attrs: header-footer-keys + (
        "style": (type: "enum", values: ("plain", "line"), default: "plain", doc: d("plain, or line (a rule above).", "plain، یا line (خط بالا).")),
        "skip-first-page": (type: "bool", default: "false", doc: d("No footer on page 1.", "صفحهٔ اول پاصفحه ندارد.")),
      ),
    ),
    "cover": (
      doc: d("The cover page. It is its own page with no header and no page number.", "صفحهٔ جلد. صفحهٔ جداگانه‌ای است بدون سرصفحه و شمارهٔ صفحه."),
      attrs: (
        "logo": (type: "path", doc: d("A logo image.", "تصویر لوگو.")),
        "institution": (type: "string", doc: d("Name of the university or institution.", "نام دانشگاه یا مؤسسه.")),
        "faculty": (type: "string", doc: d("Name of the faculty.", "نام دانشکده.")),
        "department": (type: "string", doc: d("Name of the department.", "نام گروه.")),
        "type": (type: "string", doc: d("Kind of document, e.g. «پایان‌نامه کارشناسی ارشد».", "نوع سند، مثلاً «پایان‌نامه کارشناسی ارشد».")),
        "title": (type: "string", doc: d("The title.", "عنوان.")),
        "subtitle": (type: "string", doc: d("The subtitle.", "زیرعنوان.")),
        "author": (type: "string", doc: d("The author, or a list [\"A\", \"B\"], one per line.", "نویسنده، یا فهرست [\"A\", \"B\"] که هر کدام در یک خط می‌آید.")),
        "supervisor": (type: "string", doc: d("The supervisor.", "استاد راهنما.")),
        "advisor": (type: "string", doc: d("The advisor.", "استاد مشاور.")),
        "date": (type: "string", doc: d("The date, written as you want it shown.", "تاریخ، همان‌طور که می‌خواهید نشان داده شود.")),
        "frame": (type: "bool", default: "true", doc: d("A border around the page.", "قاب دور صفحه.")),
        "dir": (type: "enum", values: dir-values, default: "auto", doc: d("Direction of the cover: the document's dir, else from the title and institution.", "جهت جلد: جهت سند، وگرنه از عنوان و نام مؤسسه.")),
        "enabled": (type: "bool", default: "true", doc: d("false keeps the settings but hides the cover.", "false تنظیمات را نگه می‌دارد ولی جلد را پنهان می‌کند.")),
      ),
    ),
    "bibliography": (
      doc: d("The bibliography of this document (the file, the citation style and the title).", "منابع این سند (فایل، سبک ارجاع و عنوان)."),
      attrs: (
        "file": (type: "path", default: "references.bib", doc: d("The .bib file.", "فایل .bib.")),
        "style": (type: "string", values: ("ieee", "apa", "chicago-author-date", "harvard-cite-them-right", "mla", "vancouver", "nature", "ieee"), default: "ieee", doc: d("Any Typst / CSL style name.", "نام هر سبک Typst / CSL.")),
        "title": (type: "string", default: "منابع", doc: d("The title of the section.", "عنوان بخش.")),
        "dir": (type: "enum", values: dir-values, default: "auto", doc: d("auto: each entry follows its own language; ltr / rtl force it.", "auto: هر مورد از زبان خودش؛ ltr / rtl اجبار می‌کند.")),
      ),
    ),
  ),
)

#let config-schemas = (
  // config.toml: every document of the project
  "config": (
    attrs: config-only.attrs + shared-attrs,
    tables: config-only.tables + shared-tables,
  ),
  // the YAML front matter at the top of a Markdown file: one document; it can override anything of config.toml
  "front-matter": (
    attrs: front-only.attrs + shared-attrs,
    tables: front-only.tables + shared-tables,
  ),
)
