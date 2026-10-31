//! What the preview needs to make a page interactive. A page is shown as an SVG image, which has no links and no text to click, so
//! the compiler also reports where the links are and where the text runs are (in points, from the page's top start corner):
//!
//! - links: an external URL, or a place in the document (a page and a point on it);
//! - text runs: their words and boxes, which the editor uses to find the source line of a clicked word;
//! - markers: where each block of the user's Markdown starts on the pages (the engine puts an invisible `fx-mark` there when it is
//!   built with `markers=1`), which the editor uses to go from a source line to a place on a page and back.

use serde::Serialize;
use typst::foundations::{Label, Selector, Value};
use typst::introspection::{Introspector, MetadataElem};
use typst::layout::{Frame, FrameItem};
use typst::model::Destination;
use typst::utils::PicoStr;
use typst_layout::{Page, PagedDocument};

/// Runs of text kept per page; a page has a few hundred, the cap only stops a pathological one.
const MAX_RUNS: usize = 6000;

#[derive(Serialize)]
pub struct LinkBox {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    /// An external address.
    url: Option<String>,
    /// For an internal link: the 1-based page and the point on it.
    page: Option<usize>,
    px: f64,
    py: f64,
}

#[derive(Serialize)]
pub struct TextBox {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    text: String,
}

#[derive(Serialize, Default)]
pub struct PageMap {
    /// The size of the page in points: the units of every box.
    width: f64,
    height: f64,
    links: Vec<LinkBox>,
    texts: Vec<TextBox>,
}

/// An affine map `x' = a x + c y + e`, `y' = b x + d y + f`.
#[derive(Clone, Copy)]
struct Affine([f64; 6]);

impl Affine {
    const IDENTITY: Affine = Affine([1.0, 0.0, 0.0, 1.0, 0.0, 0.0]);

    /// `self` applied after `inner`.
    fn after(self, inner: Affine) -> Affine {
        let [pa, pb, pc, pd, pe, pf] = self.0;
        let [qa, qb, qc, qd, qe, qf] = inner.0;
        Affine([
            pa * qa + pc * qb,
            pb * qa + pd * qb,
            pa * qc + pc * qd,
            pb * qc + pd * qd,
            pa * qe + pc * qf + pe,
            pb * qe + pd * qf + pf,
        ])
    }

    fn translate(x: f64, y: f64) -> Affine {
        Affine([1.0, 0.0, 0.0, 1.0, x, y])
    }

    fn apply(self, x: f64, y: f64) -> (f64, f64) {
        let [a, b, c, d, e, f] = self.0;
        (a * x + c * y + e, b * x + d * y + f)
    }

    /// The bounding box of a rectangle mapped through `self`: x, y, w, h.
    fn rect(self, x: f64, y: f64, w: f64, h: f64) -> (f64, f64, f64, f64) {
        let corners = [self.apply(x, y), self.apply(x + w, y), self.apply(x, y + h), self.apply(x + w, y + h)];
        let min_x = corners.iter().map(|c| c.0).fold(f64::INFINITY, f64::min);
        let max_x = corners.iter().map(|c| c.0).fold(f64::NEG_INFINITY, f64::max);
        let min_y = corners.iter().map(|c| c.1).fold(f64::INFINITY, f64::min);
        let max_y = corners.iter().map(|c| c.1).fold(f64::NEG_INFINITY, f64::max);
        (min_x, min_y, max_x - min_x, max_y - min_y)
    }
}

