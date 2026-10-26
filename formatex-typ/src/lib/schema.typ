#import "/src/prelude.typ": *

// Every component describes its tags in `<name>-schema` (see components/alert.typ):
//   tag: (display?, kind, description: (en, fa), attrs: (name: (type, values?, default?, required?, doc: (en, fa))), children?, scoped?)
// children: the tags that may stand inside this one. scoped: true marks a tag that only makes sense inside a tag that lists it
// in `children` (<item> in <grid>); the exported dist/tags.json gives every tag its `parents` from that.
// type: enum | bool | int | number | length | string | path | color. Editor tooling reads the same data
// (tools/export-schema.mjs -> dist/tags.json); here it validates the attributes of every tag the same way.
#let attr-number = regex("^[-−]?[\d۰-۹٠-٩.٫,٬\s%٪]+$")

#let check-attrs(tag-name, attr-specs, attrs) = {
  for (key, spec) in attr-specs {
    if spec.at("required", default: false) {
      assert(key in attrs, message: "<" + tag-name + "> requires " + key + "=\"...\"")
    }
  }
  for (key, value) in attrs {
    let spec = attr-specs.at(key, default: none)
    if spec == none or value == "" { continue }
    let kind = spec.at("type")
    let name = "<" + tag-name + "> " + key
    if kind == "enum" {
      let allowed = spec.at("values")
      assert(value in allowed, message: name + " must be one of " + allowed.join(", ") + ", got " + repr(value))
    } else if kind == "bool" {
      assert(value in ("true", "false"), message: name + " must be true or false, got " + repr(value))
    } else if kind == "int" {
      assert(value.match(regex("^-?\d+$")) != none, message: name + " must be a whole number, got " + repr(value))
    } else if kind == "number" {
      assert(value.match(attr-number) != none, message: name + " must be a number, got " + repr(value))
    }
  }
}

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
        check-attrs(shown, specs, attrs)
        (handler.at(1))(attrs)
      })
    } else {
      (attrs, body) => {
        check-attrs(shown, specs, attrs)
        handler(attrs, body)
      }
    })
  }
  out
}
