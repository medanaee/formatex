// The stylesheet of the HTML output: the theme, the feel and the fonts as CSS variables, then the rules that make the page look like the
// PDF (the same colors, corners, fonts, tables) and reflow with the width of the window. Fixed, so that it travels with the engine.
// Nothing here is used by the PDF.
#import "/src/core.typ": *

#import "/src/html/kit.typ": css-px
#import "/src/html/viewer.typ": feel-font-families
#let css-hex(c) = rgb(c).to-hex()
#let css-font(name) = "\"" + name + "\""

// The font lists of the page: each character takes the first font that has it, like in the PDF
#let serif-fonts = ("New Computer Modern",)
#let body-fonts = (latin-font, persian-font)
#let font-stack(fonts, fallback) = fonts.map(css-font).join(", ") + ", " + fallback
#let body-stack = font-stack(body-fonts, if latin-font in serif-fonts { "serif" } else { "system-ui, sans-serif" })
#let code-stack = font-stack((code-font, persian-font), "ui-monospace, monospace")

/// The families the page names: the app reads them (`<meta name="fx-fonts">`) to put the font files in the file.
#let html-font-families = (latin-font, persian-font, code-font, ..feel-font-families).dedup()

#let heading-hue = css-hex(heading-color)

#let css-variables = {
  let vars = (
    ("bg", css-hex(theme.bg)), ("fg", css-hex(theme.fg)), ("heading", heading-hue), ("muted", css-hex(theme.muted)),
    ("accent", css-hex(theme.accent)), ("secondary", css-hex(theme.secondary)), ("rule", css-hex(theme.rule)),
    ("code-bg", css-hex(theme.code-bg)), ("code-stroke", css-hex(theme.code-stroke)),
    ("r-code", css-px(feel.code)), ("r-inline", css-px(feel.inline)), ("r-badge", css-px(feel.badge)), ("r-alert", css-px(feel.alert)),
    ("r-box", css-px(feel.box)), ("r-image", css-px(feel.image)), ("r-heading", css-px(feel.heading)),
    ("zoom", str(zoom)),
    // How a tint is mixed from its hue (see `tinted` in src/lib/colors.typ): the page mixes it in CSS, so it follows the theme
    ("tf", if theme.dark { "16%" } else { "10%" }), ("tb", if theme.dark { "45%" } else { "35%" }),
    ("ic-pct", if theme.dark { "70%" } else { "85%" }), ("ic-with", if theme.dark { "white" } else { "black" }), ("ink-fg", if theme.dark { "0%" } else { "30%" }),
    // A color given as hex is used as it is on a light page and toned down on a dark one (`resolve-color` of src/lib/colors.typ)
    ("hf", if theme.dark { "22%" } else { "100%" }), ("hb", if theme.dark { "50%" } else { "60%" }), ("hb-with", if theme.dark { "transparent" } else { "var(--fg)" }),
  )
  let scheme = if theme.dark { "dark" } else { "light" }
  ":root { color-scheme: " + scheme + "; " + vars.map(((k, v)) => "--" + k + ": " + v).join("; ") + "; --font-body: " + body-stack + "; --font-code: " + code-stack + "; }"
}

// The headings look of [heading]: a rule below and / or a tint, on the levels up to `max-level`
#let heading-css = {
  let levels = range(1, heading-max-level + 1)
  let selector = levels.map(l => ".fx-doc h" + str(l)).join(", ")
  let tint = "background: color-mix(in srgb, " + "var(--heading)" + " " + (if theme.dark { "9%" } else { "10%" }) + ", var(--bg)); padding: .45em .85em; "
  let rule = "border-bottom: 1px solid var(--heading); "
  let corners = if heading-underline { "border-radius: var(--r-heading) var(--r-heading) 0 0; " } else { "border-radius: var(--r-heading); " }
  if heading-underline or heading-fill {
    let parts = (if heading-fill { tint } else { "padding-bottom: .4em; " }, if heading-underline { rule } else { "" }, corners)
    selector + " { " + parts.join() + "}"
  } else { "" }
}

