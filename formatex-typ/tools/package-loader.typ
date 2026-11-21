// Runs project package declarations with the same kit, without requiring engine source files.
#let pdf-load-package(path) = {
  let source = read("/" + path)
  let clean = source.replace(regex("(?m)^#import\\s+\"/src/[^\"]+\\.typ\"[^\n]*"), "")
  let folder = path.split("/").slice(0, -1).join("/")
  clean = clean.replace(regex("\\b(include|import)(\\s+)\"([^\"@/:][^\"]*)\""), m => m.captures.at(0) + m.captures.at(1) + "\"/" + folder + "/" + m.captures.at(2) + "\"")
  let names = clean.matches(regex("(?m)^#let\\s+([\\w-]+-tags)\\s*=")).map(m => m.captures.first())
  let exports = names.map(name => repr(name) + ": " + name).join(",")
  let result = eval(clean + "\n#metadata((fx-package-exports: (" + exports + ",)))", mode: "markup", scope: formatex-package-scope)
  let find(content) = {
    if content.func() == metadata and type(content.value) == dictionary and "fx-package-exports" in content.value { return content.value.at("fx-package-exports") }
    if content.has("children") { for child in content.children { let value = find(child); if value != none { return value } } }
    none
  }
  let values = find(result)
  assert(values != none, message: "No tag declarations in component package " + path)
  values
}
