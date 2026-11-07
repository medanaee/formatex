import type { SkillLevel } from "@/lib/skill/generate"

/** The two languages of a skill. */
export type FixedLanguage = "en" | "fa"

const NAME = "formatex"

const DESCRIPTION = {
  writing: {
    en: "Writes and edits documents for Formatex, an app that typesets Markdown with HTML-like components into an exact bilingual Persian and English PDF. Use it whenever a task touches a Formatex project: the main Markdown file, config.toml, front matter, components (tags), references, citations, figures, tables, lists, themes or direction.",
    fa: "برای نوشتن و ویرایش سند در فرمتکس (Formatex) به کار می‌رود، برنامه‌ای که Markdown را با کامپوننت‌های شبیه HTML به یک PDF دقیق فارسی و انگلیسی تبدیل می‌کند. هر وقت کاری به یک پروژهٔ فرمتکس مربوط شد از آن استفاده کنید: فایل اصلی Markdown، config.toml، front matter، کامپوننت‌ها (تگ‌ها)، ارجاع، استناد، شکل، جدول، فهرست، تم یا جهت متن.",
  },
  building: {
    en: "Builds your own components (tags) for a Formatex project: Typst files that define tags, their optional schema and docs, and how the project declares them. Use it when a task asks for a new tag or changes a component file.",
    fa: "کامپوننت (تگ) دلخواه برای یک پروژهٔ فرمتکس می‌سازد: فایل‌های Typst که تگ تعریف می‌کنند، schema و docs اختیاری آن‌ها و راهی که پروژه آن‌ها را معرفی می‌کند. وقتی کاری تگ تازه می‌خواهد یا فایل کامپوننت را عوض می‌کند از آن استفاده کنید.",
  },
} as const

/** Which sections a skill holds. */
export interface SkillParts {
  writing: boolean
  building: boolean
}

const TITLE = {
  writing: { en: "# Writing documents in Formatex", fa: "# نوشتن سند در فرمتکس" },
  building: { en: "# Building Formatex components", fa: "# ساختن کامپوننت در فرمتکس" },
  both: { en: "# Formatex", fa: "# فرمتکس" },
} as const

/** The front matter that makes the file a skill, and the title. The language is that of the first section the file holds. */
export function skillHead(language: FixedLanguage, parts: SkillParts): string {
  const kinds = (["writing", "building"] as const).filter((kind) => parts[kind])
  const description = kinds.map((kind) => DESCRIPTION[kind][language]).join(" ")
  const title = kinds.length === 2 ? TITLE.both[language] : TITLE[kinds[0] ?? "writing"][language]
  return `---
name: ${NAME}
description: ${description}
---

${title}
`
}

