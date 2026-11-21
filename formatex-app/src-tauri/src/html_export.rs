//! Font finishing for HTML produced by the independent React renderer or plain Typst.
//! The renderer names its required families in fx-fonts. Export embeds subset WOFF faces;
//! preview caches complete faces across edits and sends them only when requirements change.

use std::collections::HashSet;
use std::fmt::Write;
use std::io::Write as _;
use std::sync::{Arc, LazyLock, Mutex, Weak};

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD;
use flate2::Compression;
use flate2::write::ZlibEncoder;
use serde::Deserialize;
use typst::text::FontStyle;
use typst_kit::fonts::FontStore;

/// Native finishing options for plain Typst HTML. Formatex view options belong to its HTML engine.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct HtmlExport {
    pub embed_fonts: bool,
}
impl Default for HtmlExport { fn default() -> Self { Self { embed_fonts: true } } }

/// The families the engine named in `<meta name="fx-fonts">`.
fn font_families(html: &str) -> Vec<String> {
    let marker = "name=\"fx-fonts\" content=\"";
    let mut families = Vec::new();
    let mut remaining = html;
    while let Some(start) = remaining.find(marker).map(|at| at + marker.len()) {
        let Some(length) = remaining[start..].find('"') else { break };
        for family in remaining[start..start + length].split('|').map(str::trim).filter(|s| !s.is_empty()) {
            if !families.iter().any(|s: &String| s.eq_ignore_ascii_case(family)) { families.push(family.to_owned()); }
        }
        remaining = &remaining[start + length + 1..];
    }
    families
}

/// Whether the text of the page uses italic anywhere (the stylesheet always mentions it, so only the page itself is looked at).
fn uses_italic(html: &str) -> bool {
    let body = html.find("<main").map(|at| &html[at..]).unwrap_or(html);
    ["<em>", "<em ", "<i>", "<i ", "<cite", "<blockquote", "<dfn", "<var", "font-style: italic", "mathnormal", "mathit", "textit", "boldsymbol"].iter().any(|marker| body.contains(marker))
}

/// The characters the page shows: its text with the tags taken out and the entities decoded, the script's words (the copy button), the
/// printable ASCII (the language label of a code block comes from an attribute) and the marks that steer the shaping of Persian text.
pub fn page_chars(html: &str) -> HashSet<char> {
    let body = html.find("<main").map(|at| &html[at..]).unwrap_or(html);
    let mut chars: HashSet<char> = (0x20u8..0x7F).map(char::from).collect();
    chars.extend(['\u{A0}', '\u{200C}', '\u{200D}', '\u{200E}', '\u{200F}', '\u{202A}', '\u{202B}', '\u{202C}', '\u{2066}', '\u{2067}', '\u{2068}', '\u{2069}']);
    let mut in_tag = false;
    let mut entity = String::new();
    let mut in_entity = false;
    for c in body.chars() {
        match c {
            '<' if !in_tag => in_tag = true,
            '>' if in_tag => in_tag = false,
            _ if in_tag => {}
            '&' => {
                in_entity = true;
                entity.clear();
            }
            ';' if in_entity => {
                in_entity = false;
                let decoded = match entity.as_str() {
                    "amp" => Some('&'),
                    "lt" => Some('<'),
                    "gt" => Some('>'),
                    "quot" => Some('"'),
                    "apos" => Some('\''),
                    other => other
                        .strip_prefix("#x")
                        .and_then(|hex| u32::from_str_radix(hex, 16).ok())
                        .or_else(|| other.strip_prefix('#').and_then(|number| number.parse().ok()))
                        .and_then(char::from_u32),
                };
                chars.extend(decoded);
            }
            _ if in_entity => entity.push(c),
            _ => {
                chars.insert(c);
            }
        }
    }
    chars
}

fn be16(data: &[u8], at: usize) -> Option<usize> {
    Some(u16::from_be_bytes(data.get(at..at + 2)?.try_into().ok()?) as usize)
}

fn be32(data: &[u8], at: usize) -> Option<u32> {
    Some(u32::from_be_bytes(data.get(at..at + 4)?.try_into().ok()?))
}

