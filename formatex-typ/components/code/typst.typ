#import "/src/kit.typ": *

// "3,7-9" -> (3, 7, 8, 9)
#let parse-line-set(s) = {
  let out = ()
  for part in s.split(",").map(p => p.trim()).filter(p => p != "") {
    let ends = part.split("-").map(p => int(p.trim()))
    out += range(ends.first(), ends.last() + 1)
  }
  out
}

#let code-tags = (
    // <code src="file.py" lines="10-20" highlight="12,15-16" caption="..." id="...">,
    // or the same attributes around a fenced code block.
    code: (attrs, body) => {
      let (source, lang) = if "src" in attrs {
        (read(root-path(attrs.src)), attrs.at("lang", default: attrs.src.split(".").last()))
      } else {
        let r = find-raw(body)
        assert(r != none, message: at-of(attrs) + "<code> needs src=\"file\" or a fenced code block inside it")
        (r.text, attrs.at("lang", default: r.at("lang", default: none)))
      }
      let all = source.split("\n").map(l => l.trim("\r", at: end))
      let first = 1
      if "lines" in attrs {
        let ends = attrs.lines.split("-").map(p => int(p.trim()))
        first = ends.first()
        let last = calc.min(ends.last(), all.len())
        assert(first >= 1 and first <= last, message: at-of(attrs) + "<code> lines " + repr(attrs.lines) + " is outside the code (" + str(all.len()) + " lines)")
        all = all.slice(first - 1, last)
      }
      let code-block = raw(all.join("\n"), lang: lang, block: true)
      let caption = attrs.at("caption", default: none)
      let id = attrs.at("id", default: none)

      code-options.update((start: first, highlight: parse-line-set(attrs.at("highlight", default: ""))))
      span-columns(attrs, "code", captioned(
        "code", raw, "کد", "Listing", code-block,
        caption: caption, id: id,
        numbering: caption-flag(attrs, "numbering"), position: attrs.at("caption-position", default: none),
        listed: caption-flag(attrs, "lol") != false,
      ))
      code-options.update((:))
    },
)

// The HTML form (optional, used by the HTML export): the code with its caption and number; the page draws the frame of the block and the
// copy button; the shared code-options state also supplies line numbers and highlighted lines
