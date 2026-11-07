// An address on the internet (`https://...`) is not a path Typst can open, so it is written as a path under `/.remote/` that the app
// reads back as the address: every character that is not a letter, a digit, `_` or `-` becomes `~` and two hex digits per UTF-8 byte
// (a `.` too), and a long address goes over several folders of at most 150 characters. The app downloads the file the first time,
// keeps it in its cache folder, and serves it from there at every later compile (the sync button downloads it again).
// A file outside the project (`file:///home/me/a.png`, `file:///C:/Users/me/a.png`) is the same, under `/.external/`: copied into the
// cache, and copied again when the original changes. (`/x` stays the root of the project, as in Typst.)
#let is-remote(p) = type(p) == str and (p.starts-with("http://") or p.starts-with("https://") or p.starts-with("file://"))
#let remote-path(url) = {
  let safe = regex("^[A-Za-z0-9_-]$")
  let parts = ((),)
  let size = 0
  for c in url.clusters() {
    let piece = if c.match(safe) != none { c } else { array(bytes(c)).map(b => "~" + upper(if b < 16 { "0" } else { "" } + str(b, base: 16))).join() }
    if size + piece.len() > 150 {
      parts.push(())
      size = 0
    }
    parts.last().push(piece)
    size += piece.len()
  }
  (if url.starts-with("file://") { "/.external/" } else { "/.remote/" }) + parts.map(p => p.join()).join("/")
}
