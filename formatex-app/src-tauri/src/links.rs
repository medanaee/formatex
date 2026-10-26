//! What the preview needs to make a page interactive. A page is shown as an SVG image, which has no links and no text to click, so
//! the compiler also reports where the links are and where the text runs are (in points, from the page's top start corner):
//!
//! - links: an external URL, or a place in the document (a page and a point on it);
//! - text runs: their words and boxes, which the editor uses to find the source line of a clicked word.

use serde::Serialize;
use typst::layout::{Frame, FrameItem};
use typst::model::Destination;
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