// The subsetter currently writes a TrueType flavor even when it preserves CFF outlines.
// Browsers reject that combination. Restore the OpenType flavor and whole-font checksum.
fn normalize_outline_flavor(data: &mut [u8]) {
    let Some(count) = be16(data, 4) else { return };
    let mut cff = false;
    let mut head = None;
    for i in 0..count {
        let entry = 12 + i * 16;
        let Some(tag) = data.get(entry..entry + 4) else { return };
        if tag == b"CFF " || tag == b"CFF2" { cff = true; }
        if tag == b"head" { head = be32(data, entry + 8).map(|v| v as usize); }
    }
    if !cff || data.starts_with(b"OTTO") { return; }
    data[..4].copy_from_slice(b"OTTO");
    let Some(adjustment) = head.map(|at| at + 8).filter(|&at| at + 4 <= data.len()) else { return };
    data[adjustment..adjustment + 4].fill(0);
    let sum = data.chunks(4).fold(0u32, |sum, part| {
        let mut word = [0; 4]; word[..part.len()].copy_from_slice(part);
        sum.wrapping_add(u32::from_be_bytes(word))
    });
    data[adjustment..adjustment + 4].copy_from_slice(&0xB1B0AFBAu32.wrapping_sub(sum).to_be_bytes());
}

/// A TrueType / OpenType font as WOFF 1.0: the same tables, each deflated when that makes it smaller. `None` for anything that is not a
/// plain font file (a collection, a damaged file): the caller then keeps the font as it is.
pub fn to_woff(font: &[u8]) -> Option<Vec<u8>> {
    let flavor = be32(font, 0)?;
    if &font[0..4] == b"ttcf" || !matches!(flavor, 0x0001_0000 | 0x4F54_544F | 0x7472_7565) {
        return None;
    }
    let count = be16(font, 4)?;
    // (tag, checksum, the table)
    let mut tables: Vec<(u32, u32, &[u8])> = Vec::with_capacity(count);
    for i in 0..count {
        let entry = 12 + i * 16;
        let (tag, checksum, offset, length) = (be32(font, entry)?, be32(font, entry + 4)?, be32(font, entry + 8)? as usize, be32(font, entry + 12)? as usize);
        tables.push((tag, checksum, font.get(offset..offset.checked_add(length)?)?));
    }
    // The tables, in the order of the directory, each padded to four bytes
    let directory_end = 44 + count * 20;
    let mut body: Vec<u8> = Vec::new();
    let mut directory: Vec<u8> = Vec::with_capacity(count * 20);
    let mut sfnt_size = 12 + count * 16;
    for (tag, checksum, table) in &tables {
        let mut packed = ZlibEncoder::new(Vec::new(), Compression::best());
        packed.write_all(table).ok()?;
        let packed = packed.finish().ok()?;
        let stored: &[u8] = if packed.len() < table.len() { &packed } else { table };
        directory.extend_from_slice(&tag.to_be_bytes());
        directory.extend_from_slice(&((directory_end + body.len()) as u32).to_be_bytes());
        directory.extend_from_slice(&(stored.len() as u32).to_be_bytes());
        directory.extend_from_slice(&(table.len() as u32).to_be_bytes());
        directory.extend_from_slice(&checksum.to_be_bytes());
        body.extend_from_slice(stored);
        body.resize(body.len().div_ceil(4) * 4, 0);
        sfnt_size += table.len().div_ceil(4) * 4;
    }
    let total = directory_end + body.len();
    let mut out = Vec::with_capacity(total);
    out.extend_from_slice(b"wOFF");
    out.extend_from_slice(&flavor.to_be_bytes());
    out.extend_from_slice(&(total as u32).to_be_bytes());
    out.extend_from_slice(&(count as u16).to_be_bytes());
    out.extend_from_slice(&0u16.to_be_bytes());
    out.extend_from_slice(&(sfnt_size as u32).to_be_bytes());
    // The version of the font (not known here), and no metadata or private data
    out.extend_from_slice(&[0u8; 4 + 20]);
    out.extend_from_slice(&directory);
    out.extend_from_slice(&body);
    Some(out)
}

