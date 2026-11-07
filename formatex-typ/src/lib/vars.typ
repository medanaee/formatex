// The variables of a document: `vars:` in the front matter (or `[vars]` in config.toml) holds the values, `var-types:` the rules, and
// `{{ ... }}` in the text is Typst code that sees them (src/lib/expr.typ, src/preprocess/evaluate.typ).
//
//   vars:                                 var-types:
//     audience: teacher                     audience: [student, teacher, parent]   a list is the values it may have
//     level: 2                              level: { min: 1, max: 3 }
//     width: 12em                           width: length
//     exam: data/exam.json                  exam: json                              a file; an object written here is the data itself
//
// Imports only the settings schema (which imports nothing), so src/core.typ can use it before `config` exists.
#import "/src/lib/config-schema.typ": config-schemas
#import "/src/lib/remote.typ": is-remote, remote-path

#let name-re = regex("^[\\p{L}_][\\p{L}\\p{N}_-]*$")
#let keywords = ("if", "else", "for", "while", "in", "and", "or", "not", "let", "set", "show", "import", "include", "return", "break", "continue", "context", "true", "false", "none", "auto", "setting")
#let cover-names = ("title", "subtitle", "author", "date", "institution", "faculty", "department", "supervisor", "advisor")
#let number-re = regex("^-?\\d+(\\.\\d+)?$")
#let length-re = regex("^-?\\d+(\\.\\d+)?(pt|mm|cm|in|em|%)$")

#let fail(at, message) = assert(false, message: at + message)

// The text of a value, for comparing and for printing in a message
#let norm(v) = if v == none { "" } else if type(v) == str { v } else if type(v) == bool {
  if v { "true" } else { "false" }
} else if type(v) in (int, float) { str(v) } else { repr(v) }

// A value that came as text (`--input`) without a rule says what it is itself
#let infer(s) = if s == "true" { true } else if s == "false" { false } else if type(s) == str and s.match(number-re) != none {
  if s.contains(".") { float(s) } else { int(s) }
} else { s }

// Typst resolves a path from the file that runs it; the paths of the project are written from its root
#let rooted-path(p) = if is-remote(p) { remote-path(p) } else if type(p) == str and not p.starts-with("/") and not p.contains("://") { "/" + p } else { p }

#let load-data(path, at) = {
  let ext = lower(path.split(".").last())
  let p = rooted-path(path)
  if ext == "json" { json(p) } else if ext in ("yaml", "yml") { yaml(p) } else if ext == "toml" { toml(p) } else if ext == "csv" { csv(p) } else {
    fail(at, "a data file is .json, .yaml, .toml or .csv, got " + repr(path))
  }
}

// A value as the rule says: `raw` is what was written (or typed in `--input`); the result is a Typst value, or an error naming `name`.
// `rule` is a list (the values it may have), a type name (bool, int, number, length, color, string, markdown, json, data) or a table
// `{ type, min, max, options }`.
#let convert(name, raw, rule, at) = {
  if raw == none { return none }
  if rule == none { return if type(raw) == str { infer(raw) } else { raw } }
  let options = if type(rule) == array { rule } else if type(rule) == dictionary { rule.at("options", default: none) } else { none }
  let kind = if type(rule) == str { rule } else if type(rule) == dictionary { rule.at("type", default: if options == none { "number" } else { "string" }) } else { "enum" }
  let value = raw
  if kind == "bool" {
    if type(raw) == str {
      assert(raw in ("true", "false"), message: at + name + " must be true or false, got " + repr(raw))
      value = raw == "true"
    }
    assert(type(value) == bool, message: at + name + " must be true or false, got " + repr(raw))
  } else if kind in ("int", "number") {
    if type(raw) == str {
      assert(raw.match(number-re) != none, message: at + name + " must be a number, got " + repr(raw))
      value = infer(raw)
    }
    assert(type(value) in (int, float), message: at + name + " must be a number, got " + repr(raw))
    if kind == "int" { assert(type(value) == int, message: at + name + " must be a whole number, got " + repr(raw)) }
  } else if kind == "length" {
    if type(raw) == str {
      assert(raw.match(length-re) != none, message: at + name + " must be a length such as 12em, 2cm or 80%, got " + repr(raw))
      value = eval(raw, mode: "code")
    }
  } else if kind == "color" {
    if type(raw) == str and raw.starts-with("#") { value = rgb(raw) }
  } else if kind in ("json", "data") {
    if type(raw) == str { value = load-data(raw, at) }
  } else if kind in ("string", "markdown") {
    if type(raw) != str { value = norm(raw) }
  }
  if options != none {
    assert(type(options) == array, message: at + name + " lists its values as [a, b, c]")
    let found = options.find(option => norm(option) == norm(value))
    assert(found != none, message: at + name + " must be one of " + options.map(norm).join(", ") + ", got " + repr(norm(raw)))
    value = found
  }
  if type(rule) == dictionary {
    let low = rule.at("min", default: none)
    let high = rule.at("max", default: none)
    if low != none or high != none {
      assert(type(value) in (int, float), message: at + name + " must be a number, got " + repr(norm(raw)))
      assert(low == none or value >= low, message: at + name + " must be " + str(low) + " or more, got " + str(value))
      assert(high == none or value <= high, message: at + name + " must be " + str(high) + " or less, got " + str(value))
    }
  }
  value
}

