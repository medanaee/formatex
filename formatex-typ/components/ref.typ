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