/// `@font-face` rules for the faces of the families the page names, with the font files inside.
pub fn font_faces(html: &str, store: &FontStore) -> String {
    font_faces_for(html, store, true)
}

fn font_faces_for(html: &str, store: &FontStore, subset: bool) -> String {
    let book = store.book();
    let italic = uses_italic(html);
    let chars = if subset { page_chars(html) } else { HashSet::new() };
    let mut css = String::new();
    let mut done = HashSet::new();
    for family in font_families(html) {
        // A page uses the regular and the bold face: a family with eighteen weights would add megabytes nobody reads. A family that has
        // neither gets the two faces nearest to regular. The italic faces come only when the page has italic text.
        let lookup_lower = family.to_lowercase();
        let lookup_name = match lookup_lower.as_str() {
            "cmu serif" | "cmu" | "computer modern" | "new computer modern 10" => "new computer modern",
            "cmu sans serif" => "dejavu sans",
            "cmu typewriter text" => "dejavu sans mono",
            _ => lookup_lower.as_str(),
        };
        let mut all: Vec<usize> = book.select_family(&lookup_lower).collect();
        if all.is_empty() && lookup_name != lookup_lower.as_str() {
            all = book.select_family(lookup_name).collect();
        }
        let weight = |index: usize| book.info(index).map(|info| info.variant.weight.to_number()).unwrap_or(400);
        let mut chosen = Vec::new();
        for style in [FontStyle::Normal, FontStyle::Italic] {
            if style == FontStyle::Italic && !italic { continue; }
            for css_weight in [400u16, 700u16] {
                let nearest = all.iter().copied()
                    .filter(|&index| book.info(index).is_some_and(|info| info.variant.style == style || (style == FontStyle::Italic && info.variant.style == FontStyle::Oblique)))
                    .min_by_key(|&index| weight(index).abs_diff(css_weight));
                if let Some(index) = nearest {
                    if !chosen.iter().any(|&(seen, _)| seen == index) { chosen.push((index, css_weight)); }
                }
            }
        }
        for (index, css_weight) in chosen {
            let (Some(info), Some(font)) = (book.info(index), store.font(index)) else { continue };
            // A font collection holds several faces in one file: the data is the same for each
            let data = font.data();
            if !done.insert((family.to_lowercase(), css_weight, info.variant.style as u8)) {
                continue;
            }
            // Stock NewCM CFF faces are rejected by some WebViews. The quadratic HTML-only
            // equivalents preserve glyph metrics and shaping; PDF continues to use the original.
            let browser_data: &[u8] = if info.family.eq_ignore_ascii_case("new computer modern") && data.starts_with(b"OTTO") {
                match (css_weight >= 600, info.variant.style != FontStyle::Normal) {
                    (false, false) => include_bytes!("../web-fonts/newcm-regular.ttf"),
                    (true, false) => include_bytes!("../web-fonts/newcm-bold.ttf"),
                    (false, true) => include_bytes!("../web-fonts/newcm-italic.ttf"),
                    (true, true) => include_bytes!("../web-fonts/newcm-bolditalic.ttf"),
                }
            } else { data.as_slice() };
            let cut = if subset { fontcull::subset_font_data(browser_data, &chars, &[]).ok().filter(|cut| cut.len() < browser_data.len()).map(|mut cut| { normalize_outline_flavor(&mut cut); cut }) } else { None };
            let source: &[u8] = cut.as_deref().unwrap_or(browser_data);
            let (mime, format, bytes) = match to_woff(source) {
                Some(woff) => ("font/woff", "woff", woff),
                None if source.starts_with(b"OTTO") => ("font/otf", "opentype", source.to_vec()),
                None => ("font/ttf", "truetype", source.to_vec()),
            };
            let style = match info.variant.style {
                FontStyle::Normal => "normal",
                FontStyle::Italic => "italic",
                FontStyle::Oblique => "oblique",
            };
            let encoded_bytes = STANDARD.encode(&bytes);
            let _ = write!(
                css,
                "@font-face {{ font-family: \"{}\"; font-weight: {}; font-style: {}; font-display: swap; src: url(data:{};base64,{}) format(\"{}\"); }}\n",
                family,
                css_weight,
                style,
                mime,
                encoded_bytes,
                format,
            );

        }
    }
    css
}

