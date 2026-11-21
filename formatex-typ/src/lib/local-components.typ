// Package discovery reads data only. Implementations are loaded by their renderer.
#import "/src/core.typ": base-config, front-matter, setting-prefix
#import "/src/lib/vars.typ": rooted-path

#let listed(value) = if value == none { () } else if type(value) == str { (value,) } else { value }
#let component-folders = {
  let out = ()
  for path in listed(base-config.at("components", default: none)) + listed(front-matter.at("components", default: none)) {
    assert(type(path) == str and path.trim() != "", message: setting-prefix("components") + "components must contain folder paths")
    let clean = path.trim().trim("/", at: end).trim(regex("^(\\./)+"), at: start)
    assert(not clean.split("/").contains("..") and not clean.starts-with("/") and not clean.contains(":"), message: setting-prefix("components") + "component folders must stay inside the project")
    assert(not ("src/", "components/", "tools/").any(prefix => clean.starts-with(prefix)), message: setting-prefix("components") + "component folder shadows engine files")
    if clean not in out { out.push(clean) }
  }
  out
}
#let component-file(folder, manifest, key, default) = {
  let file = manifest.at(key, default: default)
  if file == false { return none }
  assert(type(file) == str and file.match(regex("^[a-zA-Z0-9_.-]+$")) != none, message: setting-prefix("components") + "invalid " + key + " file in " + folder)
  folder + "/" + file
}
#let local-packages = {
  let out = (:)
  for folder in component-folders {
    let manifest = toml(rooted-path(folder + "/manifest.toml"))
    let name = manifest.at("name", default: folder.split("/").last())
    assert(name not in out, message: setting-prefix("components") + "duplicate component package " + name)
    let schema = json(rooted-path(component-file(folder, manifest, "schema", "schema.json")))
    let docs = json(rooted-path(component-file(folder, manifest, "docs", "docs.json")))
    let typ-file = component-file(folder, manifest, "typ", "typst.typ")
    let html-file = component-file(folder, manifest, "html", "html.tsx")
    assert(typ-file != none or html-file != none, message: setting-prefix("components") + "a package needs typst.typ or html.tsx")
    out.insert(name, (folder: folder, typ: typ-file, html: html-file, css: if html-file == none { none } else { component-file(folder, manifest, "css", "html.css") }, schemas: schema, docs: docs))
  }
  out
}
#let local-schemas = {
  let out = (:)
  for (name, package) in local-packages {
    for (tag, schema) in package.schemas {
      assert(tag not in out, message: setting-prefix("components") + "duplicate project tag <" + tag + ">")
      out.insert(tag, schema)
    }
  }
  out
}
#let local-components = local-packages.pairs().map(((name, package)) => (name, (tags: package.schemas.keys(), file: package.folder + "/manifest.toml"))).to-dict()
#let local-docs = local-packages.pairs().map(((name, package)) => (name, package.docs)).to-dict()
