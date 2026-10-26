// Queried by tools/export-schema.mjs: exposes every component schema as data.
//   tags     every tag's schema, plus `parents` (the tags that list it in their `children`)
//   options  the `{...}` option lines (src/lib/option-schema.typ)
//   config   the keys of config.toml and of the front matter (src/lib/config-schema.typ); the values of `theme` are every theme
//   themes   every theme with its colors as hex strings (src/themes.typ; the Formatex app adds the user's themes to that file)
//   issues   things that disagree: a `children` entry that is not a tag, a `scoped` tag that no tag lists as a child
#import "/components/_registry.typ": all-schemas
#import "/src/lib/option-schema.typ": option-schemas
#import "/src/lib/config-schema.typ": config-schemas
#import "/src/themes.typ": themes

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

#metadata((tags: tags, options: option-schemas, config: config, themes: theme-data, issues: issues + scoped-orphans)) <schemas>
