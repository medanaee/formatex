#import "/src/kit.typ": *

#let lists-tags = (:)

// rules-order: 10
#let lists-rules(doc) = {
  show: list-style.with((:))
  doc
}

#let lists-scope = (list-block: list-block)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let lists-docs = (
  en: (
    about: `````md
Markdown lists, with options: a `{...}` line directly above a list sets its numbering style, marker, indent, start and caption.

- Bulleted (`-`, `*`, `+`) and numbered (`1.`, `1)`) lists work as in Markdown; Persian digits (`۱.`, `۲)`) make a real numbered list too. Two numbered lists separated by only a blank line merge into one.
- Settings for every list: `[list]` in `config.toml` (`numbers`, `prefix`, `suffix`, `marker`, `indent`); `numbers` is `auto` (Persian digits in RTL, Latin in LTR), `fa`, `en`, `fatxt`, `rome`, `abc`, `abjad` or `alefba`.
- Options for one list: a `{...}` line directly above it, e.g. `{numbers=abjad suffix=")" marker=dash indent=2em start=3 caption="Steps" #list-steps}`. With `caption` or `#id` the list becomes a numbered block that `<ref>` can point at. An unknown option is a compile error.
`````.text,
    more: `````md
- `[list]` keys: `numbers` (`auto`, `fa`, `en`, `fatxt`, `rome`, `abc`, `abjad`, `alefba`), `prefix` (text before the number: `"("`), `suffix` (after it: `"."` default, `")"`, `"-"`, `":"`, or `""`), `marker` (bullets: a character or a name such as `disc`, `circle`, `square`, `dash`, `triangle`, `arrow`, `check`, `star`, `none`; a comma list gives one per nesting level), `indent` (`"1.5em"`).
- The same keys can be set per document in the front matter (`list:` map); the other keys keep their `config.toml` values.
- The options of a `{...}` line cover the list up to the first line after a blank line that is neither indented nor a list item; `start` on a bulleted list is a compile error.
`````.text,
  ),
  fa: (
    about: `````md
فهرست‌های Markdown با گزینه: یک خط `{...}` درست بالای فهرست سبک شماره‌گذاری، نشانه، تورفتگی، شروع و عنوان آن را تعیین می‌کند.

- فهرست‌های گلوله‌ای (`-`، `*`، `+`) و شماره‌دار (`1.`، `1)`) مثل Markdown کار می‌کنند؛ ارقام فارسی (`۱.`، `۲)`) هم فهرست شماره‌دار واقعی می‌سازند. دو فهرست شماره‌دار که فقط یک خط خالی میانشان است یکی می‌شوند.
- تنظیم همهٔ فهرست‌ها: `[list]` در `config.toml` (`numbers`، `prefix`، `suffix`، `marker`، `indent`)؛ `numbers` یکی از `auto` (ارقام فارسی در RTL و لاتین در LTR)، `fa`، `en`، `fatxt`، `rome`، `abc`، `abjad` یا `alefba` است.
- گزینه‌های یک فهرست: یک خط `{...}` درست بالایش، مثل `{numbers=abjad suffix=")" marker=dash indent=2em start=3 caption="مراحل" #list-steps}`. با `caption` یا `#id` فهرست یک بلوک شماره‌دار می‌شود که `<ref>` به آن اشاره می‌کند. گزینهٔ ناشناخته خطای ساخت است.
`````.text,
    more: `````md
- کلیدهای `[list]`: ‏`numbers` (`auto`، `fa`، `en`، `fatxt`، `rome`، `abc`، `abjad`، `alefba`)، `prefix` (متن پیش از عدد: `"("`)، `suffix` (پس از آن: `"."` پیش‌فرض، `")"`، `"-"`، `":"` یا `""`)، `marker` (گلوله‌ها: یک نویسه یا نامی مثل `disc`، `circle`، `square`، `dash`، `triangle`، `arrow`، `check`، `star`، `none`؛ فهرست جداشده با ویرگول برای هر سطح تودرتو یکی می‌دهد)، `indent` (‏`"1.5em"`).
- همین کلیدها را می‌توان برای هر سند در front matter (نقشهٔ `list:`) تنظیم کرد؛ کلیدهای دیگر مقدار `config.toml` را نگه می‌دارند.
- گزینه‌های خط `{...}` فهرست را تا اولین خط پس از یک خط خالی می‌پوشانند که تورفته نیست و آیتم فهرست هم نیست؛ `start` روی فهرست گلوله‌ای خطای ساخت است.
`````.text,
  ),
  example: (
    en: `````md
{numbers=abjad suffix=")"}
1. First
2. Second
3. Third
`````.text,
    fa: `````md
{numbers=abjad suffix=")"}
1. نخست
2. دوم
3. سوم
`````.text,
  ),
)
