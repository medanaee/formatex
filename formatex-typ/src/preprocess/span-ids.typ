#import "/src/prelude.typ": *
#import "/src/preprocess/common.typ": fence-match, option-token


// `[text]{#id}` -> `<span id="id">text</span>`; `[text]{#id highlight=green}` and `[text]{highlight=true}`
// add the highlight attribute (the same token syntax as the other `{...}` lines). Braces holding anything
// else are left as they are. Fenced code blocks are skipped.
#let span-ids-re-1 = regex("(^|[^!])\[([^\]

]+)\]\{([^{}

]*)\}")

#let span-ids(src) = {
  if not src.contains("]{") { return src }
  let lines = src.split("\n")
  let fence = none
  let out = ()
  for line in lines {
    let f = fence-match(line)
    if f != none {
      let mark = f.captures.first().first()
      if fence == none { fence = mark } else if mark == fence { fence = none }
      out.push(line)
      continue
    }
    if fence != none or not line.contains("]{") {
      out.push(line)
      continue
    }
    let token = option-token
    let l = line.replace(span-ids-re-1, m => {
      let (prefix, txt, opts) = m.captures
      if opts.trim() == "" or opts.replace(token, "").trim() != "" { return m.text }
      let attrs = ""
      for t in opts.matches(token) {
        let (id, key, quoted, bare) = t.captures
        if id != none { attrs += " id=\"" + id + "\""; continue }
        assert(key in option-keys("span", without: ("id",)), message: "Unknown span option " + repr(key) + "; available: " + option-keys("span", without: ("id",)).join(", "))
        attrs += " " + key + "=\"" + if quoted != none { quoted } else { bare } + "\""
      }
      prefix + "<span" + attrs + ">" + txt + "</span>"
    })
    out.push(l)
  }
  out.join("\n")
}
