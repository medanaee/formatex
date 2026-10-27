#import "/src/prelude.typ": *

// Every component describes its tags in `<name>-schema` (see components/alert.typ):
//   tag: (display?, kind, description: (en, fa), attrs: (name: (type, values?, default?, required?, doc: (en, fa))), children?, scoped?)
// children: the tags that may stand inside this one. scoped: true marks a tag that only makes sense inside a tag that lists it
// in `children` (<item> in <grid>); the exported dist/tags.json gives every tag its `parents` from that.
// type: enum | bool | int | number | length | string | path | color. Editor tooling reads the same data
// (tools/export-schema.mjs -> dist/tags.json); here it validates the attributes of every tag the same way.
#let attr-number = regex("^[-−]?[\d۰-۹٠-٩.٫,٬\s%٪]+$")

// A problem found in the user's own text is reported with its place, `@path:line message`: the app reads that prefix and puts the
// problem on that line of that file. `at` is `"path:line"`; without it (a problem found later, while the handlers run) the
// message stands alone.
#let at-prefix(at) = if at == none { "" } else { "@" + at + " " }

// Checks the values of `attrs` against specs of this shape. `label` starts every message: `<alert>` for a tag, `table option` for a
// `{...}` line. `needs: (keys: (...), message: "...")` asks for at least one of those attributes to be given.
#let check-values(label, attr-specs, attrs, at: none, needs: none) = {
  let where = at-prefix(at)
  for (key, spec) in attr-specs {
    if spec.at("required", default: false) {
      assert(key in attrs, message: where + label + " requires " + key + "=\"...\"")
    }
  }
  if needs != none {
    assert(needs.keys.any(key => attrs.at(key, default: "") != ""), message: where + needs.message)
  }
  for (key, value) in attrs {
    let spec = attr-specs.at(key, default: none)
    if spec == none or value == "" { continue }
    let kind = spec.at("type")
    let name = label + " " + key
    if kind == "enum" {
      let allowed = spec.at("values")
      assert(value in allowed, message: where + name + " must be one of " + allowed.join(", ") + ", got " + repr(value))
    } else if kind == "bool" {
      assert(value in ("true", "false"), message: where + name + " must be true or false, got " + repr(value))
    } else if kind == "int" {
      assert(value.match(regex("^-?\d+$")) != none, message: where + name + " must be a whole number, got " + repr(value))
    } else if kind == "number" {
      assert(value.match(attr-number) != none, message: where + name + " must be a number, got " + repr(value))
    }
  }
}

#let check-attrs(tag-name, attr-specs, attrs, at: none, needs: none) = check-values("<" + tag-name + ">", attr-specs, attrs, at: at, needs: needs)

// Wraps every handler so its attributes are checked against the schema first. A tag without a schema
// is an error: a component must describe every tag it registers.
#let wrap-tags(tags, schemas) = {
  let out = (:)
  for (name, handler) in tags {
    let spec = schemas.at(name, default: none)
    assert(spec != none, message: "<" + name + "> has no entry in any components/*.typ `<name>-schema`")
    let specs = spec.at("attrs")
    let shown = spec.at("display", default: name)
    out.insert(name, if type(handler) == array {
      ("void", attrs => {
        check-attrs(shown, specs, attrs, needs: spec.at("needs", default: none))
        (handler.at(1))(attrs)
      })
    } else {
      (attrs, body) => {
        check-attrs(shown, specs, attrs, needs: spec.at("needs", default: none))
        handler(attrs, body)
      }
    })
  }
  out
}