const INTRO_EN = `You write the **content** of a Formatex document: one Markdown file (with a YAML front matter block on top) and, when asked, the project's \`config.toml\`. Formatex turns them into a typeset PDF, Persian and English side by side, right to left and left to right. You never touch how the typesetting works; you only use what this skill lists. **Use only the tags, attributes, settings and values listed here. Do not invent any.**

## The project

A project is a folder of real files:

- \`config.toml\`: the settings of the whole project. Its \`source\` key names the Markdown file that is compiled (\`main.md\` in a new project). Read it first.
- The main Markdown file, and any chapters it pulls in with \`<include>\`.
- Images (\`images/...\`), \`.bib\` files, CSV data and code files the document uses.
- The user's own components, kept in the app (they appear in the reference below when they have docs).

**Every path in a document is relative to the project folder** (\`images/fig1.png\`, \`chapters/intro.md\`). URLs and absolute paths do not work for files. The app compiles as the user types and shows each error with its file and line; there is nothing for you to build.

Settings live in two places. \`config.toml\` holds the defaults of every document in the project; the front matter at the top of one Markdown file overrides them for that document only, and also holds the page header, footer, cover and bibliography. Front matter wins. Sections (\`heading\`, \`font\`, \`paragraph\`, \`list\`, \`table\`, \`equation\`, \`chat\`) merge key by key.

## How to work

1. Read \`config.toml\` and the existing document first: the language, the theme, the feel, what is already there. Keep the document's style.
2. Decide the document's main language. Write the front matter first, then the body.
3. Write plain Markdown. Use a component **only when plain Markdown cannot say it**: a numbered figure, a callout, side-by-side columns, a citation, a cross-reference, a theorem. Do not decorate for its own sake.
4. Give an \`id\` to everything you will refer to, and refer with \`<ref>\`.
5. Before you finish, go through the checklist at the end of this skill.

A document skeleton:

\`\`\`markdown
---
header:
  style: line
  start: "Short document title"
  end: "{section}"
footer:
  center: "{page}"
bibliography:
  file: references.bib
  style: ieee
---

<docheader title="Full title of the document" subtitle="Author"></docheader>

## Introduction

Text ...

## Method {#sec-method}

Text ... (see <ref to="sec-method"></ref>)

<bibliography></bibliography>
\`\`\`

The front matter must be the very first thing in the file, between two \`---\` lines; leave it out when the document needs no header, footer, cover or bibliography. Sections are \`##\`; \`#\` is not used for sections (the title goes in \`<docheader>\` or the cover).

## Rules that matter most

### Direction, Persian and English

- With the default \`dir: auto\`, every paragraph, heading, list item, table cell and caption takes its direction from its **first letter**: a Persian letter means right to left, any other letter means left to right. Code and math are skipped when finding the first letter. \`dir: rtl\` or \`ltr\` forces one direction on the whole document (code stays left to right); \`<dir to="rtl|ltr|auto">\` does it for one part.
- **A Persian paragraph, heading or list item must start with a Persian word.** If it would start with an English word, a Latin number, code or a tag, rephrase it («زبان Python ...» not «Python زبانی ...»), or put an RLM mark (\`&rlm;\`) first. In a list item the mark goes **after** the marker: \`- &rlm;Docker ...\`. A mark before \`-\` or \`1.\` breaks the list.
- An English paragraph in a Persian document just starts with an English word. Force left to right with \`&lrm;\` if needed.

### Headings

- Headings are numbered automatically (when numbering is on). **Never type numbers into headings**: \`## Introduction\`, not \`## 1. Introduction\`.
- End a heading line with \`{#id}\` to give it an id (it is not printed): \`## Results {#sec-results}\`. The same braces can set that heading's look: \`## Appendix {#sec-app numbering=false toc=false}\`, \`## Summary {fill=true color=purple}\`.

### Writing components (tags)

- Open and close every tag: \`<alert type="tip"> ... </alert>\`. Empty tags still need the closing tag: \`<toc></toc>\`, \`<ref to="x"></ref>\`. Only the self-closing tags the reference shows with \`/>\` may be written that way.
- **Blank lines:** whenever a tag contains Markdown (paragraphs, bold, lists, headings, math, tables), leave an empty line after the opening tag and before the closing tag. Without them the Markdown is printed as raw text.
- Attribute values are always quoted strings: \`radius="6"\`, \`break="true"\`. Lengths: a bare number is points (\`"12"\`); \`pt\`, \`mm\`, \`cm\`, \`in\`, \`em\` work, and \`%\` where noted. Colors: a preset name (\`purple\`, \`blue\`, \`teal\`, \`green\`, \`yellow\`, \`red\`, \`pink\`, or any Tailwind color, optionally with a shade: \`blue-200\`) or a hex string (\`"#e0efff"\`). Prefer presets: they adapt to every theme.
- Tags nest: a \`<fig>\` inside an \`<item>\`, a \`<box>\` inside a \`<grid>\`, an \`<alert>\` inside a \`<step>\`.

### Ids and references

- Ids use letters, digits and \`_ - . :\`, no spaces, and are unique. Use prefixes: \`sec-\`, \`fig-\`, \`tbl-\`, \`list-\`, \`eq-\`, \`code-\`, \`thm-\`, \`def-\`.
- \`<ref to="id"></ref>\` prints «شکل ۱» / "Figure 1", «جدول ۲», «رابطهٔ (۳)», «بخش ۴», «قضیه ۵», following the language of the surrounding sentence. An unknown id is a compile error: never refer to something you did not define.

### Lists, tables, math

- Lists are Markdown. Numbered items may use Persian digits (\`۱.\`, \`۲)\`). Two numbered lists separated only by a blank line merge into one: put a paragraph or a \`{...}\` line between them. Do not type letters or words as numbers; choose the numbering style (\`[list] numbers\`, or a \`{numbers=abjad suffix=")"}\` line directly above one list).
- Tables are Markdown tables (\`:---\`, \`---:\`, \`:---:\` align a column). For a caption, an id or a width put one \`{...}\` line directly above: \`{caption="Results" #tbl-results}\`. No literal \`|\` inside a cell (use \`\\mid\` in math); for fractions in cells write \`$\\displaystyle\\frac{a}{b}$\`. In a two-column document add \`span=all\` to a table too wide for a column.
- Math is LaTeX: inline \`$a^2+b^2$\`, display \`$$ ... $$\` on its own lines. Number a display equation by ending its closing line with \`{#id}\`.

### Citations, images, diagrams

- Put BibTeX entries in the \`.bib\` file named in the front matter (\`bibliography: file:\`) and cite with \`<cite key="key1"></cite>\`. A document that cites needs exactly one \`<bibliography></bibliography>\`, at the end, and every key must exist in the \`.bib\` file.
- A numbered figure is \`<fig id="fig-x"> <img src="images/x.png"> <caption>...</caption> </fig>\`. Instead of \`<img>\`, a \`<fig>\` can hold a \`<cetz>\` drawing, a \`<lilaq>\` plot or a \`\`\`mermaid block.
- For flowcharts, sequence, class, state, ER and pie diagrams prefer a \`\`\`mermaid block; quote its labels that have Persian text or spaces (\`A["ورود مقاله"]\`) and keep the diagram narrow. Use \`<cetz>\` for custom geometric drawings.`

