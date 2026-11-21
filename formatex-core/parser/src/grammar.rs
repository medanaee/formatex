use std::collections::BTreeMap;
use serde_json::{Map, Value};

/// Syntax extensions describe boundaries here, before backend rendering exists.
pub const RAW_COMPONENTS: &[&str] = &["cetz", "lilaq", "typ", "tree"];
pub const VOID_COMPONENTS: &[&str] = &["img", "v", "pagebreak", "icon", "toc", "lof", "lot", "lol", "todos", "answers", "include", "br", "hr"];

#[derive(Clone, Default)]
pub struct Attributes {
    pub values: Map<String, Value>,
    pub spans: BTreeMap<String, [usize; 2]>,
    pub value_spans: BTreeMap<String, [usize; 2]>,
}

pub fn attributes(text: &str, base: usize) -> Result<Attributes, (usize, String)> {
    let mut result = Attributes::default();
    let mut at = 0;
    while at < text.len() {
        while at < text.len() && text.as_bytes()[at].is_ascii_whitespace() { at += 1; }
        if at == text.len() { break; }
        let begin = at;
        let id = text.as_bytes()[at] == b'#';
        if id { at += 1; }
        let key_start = at;
        for ch in text[at..].chars() {
            if !(ch.is_alphanumeric() || matches!(ch, '_' | '-' | '.' | ':')) { break; }
            at += ch.len_utf8();
        }
        if at == key_start { return Err((base + at, "Expected an attribute name".into())); }
        let name = if id { "id" } else { &text[key_start..at] }.to_string();
        while at < text.len() && text.as_bytes()[at].is_ascii_whitespace() { at += 1; }
        let mut value = if id { Value::String(text[key_start..at].trim().into()) } else { Value::Bool(true) };
        if at < text.len() && text.as_bytes()[at] == b'=' {
            at += 1;
            while at < text.len() && text.as_bytes()[at].is_ascii_whitespace() { at += 1; }
            if at == text.len() { return Err((base + at, format!("Missing value for {name}"))); }
            let quote = text.as_bytes()[at];
            let value_start = at + usize::from(quote == b'\'' || quote == b'"');
            if quote == b'\'' || quote == b'"' {
                at += 1;
                let mut decoded = String::new();
                let mut closed = false;
                while at < text.len() {
                    let ch = text[at..].chars().next().unwrap();
                    at += ch.len_utf8();
                    if ch as u32 == quote as u32 { closed = true; break; }
                    if ch == '\\' && at < text.len() {
                        let next = text[at..].chars().next().unwrap(); at += next.len_utf8();
                        if next == '\\' || next as u32 == quote as u32 { decoded.push(next); }
                        else { decoded.push('\\'); decoded.push(next); }
                    } else { decoded.push(ch); }
                }
                if !closed { return Err((base + begin, format!("Unclosed value for {name}"))); }
                value = Value::String(decoded.replace("&quot;", "\"").replace("&apos;", "'").replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&"));
            } else {
                let start = at;
                while at < text.len() && !text.as_bytes()[at].is_ascii_whitespace() { at += 1; }
                value = Value::String(text[start..at].into());
            }
            let value_end = at - usize::from(quote == b'\'' || quote == b'"');
            result.value_spans.insert(name.clone(), [base + value_start, base + value_end]);
        }
        if result.values.insert(name.clone(), value).is_some() { return Err((base + begin, format!("Duplicate attribute {name}"))); }
        result.spans.insert(name, [base + begin, base + at]);
    }
    Ok(result)
}

#[derive(Clone)]
pub struct Tag {
    pub name: String,
    pub end: usize,
    pub close: bool,
    pub void: bool,
    pub attrs: Attributes,
}

pub fn tag(text: &str, at: usize, base: usize) -> Result<Option<Tag>, (usize, String)> {
    if !text[at..].starts_with('<') || text[at..].starts_with("<!--") { return Ok(None); }
    let mut p = at + 1;
    let close = text.as_bytes().get(p) == Some(&b'/');
    if close { p += 1; }
    let start_name = p;
    while p < text.len() && (text.as_bytes()[p].is_ascii_alphanumeric() || text.as_bytes()[p] == b'-') { p += 1; }
    if p == start_name || !text.as_bytes()[start_name].is_ascii_alphabetic() { return Ok(None); }
    if !matches!(text.as_bytes().get(p), Some(b'>' | b'/' | b' ' | b'\t' | b'\r' | b'\n')) { return Ok(None); }
    let name = text[start_name..p].to_lowercase();
    // Angle-bracket autolinks are Markdown, not components.
    if text[p..].starts_with("://") { return Ok(None); }
    let attrs_start = p;
    let mut quote = None;
    let mut escaped = false;
    while p < text.len() {
        let byte = text.as_bytes()[p];
        if escaped { escaped = false; p += 1; continue; }
        if byte == b'\\' && quote.is_some() { escaped = true; p += 1; continue; }
        if Some(byte) == quote { quote = None; }
        else if quote.is_none() && (byte == b'\'' || byte == b'"') { quote = Some(byte); }
        else if quote.is_none() && byte == b'>' { break; }
        p += 1;
    }
    if p == text.len() { return Err((base + at, format!("Unclosed tag <{name}>"))); }
    let raw_attrs = text[attrs_start..p].trim_end();
    let void = raw_attrs.ends_with('/') || VOID_COMPONENTS.contains(&name.as_str());
    let raw_attrs = raw_attrs.strip_suffix('/').unwrap_or(raw_attrs);
    let attrs = if close { Attributes::default() } else { attributes(raw_attrs, base + attrs_start)? };
    Ok(Some(Tag { name, end: p + 1, close, void, attrs }))
}

/// Byte-preserving masks keep pulldown-cmark's offsets in the prepared document.
pub fn blank(bytes: &mut [u8], start: usize, end: usize) {
    for byte in &mut bytes[start..end] { if *byte != b'\n' && *byte != b'\r' { *byte = b' '; } }
}