struct PreviewFontEntry {
    store: Weak<FontStore>,
    requirements: String,
    key: String,
    css: String,
}

static PREVIEW_FONTS: LazyLock<Mutex<Vec<PreviewFontEntry>>> = LazyLock::new(|| Mutex::new(Vec::new()));

/// Complete faces are reusable across edits; a new FontStore after import/reload invalidates its entries.
pub fn preview_fonts(html: &str, store: &Arc<FontStore>, known: Option<&str>) -> (String, Option<String>) {
    let requirements = format!("{:?}|{}", font_families(html), uses_italic(html));
    let mut cache = PREVIEW_FONTS.lock().unwrap_or_else(|e| e.into_inner());
    cache.retain(|entry| entry.store.strong_count() > 0);
    let weak = Arc::downgrade(store);
    if let Some(entry) = cache.iter().find(|entry| entry.store.ptr_eq(&weak) && entry.requirements == requirements) {
        return (entry.key.clone(), (known != Some(entry.key.as_str())).then(|| entry.css.clone()));
    }
    let css = font_faces_for(html, store, false);
    let key = format!("{:032x}", typst::utils::hash128(&css));
    let response = (key.clone(), (known != Some(key.as_str())).then(|| css.clone()));
    if cache.len() >= 8 { cache.remove(0); }
    cache.push(PreviewFontEntry { store: weak, requirements, key, css });
    response
}