const INTRO_FA = `شما **محتوای** یک سند فرمتکس را می‌نویسید: یک فایل Markdown (با یک بلوک YAML front matter در بالا) و، اگر خواسته شد، فایل \`config.toml\` پروژه. فرمتکس آن‌ها را به یک PDF حروف‌چینی‌شده تبدیل می‌کند، فارسی و انگلیسی کنار هم، راست‌به‌چپ و چپ‌به‌راست. به چگونگی حروف‌چینی کاری ندارید؛ فقط از چیزهایی استفاده می‌کنید که این skill فهرست کرده است. **فقط از تگ‌ها، ویژگی‌ها، تنظیم‌ها و مقدارهایی استفاده کنید که اینجا آمده؛ هیچ‌کدام را از خودتان نسازید.**

## پروژه

پروژه یک پوشه از فایل‌های واقعی است:

- \`config.toml\`: تنظیم‌های کل پروژه. کلید \`source\` آن نام فایل Markdownی را می‌دهد که ساخته می‌شود (در پروژهٔ تازه \`main.md\`). اول آن را بخوانید.
- فایل اصلی Markdown و فصل‌هایی که با \`<include>\` به آن می‌آیند.
- تصویرها (\`images/...\`)، فایل‌های \`.bib\`، دادهٔ CSV و فایل‌های کدی که سند به کار می‌برد.
- کامپوننت‌های خودِ کاربر که در برنامه نگه‌داری می‌شوند (اگر مستندات داشته باشند در مرجع زیر می‌آیند).

**هر مسیر در سند نسبت به پوشهٔ پروژه است** (\`images/fig1.png\`، \`chapters/intro.md\`). نشانی اینترنتی و مسیر مطلق برای فایل‌ها کار نمی‌کند. برنامه همزمان با تایپ می‌سازد و هر خطا را با فایل و شمارهٔ خط نشان می‌دهد؛ چیزی برای ساختن به عهدهٔ شما نیست.

تنظیم‌ها دو جا هستند. \`config.toml\` پیش‌فرض همهٔ سندهای پروژه را دارد؛ front matter بالای یک فایل Markdown آن‌ها را فقط برای همان سند عوض می‌کند و سربرگ، پابرگ، جلد و فهرست منابع را هم نگه می‌دارد. front matter مقدم است. بخش‌ها (\`heading\`، \`font\`، \`paragraph\`، \`list\`، \`table\`، \`equation\`، \`chat\`) کلید به کلید ادغام می‌شوند.

## شیوهٔ کار

1. اول \`config.toml\` و سند موجود را بخوانید: زبان، تم، حالت (feel) و آنچه از پیش هست. سبک سند را حفظ کنید.
2. زبان اصلی سند را تعیین کنید. اول front matter را بنویسید، بعد متن.
3. Markdown ساده بنویسید. کامپوننت را **فقط جایی** به کار ببرید که Markdown ساده نتواند بگوید: شکل شماره‌دار، کادر هشدار، ستون‌بندی، استناد، ارجاع، قضیه. برای تزئین به کار نبرید.
4. به هر چیزی که بعداً به آن ارجاع می‌دهید \`id\` بدهید و با \`<ref>\` ارجاع دهید.
5. پیش از پایان، فهرست بررسی انتهای این skill را مرور کنید.

اسکلت یک سند:

\`\`\`markdown
---
header:
  style: line
  start: "عنوان کوتاه سند"
  end: "{section}"
footer:
  center: "{page}"
  digits: fa
bibliography:
  file: references.bib
  style: ieee
  title: "منابع"
---

<docheader title="عنوان کامل سند" subtitle="نام نویسنده"></docheader>

## مقدمه

متن ...

## روش {#sec-method}

متن ... (ارجاع: <ref to="sec-method"></ref>)

<bibliography></bibliography>
\`\`\`

front matter باید اولین چیز فایل باشد، میان دو خط \`---\`؛ اگر سند سربرگ، پابرگ، جلد یا فهرست منابع نمی‌خواهد حذفش کنید. بخش‌ها با \`##\` نوشته می‌شوند؛ \`#\` برای بخش به کار نمی‌رود (عنوان در \`<docheader>\` یا جلد می‌آید).

## قاعده‌های مهم

### جهت: فارسی و انگلیسی

- با پیش‌فرض \`dir: auto\` هر پاراگراف، تیتر، آیتم فهرست، خانهٔ جدول و عنوان جهتش را از **اولین حرف** می‌گیرد: حرف فارسی یعنی راست‌به‌چپ و هر حرف دیگر چپ‌به‌راست. هنگام پیدا کردن اولین حرف، کد و ریاضی کنار گذاشته می‌شوند. \`dir: rtl\` یا \`ltr\` یک جهت را بر کل سند اجبار می‌کند (کد چپ‌به‌راست می‌ماند)؛ \`<dir to="rtl|ltr|auto">\` همین را برای یک بخش انجام می‌دهد.
- **پاراگراف، تیتر یا آیتم فارسی باید با یک واژهٔ فارسی شروع شود.** اگر با واژهٔ انگلیسی، عدد لاتین، کد یا تگ شروع می‌شود، جمله را بازنویسی کنید («زبان Python ...» نه «Python زبانی ...») یا اول یک علامت RLM (\`&rlm;\`) بگذارید. در آیتم فهرست علامت **بعد از** نشانهٔ فهرست می‌آید: \`- &rlm;Docker ...\`. علامتِ پیش از \`-\` یا \`1.\` فهرست را خراب می‌کند.
- پاراگراف انگلیسی در سند فارسی فقط با واژهٔ انگلیسی شروع می‌شود. در صورت نیاز با \`&lrm;\` چپ‌به‌راست را اجبار کنید.

### تیترها

- تیترها خودکار شماره می‌خورند (اگر شماره‌گذاری روشن باشد). **هرگز شماره را در تیتر ننویسید**: \`## مقدمه\`، نه \`## ۱. مقدمه\`.
- با گذاشتن \`{#id}\` در انتهای خط تیتر به آن شناسه بدهید (چاپ نمی‌شود): \`## نتایج {#sec-results}\`. همین آکولادها ظاهر همان تیتر را هم تعیین می‌کنند: \`## پیوست {#sec-app numbering=false toc=false}\`، \`## خلاصه {fill=true color=purple}\`.

### نوشتن کامپوننت‌ها (تگ‌ها)

- هر تگ را باز و بسته کنید: \`<alert type="tip"> ... </alert>\`. تگ خالی هم تگ بسته می‌خواهد: \`<toc></toc>\`، \`<ref to="x"></ref>\`. فقط تگ‌های خودبسته‌ای که مرجع با \`/>\` نشان داده می‌توانند آن‌طور نوشته شوند.
- **خط خالی:** هر وقت داخل تگ Markdown هست (پاراگراف، ضخیم، فهرست، تیتر، ریاضی، جدول) بعد از تگ بازکننده و پیش از تگ بسته‌کننده یک خط خالی بگذارید. بدون آن Markdown به‌شکل متن خام چاپ می‌شود.
- مقدار ویژگی‌ها همیشه رشتهٔ داخل گیومه است: \`radius="6"\`، \`break="true"\`. طول: عدد تنها یعنی پوینت (\`"12"\`)؛ \`pt\`، \`mm\`، \`cm\`، \`in\`، \`em\` کار می‌کنند و \`%\` جایی که گفته شده. رنگ: نام یک رنگ آماده (\`purple\`، \`blue\`، \`teal\`، \`green\`، \`yellow\`، \`red\`، \`pink\` یا هر رنگ Tailwind، اختیاراً با سایه: \`blue-200\`) یا رشتهٔ hex (\`"#e0efff"\`). رنگ آماده را ترجیح بدهید: با هر تم می‌خواند.
- تگ‌ها تودرتو می‌شوند: \`<fig>\` داخل \`<item>\`، \`<box>\` داخل \`<grid>\`، \`<alert>\` داخل \`<step>\`.

### شناسه و ارجاع

- شناسه از حرف، رقم و \`_ - . :\` ساخته می‌شود، بدون فاصله و یکتا. پیشوند بگذارید: \`sec-\`، \`fig-\`، \`tbl-\`، \`list-\`، \`eq-\`، \`code-\`، \`thm-\`، \`def-\`.
- \`<ref to="id"></ref>\` «شکل ۱» / "Figure 1"، «جدول ۲»، «رابطهٔ (۳)»، «بخش ۴»، «قضیه ۵» را به زبان جملهٔ اطرافش می‌نویسد. شناسهٔ ناشناخته خطای ساخت است: هرگز به چیزی که تعریف نکرده‌اید ارجاع ندهید.

### فهرست، جدول، ریاضی

- فهرست‌ها Markdown هستند. آیتم‌های شماره‌دار می‌توانند ارقام فارسی داشته باشند (\`۱.\`، \`۲)\`). دو فهرست شماره‌دار که فقط یک خط خالی میانشان است یکی می‌شوند: میانشان پاراگراف یا یک خط \`{...}\` بگذارید. حرف یا واژه را به‌جای عدد تایپ نکنید؛ سبک شماره‌گذاری را انتخاب کنید (\`[list] numbers\` یا یک خط \`{numbers=abjad suffix=")"}\` درست بالای یک فهرست).
- جدول‌ها جدول Markdown‌اند (\`:---\`، \`---:\`، \`:---:\` یک ستون را تراز می‌کنند). برای عنوان، شناسه یا عرض یک خط \`{...}\` درست بالایش بگذارید: \`{caption="نتایج" #tbl-results}\`. در خانه نویسهٔ \`|\` نگذارید (در ریاضی \`\\mid\`)؛ برای کسر در خانه \`$\\displaystyle\\frac{a}{b}$\` بنویسید. در سند دو‌ستونه به جدولِ پهن \`span=all\` بدهید.
- ریاضی LaTeX است: درون‌خطی \`$a^2+b^2$\`، نمایشی \`$$ ... $$\` در خط‌های جدا. برای شماره‌دار کردن معادلهٔ نمایشی انتهای خط بستنش \`{#id}\` بگذارید.

### استناد، تصویر، نمودار

- ورودی‌های BibTeX را در فایل \`.bib\` بگذارید که در front matter آمده (\`bibliography: file:\`) و با \`<cite key="key1"></cite>\` استناد دهید. سندی که استناد دارد دقیقاً یک \`<bibliography></bibliography>\` در پایان لازم دارد و هر کلید باید در فایل \`.bib\` باشد.
- شکل شماره‌دار \`<fig id="fig-x"> <img src="images/x.png"> <caption>...</caption> </fig>\` است. به‌جای \`<img>\` یک \`<fig>\` می‌تواند رسم \`<cetz>\`، نمودار \`<lilaq>\` یا یک بلوک \`\`\`mermaid بگیرد.
- برای نمودار گردش، توالی، کلاس، حالت، ER و دایره‌ای بلوک \`\`\`mermaid را ترجیح بدهید؛ برچسب‌هایی که متن فارسی یا فاصله دارند را در گیومه بگذارید (\`A["ورود مقاله"]\`) و نمودار را باریک نگه دارید. برای رسم‌های هندسیِ دلخواه \`<cetz>\` را به کار ببرید.`

