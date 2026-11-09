//! HTML export (an experiment): the engine compiles to Typst's own HTML (`--input target=html`, see `formatex-typ/src/html/`), and this puts
//! the fonts the page names inside the file, so one file shows the same fonts anywhere, with nothing next to it.
//!
//! The engine writes `<meta name="fx-fonts" content="Inter|IRANSansX|Anonymous Pro">` with the families its stylesheet uses; each face of
//! each family becomes a base64 `@font-face`. The fonts are the biggest part of the file, so three things keep it small: only the regular
//! and the bold face of a family (and the italics only when the text has italic), each file packed as WOFF (its tables deflated), and
//! nothing else in the page that is big.

use std::collections::HashSet;
use std::fmt::Write;
use std::io::Write as _;

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD;
use flate2::Compression;
use flate2::write::ZlibEncoder;
use serde::Deserialize;
use typst::text::FontStyle;
use typst_kit::fonts::FontStore;

/// What the export dialog chose.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct HtmlExport {
    /// Put the fonts in the file (off: the page names them and the reader's own fonts are used).
    pub embed_fonts: bool,
    /// A copy button on every code block.
    pub copy_code: bool,
    /// The viewer's toolbar (zoom, theme, feel), reading-progress line and outline sidebar (drawn by the engine, see `src/html/viewer.typ`).
    pub toolbar: bool,
    pub progress: bool,
    pub outline: bool,
}

impl Default for HtmlExport {
    fn default() -> Self {
        Self { embed_fonts: true, copy_code: true, toolbar: true, progress: true, outline: true }
    }
}

/// The families the engine named in `<meta name="fx-fonts">`.
fn font_families(html: &str) -> Vec<String> {
    let marker = "name=\"fx-fonts\" content=\"";
    let Some(start) = html.find(marker).map(|at| at + marker.len()) else { return Vec::new() };
    let Some(length) = html[start..].find('"') else { return Vec::new() };
    html[start..start + length].split('|').map(|name| name.trim().to_string()).filter(|name| !name.is_empty()).collect()
}

/// Whether the text of the page uses italic anywhere (the stylesheet always mentions it, so only the page itself is looked at).
fn uses_italic(html: &str) -> bool {
    let body = html.find("<main").map(|at| &html[at..]).unwrap_or(html);
    ["<em>", "<em ", "<i>", "<i ", "<cite", "<blockquote", "<dfn", "<var", "font-style: italic"].iter().any(|marker| body.contains(marker))
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
    let book = store.book();
    let italic = uses_italic(html);
    let chars = page_chars(html);
    let mut css = String::new();
    let mut done = HashSet::new();
    for family in font_families(html) {
        // A page uses the regular and the bold face: a family with eighteen weights would add megabytes nobody reads. A family that has
        // neither gets the two faces nearest to regular. The italic faces come only when the page has italic text.
        let all: Vec<usize> = book.select_family(&family.to_lowercase()).collect();
        let weight = |index: usize| book.info(index).map(|info| info.variant.weight.to_number()).unwrap_or(400);
        let upright = |index: usize| italic || book.info(index).is_some_and(|info| info.variant.style == FontStyle::Normal);
        let mut chosen: Vec<usize> = all.iter().copied().filter(|&index| matches!(weight(index), 400 | 700) && upright(index)).collect();
        if chosen.is_empty() {
            let mut nearest: Vec<usize> = all.iter().copied().filter(|&index| upright(index)).collect();
            nearest.sort_by_key(|&index| weight(index).abs_diff(400));
            chosen = nearest.into_iter().take(2).collect();
        }
        for index in chosen {
            let (Some(info), Some(font)) = (book.info(index), store.font(index)) else { continue };
            // A font collection holds several faces in one file: the data is the same for each
            let data = font.data();
            if !done.insert((info.family.clone(), info.variant.weight.to_number(), info.variant.style as u8, data.len())) {
                continue;
            }
            // Only the glyphs of the page, with the tables that shape them (a font that cannot be cut is kept whole)
            let cut = fontcull::subset_font_data(data.as_slice(), &chars, &[]).ok().filter(|cut| cut.len() < data.len());
            let source: &[u8] = cut.as_deref().unwrap_or(data.as_slice());
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
            let _ = write!(
                css,
                "@font-face {{ font-family: \"{}\"; font-weight: {}; font-style: {}; font-display: swap; src: url(data:{};base64,{}) format(\"{}\"); }}\n",
                info.family,
                info.variant.weight.to_number(),
                style,
                mime,
                STANDARD.encode(&bytes),
                format,
            );
        }
    }
    css
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
