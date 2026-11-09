// The tags in the HTML output. A tag with an HTML form (`<name>-html` in its component file, collected by components/_registry.typ) uses it;
// any other tag keeps its PDF look and is put in the page as an inline picture (`in-frame` of src/html/kit.typ), so nothing is lost while
// the tags are given an HTML form one by one. Only used when `html-mode` is on (src/core.typ).
#import "/src/html/kit.typ": in-frame

/// A tag the page must not turn into a picture: an image and a caption stay as they are (a <fig> takes them apart)
#let html-passthrough = ("img", "caption")

/// The tags of the PDF as the page needs them: `impls` (the `<name>-html` of the components, tag to function) where a tag has one, and
/// a picture of the PDF look for each of the others. A child tag a parent reads (`scoped` in its schema) stays as it is.
#let html-adapt(tags, schemas, impls) = {
  let out = (:)
  for (name, handler) in tags {
    let impl = impls.at(name, default: none)
    if impl != none { out.insert(name, impl); continue }
    let spec = schemas.at(name, default: (:))
    // A child tag (<pros> in <compare>, <step> in <steps>) is read by its parent: it stays as it is, and the parent is the picture
    if spec.at("scoped", default: false) or name in html-passthrough { out.insert(name, handler); continue }
    let kind = spec.at("kind", default: "block")
    out.insert(name, if type(handler) == array {
      ("void", attrs => in-frame(kind, (handler.at(1))(attrs)))
    } else {
      (attrs, body) => in-frame(kind, handler(attrs, body))
    })
  }
  out
}
