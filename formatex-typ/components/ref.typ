#import "/src/kit.typ": *

#let ref-tags = (
    ref: (attrs, body) => context {
      let id = attrs.to
      // Heading labels are GitHub-style slugs, which drop ZWNJ and punctuation,
      // so the heading text can be given as written.
      let slug = lower(id.trim()).replace(regex("[^\p{L}\p{M}\p{N}_\- ]"), "").replace(" ", "-")
      let found = query(label(id))
      if found.len() == 0 { found = query(label(slug)) }
      assert(found.len() > 0, message: at-of(attrs) + "<ref>: no element with id " + repr(id))
      let el = found.first()
      if el.func() == metadata and type(el.value) == dictionary and "heading-id" in el.value {
        el = query(selector(heading).before(el.location())).last()
      }
      if el.func() == metadata and type(el.value) == dictionary and "equation-id" in el.value {
        el = query(selector(math.equation).before(el.location())).last()
      }
      // Custom link text inside the tag wins over the generated "شکل ۲" / "Section 3".
      // Inline content is realized before the paragraph's direction rule runs,
      // so text.dir is not yet set here; last-dir already holds this paragraph's direction.
      let shown = if body != none and text-dir(body) != none { body } else { reference-text(el, last-dir.get() == rtl) }
      link(el.location(), reference-style(if shown != none { shown } else { [#id] }))
    },
)

#let ref-schema = (
  "ref": (
    kind: "inline",
    description: (en: "Cross-reference to a heading, figure, table, equation, theorem, listing...", fa: "ارجاع متقابل به عنوان، شکل، جدول، معادله، قضیه، کد و ..."),
    attrs: (
      "to": (type: "string", required: true, doc: (en: "Id of the target (heading slug, figure, table, equation, theorem...)", fa: "شناسهٔ هدف (slug عنوان، شکل، جدول، معادله، قضیه ...)")),
    ),
  ),
)

// ---- docs: read by the skill generator of the app and exported with the schema (see docs/doc_en.md, Extending the template)
#let ref-docs = (
  en: (
    about: `````md
Cross-references to figures, tables, listings, equations, theorems and headings by `id`: `<ref to="fig-x"></ref>` writes "Figure 1" (or «شکل ۱») in the language of its paragraph and links to it.

- `<ref to="id"></ref>` writes the target's label in the language of its paragraph («شکل ۱» / "Figure 1", «قضیه ۲» / "Theorem 2", «بخش ۳» / "Section 3") as a link; text inside the tag replaces the generated label. An unknown id is a compile error.
- Targets: `<fig id>`, theorem blocks, tables (`{#id}` in the `{...}` line above), listings (`<code id>`), diffs, numbered equations, headings (end the heading line with `{#id}`; without one, use the exact heading text or its slug) and text fragments (`<span id="term">`).
- Ids use letters, digits and `_ - . :`, with no spaces, and must be unique. References are drawn in the accent color with an underline.
`````.text,
    more: `````md
- Heading ids: end a heading line with `{#id}` (removed from the printed heading, the table of contents and the page header); the same braces can hold per-heading options (`{#id fill=true numbering=false}`). It survives edits of the heading text, so prefer it.
- Also referenceable: numbered equations («رابطهٔ (۱)»), `<code id>` listings and `<diff id>` blocks. A link inside a heading is left out of its anchor.
- Highlighting: `<span highlight="true">text</span>` puts a highlighter band behind text (`true` is yellow; a preset, Tailwind name or hex also works), with or without an `id`; the Markdown form is `[text]{highlight=green}` or `[text]{#term highlight=true}`.
`````.text,
  ),
  fa: (
    about: `````md
ارجاع متقابل به شکل، جدول، کد، معادله، قضیه و تیتر با `id`: `<ref to="fig-x"></ref>` «شکل ۱» (یا "Figure 1") را به زبان همان پاراگراف می‌نویسد و به آن پیوند می‌دهد.

- ‏`<ref to="id"></ref>` برچسب هدف را به زبان پاراگرافش می‌نویسد («شکل ۱» / "Figure 1"، «قضیه ۲» / "Theorem 2"، «بخش ۳» / "Section 3") و پیوند می‌دهد؛ متن داخل تگ جای برچسب تولیدشده را می‌گیرد. شناسهٔ ناشناخته خطای ساخت است.
- هدف‌ها: `<fig id>`، بلوک‌های قضیه، جدول‌ها (`{#id}` در خط `{...}` بالایشان)، کدها (`<code id>`)، diffها، معادله‌های شماره‌دار، تیترها (انتهای خط تیتر `{#id}` بگذارید؛ بدون آن متن دقیق تیتر یا slugش را بنویسید) و تکه‌های متن (`<span id="term">`).
- شناسه از حرف، رقم و `_ - . :` ساخته می‌شود، بدون فاصله، و باید یکتا باشد. ارجاع‌ها با رنگ تأکید و زیرخط کشیده می‌شوند.
`````.text,
    more: `````md
- شناسهٔ تیتر: انتهای خط تیتر `{#id}` بگذارید (از تیتر چاپی، فهرست مطالب و سربرگ صفحه حذف می‌شود)؛ همین آکولادها گزینه‌های هر تیتر را هم می‌گیرند (`{#id fill=true numbering=false}`). با ویرایش متن تیتر از بین نمی‌رود، پس آن را ترجیح بدهید.
- قابل ارجاع‌اند: معادله‌های شماره‌دار («رابطهٔ (۱)»)، کدهای `<code id>` و بلوک‌های `<diff id>`. پیوند داخل تیتر از لنگر آن بیرون می‌ماند.
- هایلایت: ‏`<span highlight="true">متن</span>` نوار هایلایت پشت متن می‌گذارد (`true` زرد است؛ رنگ آماده، نام Tailwind یا hex هم می‌شود)، با `id` یا بدون آن؛ شکل Markdown آن `[متن]{highlight=green}` یا `[متن]{#term highlight=true}` است.
`````.text,
  ),
  example: (
    en: `````md
## Method {#method}

<fig id="fig-ocean">
<img src="images/ocean.svg" alt="Ocean">
<caption>The ocean.</caption>
</fig>

<theorem id="thm-main">

A convergent sequence has one limit.

</theorem>

See <ref to="fig-ocean"></ref>, <ref to="thm-main"></ref> and <ref to="method"></ref>.
With your own words: <ref to="thm-main">this theorem</ref>.
`````.text,
    fa: `````md
## روش {#method}

<fig id="fig-ocean">
<img src="images/ocean.svg" alt="اقیانوس">
<caption>اقیانوس.</caption>
</fig>

<theorem id="thm-main">

هر دنبالهٔ همگرا یک حد دارد.

</theorem>

طبق <ref to="fig-ocean"></ref>، <ref to="thm-main"></ref> و <ref to="method"></ref>.
با عبارت خودتان: <ref to="thm-main">این قضیه</ref>.
`````.text,
  ),
)
