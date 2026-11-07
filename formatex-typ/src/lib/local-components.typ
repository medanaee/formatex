// The components of the project itself: Typst files that define tags of their own, listed in the `components` setting of
// config.toml and of the front matter (the two lists are added together), the way files are imported.
//
//   components = ["notes.typ", "extras/stamps.typ"]     # paths relative to the project folder
//
// A file can define any number of tags, related or not, and its name means nothing. What counts is what it defines, and the part
// before the suffix is only a label:
//
//   #let <x>-tags   = (tag: (attrs, body) => content, ...)     required: the code of each tag
//   #let <x>-schema = ("tag": (kind, description, attrs), ...)   optional: autocomplete, and the attributes are checked
//   #let <x>-docs   = (en: (about: ...), fa: (about: ...), example: ...)   optional: for the Skill page of the app
//
// A tag has to be new: a tag that is built in, or defined by another file, is an error that names both files.
#import "/src/core.typ": base-config, config-text, front-matter, front-matter-match, setting-prefix, source-path
#import "/components/_registry.typ": all-schemas as built-in-schemas, component-tags as built-in-components

// A list of paths, a single path, or paths separated by commas (what a settings form writes)
#let listed(value) = if value == none { () } else if type(value) == str { value.split(",").map(p => p.trim()).filter(p => p != "") } else { value }

// Where a file may not be: the engine owns these paths
#let reserved = ("main.typ", "src/", "components/", "tools/", "code-dark.tmTheme")

// Where an entry of the list is written: its line in the front matter or in config.toml, as a mark the app puts on that line
#let entry-at(path, in-front) = {
  let lines = if in-front { front-matter-match.captures.first().split("
") } else { config-text.split("
") }
  let found = none
  for (i, line) in lines.enumerate() {
    if line.contains(path) or (found == none and line.trim().starts-with("components")) { found = i + 1 }
    if line.contains(path) { break }
  }
  if found == none { "" } else if in-front { "@" + source-path + ":" + str(found + 1) + " " } else { "@config.toml:" + str(found) + " " }
}

// The files listed, in order, each once, as paths relative to the project folder
#let declared = {
  let paths = ()
  let entries = listed(base-config.at("components", default: none)).map(p => (p, false)) + listed(front-matter.at("components", default: none)).map(p => (p, true))
  for (given, in-front) in entries {
    assert(type(given) == str, message: setting-prefix("components") + "components must be a list of paths, got " + repr(given))
    let where = entry-at(given, in-front)
    let path = given.trim().trim("/", at: start).trim(regex("^(\./)+"), at: start)
    assert(path.ends-with(".typ"), message: where + "a component file ends in .typ, got " + repr(given))
    assert(not path.split("/").contains(".."), message: where + "a component file is inside the project folder, got " + repr(given))
    assert(not reserved.any(r => path == r or path.starts-with(r)), message: where + repr(given) + " is part of the engine; put your components somewhere else, such as notes.typ")
    if path not in paths { paths.push(path) }
  }
  paths
}

#let tag-name = regex("^[a-z][a-z0-9-]{0,39}$")
#let no-schema = (kind: "inline", description: (en: "", fa: ""), attrs: (:))

// The label of a group of tags in the editor's list: a label that is a built-in component's name gets the file in brackets, so it
// cannot take its place
#let final-label(label, path) = if label in built-in-components { label + " (" + path + ")" } else { label }

// What each file defines, and the tags of all files together
// The names `/src/kit.typ` gives a file are not its own definitions (`fa-tags` is a function of the kit, for one)
#import "/src/kit.typ" as kit-module
#let kit-names = dictionary(kit-module).keys()

#let loaded = {
  let tags = (:)
  let schemas = (:)
  let origin = (:)
  let components = (:)
  let docs = (:)
  for path in declared {
    let target = "/" + path
    import target as module
    let defined = dictionary(module)
    let own = (:)
    let described = (:)
    for (key, value) in defined {
      if key in kit-names or type(value) != dictionary { continue }
      if key.ends-with("-tags") {
        own += value
        components.insert(final-label(key.slice(0, -5), path), (tags: value.keys(), file: path))
      } else if key.ends-with("-schema") {
        described += value
      } else if key.ends-with("-docs") {
        docs.insert(final-label(key.slice(0, -5), path), value)
      }
    }
    let where = setting-prefix("components")
    assert(own.len() > 0, message: where + path + " defines no `<x>-tags`, so it gives no tag")
    for name in described.keys() {
      assert(name in own, message: where + path + " describes <" + name + "> in a `-schema` but defines no tag of that name")
    }
    for (name, handler) in own {
      assert(name.match(tag-name) != none, message: where + path + ": the tag name " + repr(name) + " must be lowercase letters, digits and -, starting with a letter")
      assert(name not in built-in-schemas, message: where + "<" + name + "> in " + path + " is a built-in tag; choose another name")
      assert(name not in origin, message: where + "<" + name + "> is defined in " + origin.at(name, default: "") + " and in " + path)
      origin.insert(name, path)
      tags.insert(name, handler)
    }
    schemas += described
  }
  (tags: tags, schemas: schemas, components: components, docs: docs, origin: origin)
}

// The code of the tags, and their schemas: a tag without one still gets a line mark and no attribute check
#let local-tags = loaded.tags
#let local-schemas = loaded.schemas
#let local-all-schemas = loaded.tags.keys().map(name => (name, loaded.schemas.at(name, default: no-schema))).to-dict()

// For the schema the editor reads: the tags of each file under its label, and the docs under the same label
#let local-components = loaded.components
#let local-docs = loaded.docs
