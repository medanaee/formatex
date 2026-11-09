// Queried by tools/export-schema.mjs: exposes every component schema as data.
//   tags     every tag's schema, plus `parents` (the tags that list it in their `children`)
//   options  the `{...}` option lines (src/lib/option-schema.typ)
//   config   the keys of config.toml and of the front matter (src/lib/config-schema.typ); the values of `theme` are every theme
//   themes   every theme with its colors as hex strings (src/themes.typ; the Formatex app adds the user's themes to that file)
//   tailwind  the Tailwind classes the template reads: values, variants and groups (src/lib/tailwind.typ); a tag lists the groups it takes in `classes` of its `tailwind` attribute
//   components  every component: its tags and its docs (what it is for in en and fa, and an example); the skill generator of the app reads them
//   issues   things that disagree: a `children` entry that is not a tag, a `scoped` tag that no tag lists as a child
#import "/components/_registry.typ": all-schemas as built-in-schemas, component-tags as built-in-component-tags, component-docs as built-in-component-docs
// The components of the project itself (the `components` setting): a tag has autocomplete when its file gives a schema
#import "/src/lib/local-components.typ": local-schemas, local-components, local-docs
#let all-schemas = built-in-schemas + local-schemas
#let component-tags = built-in-component-tags + local-components.pairs().map(((label, c)) => (label, c.tags)).to-dict()
#let component-docs = built-in-component-docs + local-docs
#import "/src/lib/option-schema.typ": option-schemas
#import "/src/lib/config-schema.typ": config-schemas
#import "/src/themes.typ": themes
#import "/src/lib/tailwind.typ": tailwind-catalog, tailwind-groups-of

#let parents-of(name) = all-schemas.pairs().filter(((_, s)) => name in s.at("children", default: ())).map(((p, _)) => p)

#let tags = all-schemas.pairs().map(((name, s)) => {
  let parents = parents-of(name)
  (name, if parents.len() > 0 { s + (parents: parents) } else { s })
}).to-dict()

#let issues = all-schemas.pairs().map(((name, s)) => {
  s.at("children", default: ()).filter(c => c not in all-schemas).map(c => "<" + name + "> lists the unknown child <" + c + ">")
}).flatten()

#let scoped-orphans = all-schemas.pairs().filter(((name, s)) => s.at("scoped", default: false) and parents-of(name).len() == 0).map(((name, _)) => "<" + name + "> is `scoped` but no tag lists it in `children`")

// The theme names come from themes.typ, so a theme added there is offered by `theme = "..."` with no change here.
#let with-theme-values(section) = {
  let s = section
  s.attrs.theme.values = themes.keys()
  s
}
#let config = (config: with-theme-values(config-schemas.config), "front-matter": with-theme-values(config-schemas.at("front-matter")))
#let theme-data = themes.pairs().map(((name, t)) => (name, t.pairs().map(((key, value)) => (key, if type(value) == color { value.to-hex() } else { value })).to-dict())).to-dict()

#let components = component-tags.pairs().map(((name, names)) => (name, (
  // `file` is the project file of a component of the project; the tags it gives no schema for are left out (no autocomplete)
  tags: names.filter(n => n in all-schemas),
  docs: component-docs.at(name, default: none),
  ..if name in local-components { (file: local-components.at(name).file) },
))).to-dict()

// A component that has docs must give both languages and an example (the skill generator of the app reads them)
#let docs-issues = built-in-component-docs.pairs().map(((name, d)) => {
  let missing = ()
  for lang in ("en", "fa") {
    if d.at(lang, default: (:)).at("about", default: "").trim() == "" { missing.push(lang + ".about") }
  }
  for lang in ("en", "fa") {
    let ex = d.at("example", default: (:))
    if (if type(ex) == dictionary { ex.at(lang, default: "") } else { ex }).trim() == "" { missing.push("example." + lang) }
  }
  if missing.len() > 0 { "the docs of the component " + name + " lack " + missing.join(", ") } else { none }
}).filter(x => x != none)

// The `{tailwind="..."}` of a span takes what the tag takes
#let options = {
  let o = option-schemas
  o.span.attrs.tailwind.classes = tailwind-groups-of("span")
  o
}

#metadata((tags: tags, components: components, options: options, config: config, themes: theme-data, tailwind: tailwind-catalog, issues: issues + scoped-orphans + docs-issues)) <schemas>