const INTRO_SHORT_EN = `You write the **content** of a Formatex document: one Markdown file (YAML front matter on top) and, when asked, \`config.toml\`. **Use only the tags, attributes and settings listed here; do not invent any.** Paths are relative to the project folder. Read \`config.toml\` (its \`source\` is the compiled file) and the existing document first, and keep its style.

Rules: open and close every tag (\`<toc></toc>\`); leave a blank line after an opening tag and before a closing tag whenever it contains Markdown; quote every attribute value (\`radius="6"\`); give an \`id\` to what you refer to and use \`<ref to="id"></ref>\`; never type numbers into headings; a Persian paragraph must start with a Persian word; front matter is the first thing in the file, between two \`---\` lines.`

const INTRO_SHORT_FA = `شما **محتوای** یک سند فرمتکس را می‌نویسید: یک فایل Markdown (با YAML front matter در بالا) و، اگر خواسته شد، \`config.toml\`. **فقط از تگ‌ها، ویژگی‌ها و تنظیم‌هایی استفاده کنید که اینجا آمده؛ هیچ‌کدام را نسازید.** مسیرها نسبت به پوشهٔ پروژه‌اند. اول \`config.toml\` (کلید \`source\` فایلِ ساخته‌شده است) و سند موجود را بخوانید و سبکش را نگه دارید.

قاعده‌ها: هر تگ را باز و بسته کنید (\`<toc></toc>\`)؛ هر وقت داخل تگ Markdown هست بعد از تگ بازکننده و پیش از تگ بسته‌کننده خط خالی بگذارید؛ مقدار هر ویژگی را در گیومه بنویسید (\`radius="6"\`)؛ به آنچه ارجاع می‌دهید \`id\` بدهید و \`<ref to="id"></ref>\` بنویسید؛ در تیتر شماره تایپ نکنید؛ پاراگراف فارسی باید با واژهٔ فارسی شروع شود؛ front matter اولین چیز فایل است، میان دو خط \`---\`.`

