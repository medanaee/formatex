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
      // Inline content is realized before the paragraph's direction rule runs.
      // The PDF renderer supplies lexical direction; raw Typst callers use the state fallback.
      let direction = if "_context-dir" in attrs { named-dir(attrs.at("_context-dir")) } else { last-dir.get() }
      let shown = if body != none and text-dir(body) != none { body } else { reference-text(el, direction == rtl) }
      link(el.location(), reference-style(if shown != none { shown } else { [#id] }))
    },
)

// The HTML form (optional, used by the HTML export): a plain link to the target; the language of the page decides the digits
