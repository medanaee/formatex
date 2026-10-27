#import "/src/prelude.typ": *


#let tinted(hue) = (
  fill: color.mix((hue, if theme.dark { 16% } else { 10% }), (theme.bg, if theme.dark { 84% } else { 90% })),
  border: color.mix((hue, if theme.dark { 45% } else { 35% }), (theme.bg, if theme.dark { 55% } else { 65% })),
  icon: if theme.dark { hue.lighten(30%) } else { hue.darken(15%) },
)

// A preset name gets theme-aware tints; a hex color is used as given (toned down on dark pages).
#let resolve-color(name, attrs: none) = {
  if name in color-presets { return tinted(color-presets.at(name)) }
  assert(name.starts-with("#"), message: at-of(attrs) + "Unknown color " + repr(name) + "; use a hex color or one of: " + color-names.join(", ") + " (optionally with a shade, like blue-200)")
  let c = rgb(name)
  if theme.dark {
    (fill: color.mix((c, 22%), (theme.bg, 78%)), border: c.transparentize(50%), icon: theme.fg)
  } else {
    (fill: c, border: color.mix((c, 60%), (theme.fg, 40%)), icon: theme.fg)
  }
}

// The frame of <box> and <alert>: a full-width block labelled <component-panel>. An <item> resizes
// it with a show rule (`fit-panel`), so the grid can measure items in their default look.
// `narrow` is an alternative inside for a content-wide frame (the alert's icon row).
#let panel(args, wide, narrow: none) = [#block(
  width: 100%, ..args,
  if narrow == none { wide } else [#metadata((panel-narrow: narrow))#wide],
)<component-panel>]