const OUTRO_EN = `## Common mistakes

- A tag that holds Markdown with no blank line after it or before its closing tag: the Markdown shows up as raw text.
- A tag opened and never closed, or an empty tag written without its closing tag (\`<toc>\` instead of \`<toc></toc>\`).
- A \`<ref>\`, \`<a href="#...">\` or \`<cite>\` to an id or key that does not exist.
- Numbers typed into headings, or letters and words typed as list numbers.
- A Persian paragraph that starts with an English word, a Latin number, code or a tag.
- An attribute or value that is not in this reference, or a tag copied from another tool.
- A path that is absolute or a URL where a project file is expected.

## Checklist

Before you finish, check every line. Fix what fails.

- [ ] Every tag and attribute is in this reference, and every enum value is one of those listed.
- [ ] The front matter is first, between \`---\` lines; text containing \`{\`, \`: \` or \` #\` is quoted.
- [ ] Every tag is closed; every tag that contains Markdown has blank lines inside it.
- [ ] Every Persian paragraph, heading and list item starts with a Persian letter (or an RLM mark).
- [ ] No typed numbers in headings; list numbering comes from \`[list]\` or a \`{...}\` line.
- [ ] Two numbered lists meant to be separate are not separated by only a blank line.
- [ ] Every \`<ref to>\` and \`<a href="#...">\` points at an id that exists; ids are unique.
- [ ] Every \`<cite key>\` exists in the \`.bib\` file, and \`<bibliography>\` appears once, at the end.
- [ ] Image, data, code and \`<include>\` paths are relative to the project folder and the files exist.
- [ ] Components are used only where plain Markdown is not enough.
- [ ] The text of the user's request is done, and nothing else was changed.`