// ---- the settings, as `setting.theme`, `setting.chat.frame`: what is written, else the default of the schema, typed by the schema
#let typed-setting(raw, spec) = {
  if raw == none { return none }
  let kind = spec.at("type", default: "string")
  if type(raw) != str { return raw }
  if kind == "bool" and raw in ("true", "false") { raw == "true" } else if kind in ("int", "number") and raw.match(number-re) != none {
    infer(raw)
  } else if kind == "length" and raw.match(length-re) != none { eval(raw, mode: "code") } else { raw }
}

#let build-settings(config, inputs) = {
  let document = config-schemas.at("front-matter")
  let attrs = config-schemas.config.attrs + document.attrs
  let out = (:)
  for (key, spec) in attrs {
    let raw = if key in inputs { inputs.at(key) } else { config.at(key, default: none) }
    let value = typed-setting(raw, spec)
    out.insert(key, if value == none { typed-setting(spec.at("default", default: none), spec) } else { value })
  }
  for (table, spec) in document.tables {
    let written = config.at(table, default: (:))
    let part = (:)
    for (key, attr) in spec.attrs {
      let raw = if type(written) == dictionary { written.at(key, default: none) } else { none }
      let value = typed-setting(raw, attr)
      part.insert(key, if value == none { typed-setting(attr.at("default", default: none), attr) } else { value })
    }
    out.insert(table, part)
  }
  for (key, value) in config {
    if key not in out { out.insert(key, value) }
  }
  out
}

// ---- the environment
// `base` / `front` are `vars` of config.toml and of the front matter, `base-types` / `front-types` their `var-types`, `config` the merged
// settings, `inputs` is sys.inputs (`--input var.audience=teacher` wins over both), `locate(..path)` says where a setting is written.
#let make-env(base, front, base-types, front-types, config, inputs, locate) = {
  let tables(a, b, what) = {
    let out = (:)
    for layer in (a, b) {
      if layer == none { continue }
      assert(type(layer) == dictionary, message: what + " must be `name: value` lines")
      for (key, value) in layer { out.insert(key, value) }
    }
    out
  }
  let given = tables(base, front, "vars")
  let rules = tables(base-types, front-types, "var-types")
  let names = ()
  for key in given.keys() + rules.keys() + inputs.keys().filter(k => k.starts-with("var.")).map(k => k.slice(4)) {
    if key not in names { names.push(key) }
  }
  let values = (:)
  for name in names {
    let at = locate("vars", name)
    assert(name.match(name-re) != none and name not in keywords, message: at + "a variable name is letters, digits, - and _ (and not " + keywords.join(", ") + "), got " + repr(name))
    assert(upper(name) != name or lower(name) == name, message: at + "a name in capitals (" + name + ") is for a value of the page (PAGE, PAGES, SECTION); give the variable a lower case letter")
    let rule = rules.at(name, default: none)
    let raw = inputs.at("var." + name, default: given.at(name, default: none))
    values.insert(name, convert(name, raw, rule, at))
  }
  let settings = build-settings(config, inputs)
  // What a document can always read, under the names of the cover
  let cover = config.at("cover", default: (:))
  let scope = (setting: settings)
  for name in cover-names {
    scope.insert(name, if type(cover) == dictionary { cover.at(name, default: config.at(name, default: none)) } else { none })
  }
  (values: values, rules: rules, settings: settings, scope: scope)
}

// The values a `{{ }}` left, checked against the rules of their variables
#let check-vars(after, env, at) = {
  let out = (:)
  for (name, value) in after {
    let rule = env.rules.at(name, default: none)
    out.insert(name, if rule == none { value } else { convert(name, value, rule, at) })
  }
  out
}