fn walk(document: &PagedDocument, frame: &Frame, map: Affine, out: &mut PageMap) {
    for (position, item) in frame.items() {
        let here = map.after(Affine::translate(position.x.to_pt(), position.y.to_pt()));
        match item {
            FrameItem::Group(group) => {
                let t = group.transform;
                let own = Affine([t.sx.get(), t.ky.get(), t.kx.get(), t.sy.get(), t.tx.to_pt(), t.ty.to_pt()]);
                walk(document, &group.frame, here.after(own), out);
            }
            FrameItem::Link(destination, size) => {
                let (x, y, w, h) = here.rect(0.0, 0.0, size.x.to_pt(), size.y.to_pt());
                let mut link = LinkBox { x, y, w, h, url: None, page: None, px: 0.0, py: 0.0 };
                match destination {
                    Destination::Url(url) => link.url = Some(url.to_string()),
                    Destination::Position(position) => {
                        link.page = Some(position.page.get());
                        link.px = position.point.x.to_pt();
                        link.py = position.point.y.to_pt();
                    }
                    Destination::Location(location) => {
                        let Some(position) = document.introspector().position(*location) else { continue };
                        link.page = Some(position.page.get());
                        link.px = position.point.x.to_pt();
                        link.py = position.point.y.to_pt();
                    }
                }
                out.links.push(link);
            }
            FrameItem::Text(text) => {
                if out.texts.len() >= MAX_RUNS || text.text.trim().is_empty() {
                    continue;
                }
                let size = text.size.to_pt();
                let width = text.width().to_pt();
                // The run starts at its baseline; the box covers the line it sits on
                let (x, y, w, h) = here.rect(0.0, -size * 0.85, width, size * 1.25);
                out.texts.push(TextBox { x, y, w, h, text: text.text.to_string() });
            }
            _ => {}
        }
    }
}

/// The links and text runs of one page.
pub fn map_page(document: &PagedDocument, page: &Page) -> PageMap {
    let size = page.frame.size();
    let mut out = PageMap { width: size.x.to_pt(), height: size.y.to_pt(), ..PageMap::default() };
    walk(document, &page.frame, Affine::IDENTITY, &mut out);
    out
}

/// Where a block of the source starts in the document: the file and line the engine wrote into an invisible marker, and the place
/// the marker got on its page (1-based page, points from the page's top start corner).
#[derive(Serialize, Debug, PartialEq)]
pub struct Marker {
    pub file: String,
    pub line: usize,
    pub page: usize,
    pub x: f64,
    pub y: f64,
}

/// The label the engine's `fx-mark` carries (`src/core.typ`).
const MARKER_LABEL: &str = "fx-mark";

/// The value of a marker: `(fx: "path:line")`.
fn parse_marker(value: &Value) -> Option<(String, usize)> {
    let Value::Dict(dict) = value else { return None };
    let Ok(Value::Str(at)) = dict.get("fx") else { return None };
    let (file, line) = at.as_str().rsplit_once(':')?;
    let line: usize = line.parse().ok()?;
    (!file.is_empty() && line > 0).then(|| (file.to_string(), line))
}

/// Every marker of the document, in document order (empty when the engine was not built with `markers=1`).
pub fn markers(document: &PagedDocument) -> Vec<Marker> {
    let Some(label) = Label::new(PicoStr::intern(MARKER_LABEL)) else { return Vec::new() };
    let introspector = document.introspector();
    introspector
        .query(&Selector::Label(label))
        .iter()
        .filter_map(|content| {
            let value = &content.to_packed::<MetadataElem>()?.value;
            let (file, line) = parse_marker(value)?;
            let position = introspector.position(content.location()?)?;
            Some(Marker { file, line, page: position.page.get(), x: position.point.x.to_pt(), y: position.point.y.to_pt() })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use typst::foundations::{dict, Str};

    #[test]
    fn reads_the_file_and_line_of_a_marker() {
        let value = Value::Dict(dict! { "fx" => Str::from("docs/a b.md:12") });
        assert_eq!(parse_marker(&value), Some(("docs/a b.md".to_string(), 12)));
    }

    #[test]
    fn ignores_other_metadata() {
        assert_eq!(parse_marker(&Value::Dict(dict! { "heading-id" => Str::from("x") })), None);
        assert_eq!(parse_marker(&Value::Dict(dict! { "fx" => Str::from("main.md:0") })), None);
        assert_eq!(parse_marker(&Value::Dict(dict! { "fx" => Str::from("nocolon") })), None);
        assert_eq!(parse_marker(&Value::None), None);
    }
}