const OUTRO_FA = `## اشتباهات رایج

- تگی که Markdown دارد اما بعد از آن یا پیش از تگ بسته‌کننده‌اش خط خالی نیست: Markdown به‌شکل متن خام دیده می‌شود.
- تگی که باز شده و بسته نشده، یا تگ خالی که بدون تگ بسته‌کننده نوشته شده (\`<toc>\` به‌جای \`<toc></toc>\`).
- \`<ref>\`، \`<a href="#...">\` یا \`<cite>\` به شناسه یا کلیدی که وجود ندارد.
- شماره تایپ‌شده در تیتر، یا حرف و واژه‌ای که به‌جای شمارهٔ فهرست تایپ شده.
- پاراگراف فارسی که با واژهٔ انگلیسی، عدد لاتین، کد یا تگ شروع می‌شود.
- ویژگی یا مقداری که در این مرجع نیست، یا تگی که از ابزار دیگری آورده شده.
- مسیر مطلق یا نشانی اینترنتی جایی که فایل پروژه لازم است.

## فهرست بررسی

پیش از پایان هر خط را بررسی کنید. آنچه رد می‌شود درست کنید.

- [ ] هر تگ و ویژگی در این مرجع هست و هر مقدار enum یکی از مقدارهای آمده است.
- [ ] front matter اول فایل است، میان خط‌های \`---\`؛ متنی که \`{\`، \`: \` یا \` #\` دارد در گیومه است.
- [ ] هر تگ بسته شده؛ هر تگی که Markdown دارد داخلش خط خالی دارد.
- [ ] هر پاراگراف، تیتر و آیتم فارسی با حرف فارسی (یا علامت RLM) شروع می‌شود.
- [ ] در تیتر شمارهٔ تایپ‌شده نیست؛ شماره‌گذاری فهرست از \`[list]\` یا یک خط \`{...}\` می‌آید.
- [ ] دو فهرست شماره‌داری که باید جدا باشند فقط با یک خط خالی از هم جدا نشده‌اند.
- [ ] هر \`<ref to>\` و \`<a href="#...">\` به شناسه‌ای اشاره می‌کند که هست؛ شناسه‌ها یکتا هستند.
- [ ] هر \`<cite key>\` در فایل \`.bib\` هست و \`<bibliography>\` یک بار و در پایان آمده.
- [ ] مسیر تصویر، داده، کد و \`<include>\` نسبت به پوشهٔ پروژه است و فایل‌ها هستند.
- [ ] کامپوننت فقط جایی آمده که Markdown ساده کافی نبود.
- [ ] خواستهٔ کاربر انجام شده و چیز دیگری عوض نشده است.`