#let table-css = if feel.table == "rules" {
  ".fx-table table { border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); } .fx-table thead th { border-bottom: 1px solid var(--rule); }"
} else if feel.table == "lined" {
  ".fx-table { border: 1px solid var(--code-stroke); border-radius: var(--r-box); } .fx-table thead th { background: color-mix(in srgb, var(--secondary) 8%, var(--bg)); } .fx-table tbody td { border-top: 1px solid var(--code-stroke); }"
} else {
  ".fx-table { border: 1px solid var(--code-stroke); border-radius: var(--r-box); } .fx-table thead th { background: color-mix(in srgb, var(--secondary) 16%, var(--bg)); } .fx-table tbody tr:nth-child(even) td { background: var(--code-bg); } .fx-table th, .fx-table td { padding: .8em 1.3em; }"
}

#let page-css = `````css
html { background: var(--bg); -webkit-text-size-adjust: 100%; }
body { margin: 0; overflow-x: clip; background: var(--bg); color: var(--fg); font-family: var(--font-body); font-size: calc(1.0625rem * var(--zoom)); line-height: 1.8; }
.fx-doc { max-width: 47em; margin: 0 auto; padding: clamp(1rem, 5vw, 3rem) clamp(1rem, 5vw, 2rem) 4rem; overflow-wrap: break-word; }
.fx-doc p, .fx-doc li, .fx-doc h1, .fx-doc h2, .fx-doc h3, .fx-doc h4, .fx-doc h5, .fx-doc h6, .fx-doc td, .fx-doc th, .fx-doc blockquote, .fx-doc figcaption, .fx-doc dd, .fx-doc dt { unicode-bidi: plaintext; }
.fx-doc p { margin: 0 0 1em; }
.fx-doc h1, .fx-doc h2, .fx-doc h3, .fx-doc h4, .fx-doc h5, .fx-doc h6 { color: var(--heading); line-height: 1.4; margin: 1.5em 0 .7em; font-weight: 700; }
.fx-doc h1 { font-size: 1.55em; } .fx-doc h2 { font-size: 1.3em; } .fx-doc h3 { font-size: 1.12em; } .fx-doc h4, .fx-doc h5, .fx-doc h6 { font-size: 1em; }
.fx-doc a { color: var(--accent); text-decoration: underline; text-underline-offset: .18em; }
.fx-doc ul, .fx-doc ol { margin: 0 0 1em; padding-inline-start: 1.6em; }
.fx-doc li { margin: .25em 0; } .fx-doc li > p { margin: 0; }
.fx-ol { list-style: none; padding-inline-start: 0 !important; }
.fx-li { display: flex; gap: .55em; align-items: baseline; }
.fx-num { flex: none; min-width: 1.5em; text-align: end; color: var(--muted); font-variant-numeric: tabular-nums; unicode-bidi: plaintext; }
.fx-li-body { flex: 1; min-width: 0; }
.fx-li-body > :first-child { margin-top: 0; } .fx-li-body > :last-child { margin-bottom: 0; }
.fx-doc hr { border: 0; border-top: 1px solid var(--rule); margin: 1.6em 0; }
.fx-doc img, .fx-doc svg { max-width: 100%; }
.fx-doc svg[style] { height: auto !important; }
.fx-doc strong { font-weight: 700; }
.fx-doc blockquote { margin: 1.4em 1.5em; padding: .2em 1em; border-inline-start: 2.5px solid var(--accent); color: var(--muted); font-style: italic; }
.fx-doc :not(pre) > code { font-family: var(--font-code); direction: ltr; unicode-bidi: isolate; font-size: .9em; background: var(--code-bg); border: 1px solid var(--code-stroke); border-radius: var(--r-inline); padding: .1em .3em; }
.fx-code { position: relative; direction: ltr; text-align: left; margin: 1.3em 0; background: var(--code-bg); border: 1px solid var(--code-stroke); border-radius: var(--r-code); }
.fx-code pre { margin: 0; padding: .9em 1em; overflow-x: auto; font-family: var(--font-code); font-size: .85em; line-height: 1.6; tab-size: 4; }
.fx-code pre code { font-family: inherit; background: none; border: 0; padding: 0; }
.fx-code[data-lang] { padding-top: 1.1em; }
.fx-code[data-lang]::before { content: attr(data-lang); position: absolute; top: 0; right: 0; padding: .15em .7em; font: 700 .7em/1.6 var(--font-body); color: var(--fg); background: color-mix(in srgb, var(--code-bg) 90%, var(--fg)); border: 1px solid var(--code-stroke); border-radius: 0 var(--r-code) 0 var(--r-badge); }
.fx-copy { position: absolute; top: .35em; left: .4em; z-index: 1; font: inherit; font-size: .7em; line-height: 1.4; color: var(--muted); background: var(--bg); border: 1px solid var(--code-stroke); border-radius: var(--r-badge); padding: .15em .6em; cursor: pointer; opacity: .85; }
.fx-copy:hover { opacity: 1; color: var(--fg); }
.fx-table { overflow-x: auto; margin: 1.3em auto; width: fit-content; max-width: 100%; }
.fx-table-full { width: 100%; }
.fx-table table { border-collapse: collapse; font-size: .9em; width: 100%; }
.fx-table th, .fx-table td { padding: .6em .8em; text-align: center; vertical-align: middle; }
.fx-table th { color: var(--heading); font-weight: 700; }
.fx-doc figure { margin: 1.4em 0; text-align: center; }
.fx-doc figcaption { color: var(--muted); font-size: .92em; margin-top: .5em; }
.fx-panel, .fx-badge { --hue: transparent; --panel-fill: color-mix(in srgb, var(--hue) var(--tf), var(--bg)); --panel-border: color-mix(in srgb, var(--hue) var(--tb), var(--bg)); }
.fx-panel { margin: 1.1em 0; padding: .85em 1.1em; border-radius: var(--r-alert); border: 1px solid var(--panel-border); background: var(--panel-fill); }
.fx-panel[style*="--hexc"], .fx-badge[style*="--hexc"] { --panel-fill: color-mix(in srgb, var(--hexc) var(--hf), var(--bg)); --panel-border: color-mix(in srgb, var(--hexc) var(--hb), var(--hb-with)); }
.fx-panel[style*="--hexc"] .fx-icon svg path:not([fill="none"]) { fill: var(--fg); }
.fx-panel[style*="--hue"] .fx-alert-icon svg path:not([fill="none"]), .fx-badge[style*="--hue"] .fx-icon svg path:not([fill="none"]) { fill: color-mix(in srgb, var(--hue) var(--ic-pct), var(--ic-with)); }
.fx-panel > :first-child { margin-top: 0; } .fx-panel > :last-child { margin-bottom: 0; }
.fx-icon { display: inline-block; vertical-align: -.15em; line-height: 1; }
.fx-icon svg { display: inline-block; vertical-align: top; height: 1em !important; width: auto !important; }
.fx-toc { margin: 1.4em 0 2em; }
.fx-toc-title { font-size: 1.3em; font-weight: 700; color: var(--heading); margin: 0 0 .5em; }
.fx-toc-item { margin: .2em 0; unicode-bidi: plaintext; }
.fx-toc-item a { color: var(--fg); text-decoration: none; }
.fx-toc-item a:hover { color: var(--accent); text-decoration: underline; }
.fx-frame { margin: 1.1em 0; text-align: center; }
.fx-frame-inline { display: inline-block; vertical-align: middle; }
.fx-frame svg { display: block; margin-inline: auto; max-width: 100%; }
.fx-frame-inline svg { margin: 0; }
@media (max-width: 40em) { .fx-doc { font-size: .97em; } .fx-doc blockquote { margin-inline: .5em; } }
@media print { .fx-copy { display: none; } .fx-doc { max-width: none; padding: 0; } }
`````.text

/// The script of the copy button: it puts a button in every code block (`.fx-code`) and copies the text of its `<pre>`. Only added when the
/// export dialog asks for it (`--input html-copy-code=true`).
#let copy-script = `````js
(function () {
  var words = { fa: ["کپی", "کپی شد"], en: ["Copy", "Copied"] };
  var text = words[(document.documentElement.lang || "en").slice(0, 2)] || words.en;
  document.querySelectorAll(".fx-code").forEach(function (box) {
    var pre = box.querySelector("pre");
    if (!pre) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "fx-copy";
    button.textContent = text[0];
    button.addEventListener("click", function () {
      var code = pre.innerText;
      var done = function () {
        button.textContent = text[1];
        setTimeout(function () { button.textContent = text[0]; }, 1500);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).then(done);
      } else {
        var area = document.createElement("textarea");
        area.value = code;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        try { document.execCommand("copy"); done(); } catch (error) {}
        document.body.removeChild(area);
      }
    });
    box.appendChild(button);
  });
})();
`````.text

/// The `<style>` of the page: the variables of the theme, the base rules, then the CSS of the components (`<name>-css`, joined by the registry,
/// and the user's own). A function: `html` only exists when the HTML export is on, so nothing here may run for the PDF.
#let html-style(components-css) = html.elem("style", css-variables + "\n" + page-css + "\n" + heading-css + "\n" + table-css + "\n" + components-css)