/// The page with its fonts inside (in a `<style>` at the end of the head).
pub fn embed_fonts(html: String, store: &FontStore) -> String {
    let css = font_faces(&html, store);
    if css.is_empty() {
        return html;
    }
    let style = format!("<style>{css}</style>");
    match html.find("</head>") {
        Some(at) => format!("{}{style}{}", &html[..at], &html[at..]),
        None => format!("{style}{html}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;

    #[test]
    fn repairs_cff_subset_flavor_and_checksum() {
        let mut font = vec![0u8; 80];
        font[..4].copy_from_slice(&0x00010000u32.to_be_bytes());
        font[4..6].copy_from_slice(&2u16.to_be_bytes());
        font[12..16].copy_from_slice(b"CFF ");
        font[28..32].copy_from_slice(b"head");
        font[36..40].copy_from_slice(&60u32.to_be_bytes());
        normalize_outline_flavor(&mut font);
        assert!(font.starts_with(b"OTTO"));
        let sum = font.chunks_exact(4).fold(0u32, |sum, bytes| sum.wrapping_add(u32::from_be_bytes(bytes.try_into().unwrap())));
        assert_eq!(sum, 0xB1B0AFBA);
        let copy = font.clone();
        normalize_outline_flavor(&mut font);
        assert_eq!(font, copy);
    }

    #[test]
    fn reads_the_families_of_the_page() {
        let html = r#"<html><head></head><body><meta name="fx-fonts" content="Inter| IRANSansX |Anonymous Pro"></body></html>"#;
        assert_eq!(font_families(html), vec!["Inter", "IRANSansX", "Anonymous Pro"]);
        assert!(font_families("<html></html>").is_empty());
    }

    #[test]
    fn finds_italic_in_the_page_but_not_in_the_stylesheet() {
        assert!(!uses_italic("<style>p { font-style: italic }</style><main><p>x</p></main>"));
        assert!(uses_italic("<style></style><main><p><em>x</em></p></main>"));
        assert!(uses_italic("<main><blockquote>x</blockquote></main>"));
    }

    #[test]
    fn packs_a_font_as_woff_and_it_unpacks_to_the_same_tables() {
        // A real font of the app (the smallest of the bundled files that is a plain TrueType)
        let font = include_bytes!("../../fonts/AnonymousPro-Regular.ttf");
        let woff = to_woff(font).expect("a plain font packs");
        assert_eq!(&woff[0..4], b"wOFF");
        assert!(woff.len() < font.len(), "the WOFF is not smaller: {} of {}", woff.len(), font.len());
        assert_eq!(be32(&woff, 8).unwrap() as usize, woff.len());
        let count = be16(&woff, 12).unwrap();
        assert_eq!(count, be16(font, 4).unwrap());
        for i in 0..count {
            let entry = 44 + i * 20;
            let (offset, packed, original) = (be32(&woff, entry + 4).unwrap() as usize, be32(&woff, entry + 8).unwrap() as usize, be32(&woff, entry + 12).unwrap() as usize);
            let stored = &woff[offset..offset + packed];
            let mut table = Vec::new();
            if packed < original {
                flate2::read::ZlibDecoder::new(stored).read_to_end(&mut table).unwrap();
            } else {
                table.extend_from_slice(stored);
            }
            // The table of the original font with the same tag
            let tag = &woff[entry..entry + 4];
            let at = (0..count).map(|k| 12 + k * 16).find(|&k| &font[k..k + 4] == tag).unwrap();
            let (start, length) = (be32(font, at + 8).unwrap() as usize, be32(font, at + 12).unwrap() as usize);
            assert_eq!(table, &font[start..start + length], "table {:?} differs", String::from_utf8_lossy(tag));
        }
        assert!(to_woff(b"not a font").is_none());
    }

    #[test]
    fn reads_the_characters_of_the_page() {
        let chars = page_chars("<style>.x { content: 'zzz' }</style><main><p class=\"q\">سلام &amp; &lt;b&gt; &#1604; &#x6A9;</p></main>");
        for c in ['س', 'ل', 'ا', 'م', '&', '<', 'ل', 'ک', 'a', ' '] {
            assert!(chars.contains(&c), "{c:?} missing");
        }
        // The tags and the stylesheet are not text (but ASCII is always kept, so look for a letter that is not ASCII)
        assert!(!chars.contains(&'ژ'));
    }

    #[test]
    fn cuts_a_persian_font_down_and_keeps_its_shaping_tables() {
        let font = include_bytes!("../../fonts/Vazirmatn-Bold.ttf");
        let chars = page_chars("<main>سلام دنیا</main>");
        let cut = fontcull::subset_font_data(font, &chars, &[]).expect("the font is cut");
        assert!(cut.len() * 2 < font.len(), "not much smaller: {} of {}", cut.len(), font.len());
        // The shaping tables of the original stay, so the letters still take their forms
        let tags = |data: &[u8]| -> Vec<[u8; 4]> { (0..be16(data, 4).unwrap()).map(|i| data[12 + i * 16..16 + i * 16].try_into().unwrap()).collect() };
        for table in [*b"GSUB", *b"GPOS"] {
            if tags(font).contains(&table) {
                assert!(tags(&cut).contains(&table), "{} was dropped", String::from_utf8_lossy(&table));
            }
        }
        assert!(to_woff(&cut).is_some());
    }

    #[test]
    fn puts_the_fonts_in_the_head() {
        let store = crate::fonts::FontService::new(std::env::temp_dir().join("formatex-html-fonts-test")).get();
        let html = r#"<html><head><meta charset="utf-8"></head><body><meta name="fx-fonts" content="Vazirmatn|No Such Family"></body></html>"#.to_string();
        let out = embed_fonts(html, &store);
        let head = &out[..out.find("</head>").unwrap()];
        assert!(head.contains("<style>@font-face { font-family: \"Vazirmatn\""), "no Vazirmatn face in the head");
        assert!(head.contains("src: url(data:font/woff;base64,"));
        assert!(!head.contains("No Such Family"));
    }

    #[test]
    fn leaves_a_page_without_the_marker_alone() {
        let store = crate::fonts::FontService::new(std::env::temp_dir().join("formatex-html-fonts-test")).get();
        let html = "<html><head></head><body>x</body></html>".to_string();
        assert_eq!(embed_fonts(html.clone(), &store), html);
    }
}