const OUTRO_SHORT_EN = `## Checklist

- [ ] Every tag and attribute is in this reference; every tag is closed; blank lines inside tags that hold Markdown.
- [ ] Front matter first; Persian paragraphs start with a Persian letter; no typed numbers in headings.
- [ ] Every \`<ref>\`, \`<a href="#...">\` and \`<cite>\` points at an id or key that exists; paths are relative to the project folder.`

const OUTRO_SHORT_FA = `## فهرست بررسی

- [ ] هر تگ و ویژگی در این مرجع هست؛ هر تگ بسته شده؛ داخل تگ‌هایی که Markdown دارند خط خالی هست.
- [ ] front matter اول است؛ پاراگراف فارسی با حرف فارسی شروع می‌شود؛ در تیتر شمارهٔ تایپ‌شده نیست.
- [ ] هر \`<ref>\`، \`<a href="#...">\` و \`<cite>\` به شناسه یا کلیدی اشاره می‌کند که هست؛ مسیرها نسبت به پوشهٔ پروژه‌اند.`

/** The text that opens a skill, after its head: who writes, the project, the way of working and the rules. Short at the smallest size. */
export function skillIntro(language: FixedLanguage, level: SkillLevel): string {
  const short = level === "minimal"
  if (language === "fa") return short ? INTRO_SHORT_FA : INTRO_FA
  return short ? INTRO_SHORT_EN : INTRO_EN
}

/** The text that closes a skill: the common mistakes and the checklist. */
export function skillOutro(language: FixedLanguage, level: SkillLevel): string {
  const short = level === "minimal"
  if (language === "fa") return short ? OUTRO_SHORT_FA : OUTRO_FA
  return short ? OUTRO_SHORT_EN : OUTRO_EN
}
