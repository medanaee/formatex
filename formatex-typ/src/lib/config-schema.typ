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
  "components": (type: "string", doc: d(
    "Your own components: Typst files of the project that define tags (a list [\"notes.typ\", \"extras/stamps.typ\"], or paths separated by commas). A file can define any number of tags and its name does not matter. In the front matter the files are added to those of config.toml.",
    "کامپوننت‌های خودتان: فایل‌های Typst پروژه که تگ تعریف می‌کنند (فهرست [\"notes.typ\", \"extras/stamps.typ\"] یا مسیرهای جداشده با ویرگول). یک فایل می‌تواند هر تعداد تگ تعریف کند و نامش مهم نیست. در front matter فایل‌ها به فایل‌های config.toml افزوده می‌شوند.",
  )),
  "vars": (type: "string", doc: d(
    "Values for the text, `name: value` lines: print one with {{ name }}, or use it in code: {{ if draft { \"Draft\" } else { \"Final\" } }}. The rules of a variable are in `var-types`.",
    "مقدارهایی برای متن، خط‌های `name: value`: با {{ name }} چاپ می‌شود، یا در کد می‌آید: {{ if draft { \"پیش‌نویس\" } else { \"نهایی\" } }}. قاعده‌های هر متغیر در `var-types` است.",
  )),
  "var-types": (type: "string", doc: d(
    "The rules of the variables of `vars`: a list is the values a variable may have (`audience: [student, teacher]`), `{ min: 1, max: 3 }` the range of a number, and a name its type: bool, number, length, color, markdown, json (a file or an object).",
    "قاعده‌های متغیرهای `vars`: فهرست مقدارهای مجاز یک متغیر است (`audience: [student, teacher]`)، `{ min: 1, max: 3 }` بازهٔ یک عدد، و یک نام نوعش: bool، number، length، color، markdown، json (یک فایل یا یک شیء).",
  )),
  "page": (type: "enum", values: ("desktop-a4", "desktop-a3", "desktop-a4-landscape", "desktop-a5", "desktop-a6", "desktop-b4", "desktop-b5", "desktop-letter", "desktop-legal", "desktop-tabloid", "desktop-square", "mobile-16-9", "mobile-18-9", "mobile-20-9", "mobile-21-9", "custom"), default: "desktop-a4", doc: d(
    "Page size. desktop-* are for print and screen (desktop-a4, desktop-a5, desktop-letter, ...); mobile-* are narrow pages for phones (110 mm wide, small margins, one column, no header center item). custom uses page-width and page-height; a custom page narrower than 120 mm gets the phone rules too. The old names a4 and mobile still work.",
    "اندازهٔ صفحه. desktop-* برای چاپ و صفحه‌نمایش (desktop-a4، desktop-a5، desktop-letter و ...)؛ mobile-* صفحهٔ باریک برای موبایل (عرض ۱۱۰ میلی‌متر، حاشیهٔ کم، تک‌ستونه، بدون آیتم میانی هدر). custom از page-width و page-height می‌گیرد؛ صفحهٔ دلخواه باریک‌تر از ۱۲۰ میلی‌متر هم قاعده‌های موبایل را می‌گیرد. نام‌های قدیمی a4 و mobile هنوز کار می‌کنند.",
  )),
  "page-width": (type: "length", default: "210mm", doc: d(
    "Width of a custom page (page = \"custom\"): a number with mm, cm, in or pt, such as 148mm. Between 40 mm and 5000 mm.",
    "عرض صفحهٔ دلخواه (وقتی page = \"custom\")؛ عدد با mm، cm، in یا pt مثل 148mm. بین ۴۰ تا ۵۰۰۰ میلی‌متر.",
  )),
  "page-height": (type: "length", default: "297mm", doc: d(
    "Height of a custom page (page = \"custom\"): a number with mm, cm, in or pt, such as 210mm. Between 40 mm and 5000 mm.",
    "ارتفاع صفحهٔ دلخواه (وقتی page = \"custom\")؛ عدد با mm، cm، in یا pt مثل 210mm. بین ۴۰ تا ۵۰۰۰ میلی‌متر.",
  )),
  "margin": (type: "enum", values: ("narrow", "normal", "wide"), default: "normal", doc: d(
    "Page margins: narrow (15 mm sides on A4), normal (about 25 mm), wide (35 mm); on other sizes they scale with the page. Ignored on phone pages.",
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
  "exercise-toc": (type: "bool", default: "false", doc: d(
    "List the title of every <exercise> («تمرین ۱») in the table of contents like a first-level heading. `toc=\"true\"` / `toc=\"false\"` on one <exercise> overrides it.",
    "عنوان هر <exercise> («تمرین ۱») را مثل یک تیتر سطح اول در فهرست مطالب بیاورد. `toc=\"true\"` / `toc=\"false\"` روی یک <exercise> آن را بازنویسی می‌کند.",
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
      "max-numbering-level": (type: "int", default: "6", doc: d("Deepest level that gets a number: 2 numbers # and ## and leaves ### and below without. Levels count from the document's top heading.", "عمیق‌ترین سطحی که شماره می‌گیرد: ۲ یعنی # و ## شماره می‌گیرند و ### و پایین‌تر بی‌شماره می‌مانند. سطح‌ها از بالاترین تیتر سند حساب می‌شوند.")),
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
      "numbering": (type: "bool", default: "false", doc: d("Number every table («جدول ۱»). Default: off. With it on a table gets a number as soon as it has a caption; with it off it shows the caption only, until the item turns `numbering` on. A number and a caption read «جدول ۱: توضیح».", "جدول‌ها شماره بخورد («جدول ۱»). پیش‌فرض: خاموش. با روشن بودن آن، جدول به‌محض داشتن عنوان شماره می‌گیرد؛ با خاموش بودن فقط عنوان دیده می‌شود تا خودِ مورد `numbering` را روشن کند. شماره و عنوان با هم «جدول ۱: توضیح» می‌شوند.")),
      "caption-position": (type: "enum", values: ("above", "below"), default: "above", doc: d("Where the number and caption go: above or below the table. An item can set its own `caption-position`.", "جای شماره و عنوان: بالا یا پایین جدول. هر مورد می‌تواند `caption-position` خودش را بدهد.")),
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
      "guides": (type: "enum", values: ("none", "line", "tree"), default: "none", doc: d("Lines between the levels of bulleted lists: none (default), line (a line down the side of each nested level, from its first item to its last) or tree (the same line with a branch to every item). A list sets its own with {guides=tree}.", "خط‌های بین سطح‌های لیست‌های بی‌شماره: none (پیش‌فرض)، line (یک خط در کنار هر سطح تودرتو، از اولین آیتم تا آخرین)، یا tree (همان خط با شاخه‌ای به هر آیتم). هر لیست با {guides=tree} مقدار خودش را می‌دهد.")),
      "numbering": (type: "bool", default: "false", doc: d("Number every list («فهرست ۱»). Default: off. With it on a list gets a number as soon as it has a caption; with it off it shows the caption only, until the item turns `numbering` on. A number and a caption read «فهرست ۱: توضیح».", "لیست‌ها شماره بخورد («فهرست ۱»). پیش‌فرض: خاموش. با روشن بودن آن، لیست به‌محض داشتن عنوان شماره می‌گیرد؛ با خاموش بودن فقط عنوان دیده می‌شود تا خودِ مورد `numbering` را روشن کند. شماره و عنوان با هم «فهرست ۱: توضیح» می‌شوند.")),
      "caption-position": (type: "enum", values: ("above", "below"), default: "below", doc: d("Where the number and caption go: above or below the list. An item can set its own `caption-position`.", "جای شماره و عنوان: بالا یا پایین لیست. هر مورد می‌تواند `caption-position` خودش را بدهد.")),
    ),
  ),
  "figure": (
    doc: d("Figures (<fig>, and <tree> / <chart> with a caption): numbering and where the number and caption go. A figure can override each key.", "شکل‌ها (<fig>، و <tree> / <chart> دارای عنوان): شماره‌گذاری و جای شماره و عنوان. هر شکل می‌تواند هر کلید را بازنویسی کند."),
    attrs: (
      "numbering": (type: "bool", default: "true", doc: d("Number every figure («شکل ۱»). Default: on, whether or not it has a caption. A figure can turn it off with `numbering=\"false\"`. A number and a caption read «شکل ۱: توضیح».", "هر شکل شماره بخورد («شکل ۱»). پیش‌فرض: روشن، چه عنوان داشته باشد چه نه. هر شکل می‌تواند با `numbering=\"false\"` آن را خاموش کند. شماره و عنوان با هم «شکل ۱: توضیح» می‌شوند.")),
      "caption-position": (type: "enum", values: ("above", "below"), default: "below", doc: d("Where the number and caption go: above or below the figure. An item can set its own `caption-position`.", "جای شماره و عنوان: بالا یا پایین شکل. هر مورد می‌تواند `caption-position` خودش را بدهد.")),
    ),
  ),
  "code": (
    doc: d("Code listings (<code>): numbering and where the number and caption go. A listing can override each key.", "کدها (<code>): شماره‌گذاری و جای شماره و عنوان. هر کد می‌تواند هر کلید را بازنویسی کند."),
    attrs: (
      "numbering": (type: "bool", default: "false", doc: d("Number every listing («کد ۱»). Default: off. With it on a listing gets a number as soon as it has a caption; with it off it shows the caption only, until the item turns `numbering` on. A number and a caption read «کد ۱: توضیح».", "کد‌ها شماره بخورد («کد ۱»). پیش‌فرض: خاموش. با روشن بودن آن، کد به‌محض داشتن عنوان شماره می‌گیرد؛ با خاموش بودن فقط عنوان دیده می‌شود تا خودِ مورد `numbering` را روشن کند. شماره و عنوان با هم «کد ۱: توضیح» می‌شوند.")),
      "caption-position": (type: "enum", values: ("above", "below"), default: "above", doc: d("Where the number and caption go: above or below the listing. An item can set its own `caption-position`.", "جای شماره و عنوان: بالا یا پایین کد. هر مورد می‌تواند `caption-position` خودش را بدهد.")),
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
  tables: (
    "html": (
      doc: d("The HTML output (the live HTML preview and the Export HTML dialog start from these; the dialog can change them for one export).", "خروجی HTML (پیش‌نمایش زندهٔ HTML و پنجرهٔ «خروجی HTML» از این‌ها شروع می‌کنند؛ پنجره می‌تواند برای یک خروجی تغییرشان دهد)."),
      attrs: (
        "toolbar": (type: "bool", default: "true", doc: d("A slim toolbar: zoom, theme and feel, changed by the reader.", "نوار ابزار باریک: بزرگ‌نمایی، تم و حال‌وهوا، به انتخاب خواننده.")),
        "progress": (type: "bool", default: "true", doc: d("A reading-progress line at the top and a percent in the toolbar.", "خط نشانگر خواندن بالای صفحه و درصد آن در نوار ابزار.")),
        "outline": (type: "bool", default: "true", doc: d("An outline of the headings in a sidebar on the right (a drawer on a phone).", "فهرست سرفصل‌ها در یک نوار کناری سمت راست (در موبایل به شکل کشو).")),
        "copy-code": (type: "bool", default: "true", doc: d("A copy button on every code block.", "دکمهٔ کپی روی هر بلوک کد.")),
        "embed-fonts": (type: "bool", default: "true", doc: d("Put the font files in the HTML (a few MB bigger) so it looks the same on any machine; false: the reader's own fonts. With the toolbar on, the fonts of every feel are included, so changing the feel changes the fonts too.", "فایل فونت‌ها در HTML گذاشته شود (چند مگابایت بزرگ‌تر) تا همه‌جا یک‌شکل دیده شود؛ false: فونت‌های خود خواننده.")),
      ),
    ),
  ),
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
