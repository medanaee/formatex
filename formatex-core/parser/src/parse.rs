use std::collections::{BTreeMap, BTreeSet};
use pulldown_cmark::{Alignment, CodeBlockKind, Event, HeadingLevel, Options, Parser, Tag};
use serde_json::Value;
use crate::{grammar::{self, Attributes}, model::*, resolve, source};

struct Anchor { start: usize, end: usize, previous: bool, math: bool, applied: bool, attrs: Attributes }

pub struct DocumentParser<'a> { input: &'a Input, serial: usize, source: source::Index<'a> }

impl<'a> DocumentParser<'a> {
    pub fn new(input: &'a Input) -> Self { Self { input, serial: 0, source: source::Index::new(input) } }
    fn node(&mut self, kind: &str, start: usize, end: usize) -> Node {
        let source = self.source.ranges(start, end);
        let at = self.source.location(&source);
        self.serial += 1;
        Node { kind: kind.into(), key: format!("{}:{}:{kind}:{}", at.file, source.first().map_or(start, |range| range.start), self.serial), at, span: [start, end], source, ..Node::default() }
    }
    fn raw_component(&self, name: &str) -> bool { grammar::RAW_COMPONENTS.contains(&name) || self.input.schemas.get(name).and_then(|s| s.get("body")).and_then(Value::as_str) == Some("raw") }
    fn error(&self, at: usize, message: impl Into<String>) -> Diagnostic { self.source.diagnostic(at, (at + 1).min(self.input.text.len()), message) }
    fn apply(&self, node: &mut Node, attrs: &Attributes) -> Result<(), Diagnostic> {
        for (name, value) in &attrs.values {
            if node.props.insert(name.clone(), value.clone()).is_some() { return Err(self.error(attrs.spans[name][0], format!("Duplicate property {name}"))); }
            let span = attrs.spans[name];
            node.prop_spans.insert(name.clone(), serde_json::to_value(self.source.ranges(span[0], span[1])).unwrap());
        }
        Ok(())
    }

    /// Formatex extensions protect their full boundaries before CommonMark parses blocks/inlines.
    fn extensions(&mut self, text: &str, base: usize) -> Result<(String, BTreeMap<char, Node>, Vec<Anchor>), Diagnostic> {
        let mut scan_bytes = text.as_bytes().to_vec();
        let mut scan_at = 0;
        let bytes_ref = text.as_bytes();
        while scan_at < text.len() {
            if scan_at == 0 || bytes_ref[scan_at - 1] == b'\n' {
                if let Some(fence_end) = skip_fenced_code(text, scan_at) {
                    scan_at = fence_end;
                    continue;
                }
            }
            if bytes_ref[scan_at] == b'`' {
                scan_at = skip_inline_code(text, scan_at);
                continue;
            }
            if text[scan_at..].starts_with("<!--") { scan_at = text[scan_at..].find("-->").map_or(text.len(), |end| scan_at + end + 3); continue; }
            if bytes_ref[scan_at] == b'<' {
                if let Ok(Some(tag)) = grammar::tag(text, scan_at, base) {
                    if !tag.close && !tag.void && self.raw_component(&tag.name) {
                        let needle = format!("</{}", tag.name);
                        let mut search = tag.end;
                        while let Some(rel) = text[search..].find(&needle) {
                            let close_at = search + rel;
                            if let Ok(Some(close_tag)) = grammar::tag(text, close_at, base) {
                                if close_tag.close && close_tag.name == tag.name {
                                    grammar::blank(&mut scan_bytes, tag.end, close_at);
                                    scan_at = close_tag.end;
                                    break;
                                }
                            }
                            search = close_at + needle.len();
                        }
                        if scan_at > tag.end { continue; }
                    }
                    scan_at = tag.end;
                    continue;
                }
            }
            scan_at += text[scan_at..].chars().next().unwrap().len_utf8();
        }
        let scan = String::from_utf8(scan_bytes).expect("byte-preserving raw masks");
        let mut protected = Vec::new();
        let mut code_blocks = Vec::new();
        let mut in_code = 0;
        for (event, range) in Parser::new_ext(&scan, markdown_options()).into_offset_iter() {
            match event {
                Event::Start(Tag::CodeBlock(_)) => { in_code += 1; code_blocks.push(range.clone()); protected.push(range); },
                Event::End(pulldown_cmark::TagEnd::CodeBlock) => in_code -= 1,
                Event::Code(_) | Event::InlineMath(_) | Event::DisplayMath(_) => protected.push(range),
                _ if in_code > 0 => { code_blocks.push(range.clone()); protected.push(range); },
                _ => {},
            }
        }
        let merge_ranges = |mut items: Vec<std::ops::Range<usize>>| {
            items.sort_by_key(|range| range.start);
            let mut merged: Vec<std::ops::Range<usize>> = Vec::new();
            for range in items {
                if let Some(last) = merged.last_mut() { if range.start <= last.end { last.end = last.end.max(range.end); continue; } }
                merged.push(range);
            }
            merged
        };
        let merged = merge_ranges(protected);
        let merged_code = merge_ranges(code_blocks);
        let range_end = |ranges: &[std::ops::Range<usize>], at: usize| {
            let next = ranges.partition_point(|range| range.start <= at);
            next.checked_sub(1).and_then(|index| (at < ranges[index].end).then_some(ranges[index].end))
        };
        let protected_end = |at| range_end(&merged, at);
        let code_end = |at| range_end(&merged_code, at);
        let mut bytes = text.as_bytes().to_vec();
        let mut components = BTreeMap::new();
        let mut anchors = Vec::new();
        let mut p = 0;
        while p < text.len() {
            if let Some(end) = protected_end(p) { p = end; continue; }
            if text[p..].starts_with("<!--") {
                let end = text[p..].find("-->").map(|end| p + end + 3).ok_or_else(|| self.error(base + p, "Unclosed comment"))?;
                // Deferred expressions are structural records, not executable raw-Typst comments.
                if text[p..].starts_with("<!--fx-deferred:") {
                    let raw = &text[p + "<!--fx-deferred:".len()..end - 3];
                    let mut node = self.node("deferred", base + p, base + end);
                    node.value = Some(raw.to_string());
                    self.placeholder(&mut bytes, p, end, node, &mut components)?;
                } else { grammar::blank(&mut bytes, p, end); }
                p = end; continue;
            }
            if text.as_bytes()[p] == b'<' {
                let open = grammar::tag(text, p, base).map_err(|(at, error)| self.error(at, error))?;
                if let Some(mut open) = open {
                    open.void |= self.input.schemas.get(&open.name).and_then(|s| s.get("kind")).and_then(Value::as_str) == Some("void");
                    if open.close {
                        if open.void { grammar::blank(&mut bytes, p, open.end); p = open.end; continue; }
                        return Err(self.error(base + p, format!("Unexpected closing tag </{}>", open.name)));
                    }
                    let mut end = open.end;
                    let mut body_end = end;
                    if !open.void {
                        let raw = self.raw_component(&open.name);
                        let mut stack = vec![open.name.clone()];
                        let mut q = if raw { text[open.end..].find(&format!("</{}", open.name)).map_or(text.len(), |at| open.end + at) } else { open.end };
                        let mut found = false;
                        while q < text.len() {
                            if !raw { if let Some(end) = protected_end(q) { q = end; continue; } }
                            if text[q..].starts_with("<!--") { q = text[q..].find("-->").map_or(text.len(), |end| q + end + 3); continue; }
                            if text.as_bytes()[q] == b'<' {
                                if let Some(mut tag) = grammar::tag(text, q, base).map_err(|(at, error)| self.error(at, error))? {
                                    tag.void |= self.input.schemas.get(&tag.name).and_then(|s| s.get("kind")).and_then(Value::as_str) == Some("void");
                                    if raw && !(tag.close && tag.name == open.name) { q = tag.end; continue; }
                                    if tag.close && !tag.void {
                                        if stack.last() != Some(&tag.name) { return Err(self.error(base + q, format!("Expected </{}>, found </{}>", stack.last().unwrap(), tag.name))); }
                                        stack.pop();
                                        if stack.is_empty() { body_end = q; end = tag.end; found = true; break; }
                                    } else if !tag.close && !tag.void {
                                        if self.raw_component(&tag.name) {
                                            let needle = format!("</{}", tag.name);
                                            let mut search = tag.end;
                                            let mut closed = None;
                                            while let Some(rel) = text[search..].find(&needle) {
                                                let close_at = search + rel;
                                                if let Some(close_tag) = grammar::tag(text, close_at, base).map_err(|(at, error)| self.error(at, error))? {
                                                    if close_tag.close && close_tag.name == tag.name {
                                                        closed = Some(close_tag.end);
                                                        break;
                                                    }
                                                }
                                                search = close_at + needle.len();
                                            }
                                            if let Some(next_q) = closed {
                                                q = next_q;
                                                continue;
                                            }
                                            return Err(self.error(base + q, format!("Missing </{}>", tag.name)));
                                        }
                                        stack.push(tag.name);
                                    }
                                    q = tag.end; continue;
                                }
                            }
                            q += text[q..].chars().next().unwrap().len_utf8();
                        }
                        if !found { return Err(self.error(base + p, format!("Missing </{}>", open.name))); }
                    }
                    let mut node = self.node("component", base + p, base + end);
                    node.name = Some(open.name.clone());
                    self.apply(&mut node, &open.attrs)?;
                    if matches!(open.name.as_str(), "docheader" | "def") {
                        for property in ["title", "subtitle", "subtitle2"] {
                            if let Some(value) = node.props.get(property).and_then(Value::as_str).map(str::to_owned) {
                                let at = open.attrs.value_spans.get(property).unwrap_or(&open.attrs.spans[property])[0];
                                let rich = inline_children(self.parse(&value, at)?);
                                node.rich.insert(property.into(), rich);
                            }
                        }
                    }
                    if !open.void {
                        if self.raw_component(&open.name) { node.value = Some(text[open.end..body_end].to_string()); }
                        else {
                            node.children = self.parse(&text[open.end..body_end], base + open.end)?;
                            if self.input.schemas.get(&open.name).and_then(|schema| schema.get("kind")).and_then(Value::as_str) == Some("inline") { node.children = inline_children(node.children); }
                        }
                    }
                    self.placeholder(&mut bytes, p, end, node, &mut components)?;
                    p = end; continue;
                }
            }
            // [inline Markdown]{attributes}; ordinary links and images remain CommonMark.
            if text.as_bytes()[p] == b'[' && (p == 0 || !matches!(text.as_bytes()[p-1], b'!' | b'\\')) {
                // Bibliography shorthand is a semantic cite node, not unresolved plain text.
                if text[p..].starts_with("[@") {
                    if let Some(close) = text[p..].find(']') {
                        let end = p + close + 1;
                        let keys = &text[p+2..end-1];
                        let valid = !keys.is_empty() && keys.chars().all(|c| c.is_alphanumeric() || matches!(c, '_' | '-' | ':' | '.'));
                        if valid && !matches!(text.as_bytes().get(end), Some(b'(' | b'[')) {
                            let mut node = self.node("component", base+p, base+end);
                            node.name = Some("cite".into()); node.props.insert("key".into(), keys.into());
                            node.prop_spans.insert("key".into(), serde_json::to_value(self.source.ranges(base+p+2,base+end-1)).unwrap());
                            self.placeholder(&mut bytes,p,end,node,&mut components)?;
                            p = end; continue;
                        }
                    }
                }
                let mut depth = 1;
                let mut q = p + 1;
                while q < text.len() && depth > 0 {
                    match text.as_bytes()[q] { b'\\' => { q += 1; }, b'[' => depth += 1, b']' => depth -= 1, _ => {} }
                    q += text[q..].chars().next().unwrap().len_utf8();
                }
                if depth == 0 && text.as_bytes().get(q) == Some(&b'{') {
                    let end = attribute_end(text, q).ok_or_else(|| self.error(base + q, "Unclosed span attributes"))?;
                    let attrs = grammar::attributes(&text[q+1..end-1], base + q + 1).map_err(|(at, error)| self.error(at, error))?;
                    let mut node = self.node("component", base + p, base + end); node.name = Some("span".into());
                    self.apply(&mut node, &attrs)?;
                    node.children = self.parse(&text[p+1..q-1], base + p + 1)?;
                    node.children = inline_children(node.children);
                    self.placeholder(&mut bytes, p, end, node, &mut components)?;
                    p = end; continue;
                }
            }
            p += text[p..].chars().next().unwrap().len_utf8();
        }
        let mut offset = 0;
        for line in text.split_inclusive('\n') {
            let line_start = offset; offset += line.len();
            if code_end(line_start).is_some() || (protected_end(line_start).is_some() && !line.trim_start().starts_with("$$")) { continue; }
            if !bytes[line_start..offset].contains(&b'{') { continue; }
            let trimmed = line.trim();
            let prefix = line.len() - line.trim_start().len();
            let standalone = trimmed.starts_with('{') && trimmed.ends_with('}');
            let heading = line.trim_start().starts_with('#') && line.trim_start().trim_start_matches('#').starts_with([' ', '\t']);
            let close_math = line.trim_start().starts_with("$$") && line.trim_end().ends_with('}');
            let start = if standalone { Some(line_start + prefix) } else if heading || close_math { line.rfind('{').map(|at| line_start + at) } else { None };
            if let Some(start) = start {
                if let Some(end) = attribute_end(text, start) {
                    if !text[end..offset].trim().is_empty() { continue; }
                    let attrs = grammar::attributes(&text[start+1..end-1], base + start + 1).map_err(|(at, error)| self.error(at, error))?;
                    grammar::blank(&mut bytes, start, end);
                    let math = close_math || standalone && text[..line_start].trim_end().ends_with("$$");
                    anchors.push(Anchor { start: base + if heading { line_start } else { start }, end: base + end, previous: !standalone || math, math, applied: false, attrs });
                }
            }
        }
        Ok((String::from_utf8(bytes).expect("byte-preserving masks"), components, anchors))
    }

    fn placeholder(&self, bytes: &mut [u8], start: usize, end: usize, node: Node, components: &mut BTreeMap<char, Node>) -> Result<(), Diagnostic> {
        let marker = char::from_u32(0xE000 + components.len() as u32).filter(|&ch| ch <= '\u{F8FF}').ok_or_else(|| self.error(start, "Too many sibling extensions in a single parse scope"))?;
        if end - start < marker.len_utf8() { return Err(self.error(start, "Extension boundary is too short")); }
        grammar::blank(bytes, start, end);
        let mut encoded = [0; 4]; let encoded = marker.encode_utf8(&mut encoded);
        bytes[start..start + encoded.len()].copy_from_slice(encoded.as_bytes());
        components.insert(marker, node);
        Ok(())
    }

    pub fn parse(&mut self, text: &str, base: usize) -> Result<Vec<Node>, Diagnostic> {
        let (masked, components, mut anchors) = self.extensions(text, base)?;
        let mut stack = vec![self.node("root", base, base + text.len())];
        let (normalized, offsets) = normalize_list_markers(&masked);
        for (event, range) in Parser::new_ext(&normalized, markdown_options()).into_offset_iter() {
            let range = offsets[range.start]..offsets[range.end];
            let start = base + range.start; let end = base + range.end;
            // A settings line starts a fresh list even when CommonMark merged equal markers.
            // Splitting events retains global link/footnote definitions and original byte ranges.
            if matches!(&event, Event::Start(Tag::Item)) && stack.last().is_some_and(|node| node.kind == "list") {
                let prefix = &text[..range.start];
                let gap = prefix.chars().rev().take_while(|c| c.is_whitespace()).filter(|c| *c == '\n').count();
                let list = stack.last().unwrap();
                let marker = ordinal(&masked[range.start..]);
                let expected = list.start.unwrap_or(1) + list.children.len() as u64;
                let restart = !list.children.is_empty() && ((list.ordered == Some(true) && gap >= 2 && marker.is_some_and(|number| number == 1 || number != expected)) || (list.ordered != Some(true) && gap >= 3));
                if restart {
                    let mut previous = stack.pop().unwrap();
                    let mut next = self.node("list", start, previous.span[1]);
                    next.ordered = previous.ordered;
                    next.start = if next.ordered == Some(true) { ordinal(&masked[range.start..]) } else { None };
                    previous.span[1] = previous.children.last().unwrap().span[1];
                    previous.source = self.source.ranges(previous.span[0], previous.span[1]);
                    stack.last_mut().unwrap().children.push(previous); stack.push(next);
                }
                for anchor in &mut anchors {
                    if anchor.previous || anchor.applied || anchor.end > start || stack.last().unwrap().span[0] >= anchor.start { continue; }
                    let mut previous = stack.pop().unwrap();
                    let mut next = self.node("list", start, previous.span[1]);
                    next.ordered = previous.ordered;
                    next.start = if previous.ordered == Some(true) { ordinal(&masked[range.start..]).or(previous.start) } else { None };
                    previous.span[1] = previous.children.last().map_or(anchor.start, |node| node.span[1]);
                    previous.source = self.source.ranges(previous.span[0], previous.span[1]);
                    self.apply(&mut next, &anchor.attrs)?; anchor.applied = true;
                    stack.last_mut().unwrap().children.push(previous); stack.push(next);
                }
            }
            match event {
                Event::Start(tag) => {
                    let mut node = self.node("", start, end);
                    match tag {
                        Tag::Paragraph => node.kind = "paragraph".into(),
                        Tag::Heading { level, id, classes, attrs } => {
                            node.kind = "heading".into(); node.depth = Some(match level { HeadingLevel::H1 => 1, HeadingLevel::H2 => 2, HeadingLevel::H3 => 3, HeadingLevel::H4 => 4, HeadingLevel::H5 => 5, HeadingLevel::H6 => 6 });
                            if let Some(id) = id { node.props.insert("id".into(), id.to_string().into()); }
                            if !classes.is_empty() { node.props.insert("class".into(), classes.iter().map(|value| value.as_ref()).collect::<Vec<_>>().join(" ").into()); }
                            for (name, value) in attrs { node.props.insert(name.to_string(), value.map(|value| Value::String(value.to_string())).unwrap_or(true.into())); }
                        },
                        Tag::BlockQuote(_) => node.kind = "blockquote".into(),
                        Tag::CodeBlock(kind) => {
                            node.kind = "code".into();
                            if let CodeBlockKind::Fenced(info) = kind {
                                let (lang, meta) = info.split_once(char::is_whitespace).unwrap_or((&info, ""));
                                node.lang = Some(lang.into()); node.meta = Some(meta.into());
                                if lang != "mermaid" && !meta.trim().is_empty() {
                                    let offset = self.input.text[start..end].find(meta).unwrap_or(0);
                                    let trimmed = meta.trim(); let brace = usize::from(trimmed.starts_with('{') && trimmed.ends_with('}'));
                                    let content = if brace == 1 { &trimmed[1..trimmed.len()-1] } else { trimmed };
                                    let attrs = grammar::attributes(content,start + offset + meta.len() - meta.trim_start().len() + brace).map_err(|(at,error)|self.error(at,error))?;
                                    self.apply(&mut node,&attrs)?;
                                }
                            }
                        },
                        Tag::List(start) => { node.kind = "list".into(); node.ordered = Some(start.is_some()); node.start = start; },
                        Tag::Item => node.kind = "listItem".into(),
                        Tag::FootnoteDefinition(id) => { node.kind = "footnoteDefinition".into(); node.identifier = Some(id.to_string()); },
                        Tag::Table(align) => { node.kind = "table".into(); node.align = align.iter().map(|align| match align { Alignment::Left => "left", Alignment::Right => "right", Alignment::Center => "center", Alignment::None => "auto" }.into()).collect(); },
                        Tag::TableHead | Tag::TableRow => node.kind = "tableRow".into(),
                        Tag::TableCell => node.kind = "tableCell".into(),
                        Tag::Emphasis => node.kind = "emphasis".into(),
                        Tag::Strong => node.kind = "strong".into(),
                        Tag::Strikethrough => node.kind = "delete".into(),
                        Tag::Link { dest_url, title, .. } => { node.kind = "link".into(); node.url = Some(dest_url.to_string()); if !title.is_empty() { node.title = Some(title.to_string()); } },
                        Tag::Image { dest_url, title, .. } => { node.kind = "image".into(); node.url = Some(dest_url.to_string()); if !title.is_empty() { node.title = Some(title.to_string()); } },
                        Tag::HtmlBlock => node.kind = "html".into(),
                        _ => node.kind = "group".into(),
                    }
                    stack.push(node);
                },
                Event::End(_) => {
                    let mut node = stack.pop().expect("balanced Markdown events");
                    if node.kind == "code" { node.value = Some(node.children.iter().map(text_of).collect()); node.children.clear(); }
                    if node.kind == "image" { node.alt = Some(text_of(&node)); node.children.clear(); }
                    if node.kind == "paragraph" && node.children.iter().any(|node| self.is_block_component(node)) {
                        let mut inline = Vec::new();
                        for child in node.children {
                            if self.is_block_component(&child) {
                                if !inline.is_empty() { let mut paragraph = self.node("paragraph", inline.first().map_or(start, |node: &Node| node.span[0]), inline.last().map_or(end, |node: &Node| node.span[1])); paragraph.children = std::mem::take(&mut inline); stack.last_mut().unwrap().children.push(paragraph); }
                                stack.last_mut().unwrap().children.push(child);
                            } else if child.kind != "text" || !child.value.as_deref().unwrap_or("").trim().is_empty() { inline.push(child); }
                        }
                        if !inline.is_empty() { let mut paragraph = self.node("paragraph", start, end); paragraph.children = inline; stack.last_mut().unwrap().children.push(paragraph); }
                    } else { stack.last_mut().unwrap().children.push(node); }
                },
                Event::Text(value) => {
                    let mut chunk = String::new(); let mut begin = start;
                    let mut source_cursor = range.start;
                    let mut skip_until = range.start;
                    for ch in value.chars() {
                        if let Some(component) = components.get(&ch).filter(|node| node.span[0] >= start && node.span[0] < end) {
                            if !chunk.is_empty() { let mut node = self.node("text", begin, component.span[0]); node.value = Some(std::mem::take(&mut chunk)); stack.last_mut().unwrap().children.push(node); }
                            stack.last_mut().unwrap().children.push(component.clone()); begin = component.span[1]; source_cursor = component.span[0] - base + ch.len_utf8(); skip_until = component.span[1] - base;
                        } else {
                            // Spaces masking an extension are not part of its text siblings.
                            if source_cursor >= skip_until { chunk.push(ch); }
                            source_cursor += ch.len_utf8();
                        }
                    }
                    if !chunk.is_empty() { let mut node = self.node("text", begin.min(end), end); node.value = Some(chunk); stack.last_mut().unwrap().children.push(node); }
                },
                Event::Code(ref value) | Event::InlineMath(ref value) | Event::DisplayMath(ref value) => {
                    let kind = match &event { Event::Code(_) => "inlineCode", Event::InlineMath(_) => "inlineMath", _ => "math" };
                    let mut node = self.node(kind, start, end); node.value = Some(value.to_string()); stack.last_mut().unwrap().children.push(node);
                },
                Event::SoftBreak | Event::HardBreak => { let hard = matches!(event, Event::HardBreak); let mut node = self.node(if hard { "break" } else { "text" }, start, end); if !hard { node.value = Some("\n".into()); } stack.last_mut().unwrap().children.push(node); },
                Event::Rule => { let node = self.node("thematicBreak", start, end); stack.last_mut().unwrap().children.push(node); },
                Event::FootnoteReference(id) => { let mut node = self.node("footnoteReference", start, end); node.identifier = Some(id.to_string()); stack.last_mut().unwrap().children.push(node); },
                Event::TaskListMarker(checked) => stack.last_mut().unwrap().checked = Some(checked),
                Event::Html(value) | Event::InlineHtml(value) => {
                    // Unrecognized HTML may contain autolinks; custom component tags were consumed above.
                    if !value.trim().is_empty() { let mut node = self.node("text", start, end); node.value = Some(value.to_string()); stack.last_mut().unwrap().children.push(node); }
                },
            }
        }
        let mut nodes = stack.pop().unwrap().children;
        for anchor in anchors {
            if anchor.applied { continue; }
            fn math_before(nodes: &mut [Node], at: usize) -> Option<&mut Node> {
                for node in nodes.iter_mut().rev() {
                    if node.kind == "math" && node.span[0] <= at { return Some(node); }
                    if let Some(found) = math_before(&mut node.children, at) { return Some(found); }
                }
                None
            }
            let target = if anchor.math { math_before(&mut nodes, anchor.start) } else if anchor.previous { nodes.iter_mut().rev().find(|node| node.span[0] <= anchor.start && node.span[1] >= anchor.start) } else { nodes.iter_mut().find(|node| node.span[0] >= anchor.end) };
            let Some(target) = target else { return Err(self.error(anchor.start, "Attributes have no document block to configure")); };
            self.apply(target, &anchor.attrs)?;
        }
        Ok(nodes)
    }

    fn is_block_component(&self, node: &Node) -> bool {
        if node.kind != "component" { return false; }
        let name = node.name.as_deref().unwrap_or("");
        match self.input.schemas.get(name).and_then(|schema| schema.get("kind")).and_then(Value::as_str) {
            Some("inline") => false,
            Some("mixed") => node.props.get("mode").and_then(Value::as_str) == Some("block"),
            Some("void") => !matches!(name, "icon" | "counter"),
            Some(_) => true,
            None => !matches!(name, "span" | "badge" | "kbd" | "ref" | "cite" | "icon" | "counter" | "digit" | "fn" | "footnote" | "def"),
        }
    }

    pub fn bind(&self, nodes: &mut [Node]) -> Result<(), Diagnostic> {
        fn visit(parser: &DocumentParser, nodes: &mut [Node], ids: &mut BTreeSet<String>, headings: &mut BTreeMap<String, usize>, parents: &mut Vec<String>) -> Result<(), Diagnostic> {
            for node in nodes {
                if node.kind == "heading" {
                    let slug = text_of(node).to_lowercase().chars().filter_map(|ch| if ch.is_alphanumeric() || ch == '_' || ch == '-' { Some(ch) } else if ch.is_whitespace() { Some('-') } else { None }).collect::<String>();
                    let count = headings.entry(slug.clone()).or_default(); let id = if *count == 0 { slug } else { format!("{slug}-{count}") }; *count += 1;
                    if !node.props.contains_key("id") { node.props.insert("id".into(), id.into()); node.props.insert("_generatedId".into(), true.into()); }
                    else if node.props.get("id").and_then(Value::as_str) != Some(&id) { node.props.insert("_aliases".into(), serde_json::json!([id])); }
                }
                if node.name.as_deref() != Some("def") { if let Some(id) = node.props.get("id").and_then(Value::as_str) { if !ids.insert(id.into()) { return Err(parser.error(node.span[0], format!("Duplicate id {id}"))); } } }
                if node.kind == "component" && !parser.input.schemas.is_empty() {
                    let name = node.name.as_deref().unwrap_or("");
                    if name != "br" {
                        let Some(schema) = parser.input.schemas.get(name) else { return Err(parser.error(node.span[0], format!("Unknown component <{name}>"))); };
                        if schema.get("scoped").and_then(Value::as_bool) == Some(true) {
                            let allowed = parents.last().and_then(|parent| parser.input.schemas.get(parent)).and_then(|parent| parent.get("children")).and_then(Value::as_array).is_some_and(|children| children.iter().any(|child| child.as_str() == Some(name)));
                            if !allowed { return Err(parser.error(node.span[0], format!("<{name}> is not valid inside this parent"))); }
                        }
                        if let Some(specs) = schema.get("attrs").and_then(Value::as_object) {
                            let local = node.props.iter().filter(|(key, _)| !key.starts_with('_')).map(|(key, value)| (key.clone(), value.clone())).collect();
                            let layers = resolve::layers(&parser.input.settings, name, &local);
                            for backend in ["html", "typ"] {
                                if let Err((property, message)) = resolve::resolve(backend, specs, &layers) {
                                    let original = node.prop_spans.get(&property).and_then(|value| serde_json::from_value::<Vec<SourceRange>>(value.clone()).ok());
                                    if let Some(range) = original { let at = parser.source.location(&range); return Err(Diagnostic { severity: "error".into(), message: format!("<{name}>: {message}"), path: at.file, line: at.line, column: at.column, range }); }
                                    return Err(parser.error(node.span[0], format!("<{name}>: {message}")));
                                }
                            }
                        }
                    }
                }
                if let Some(group) = match node.kind.as_str() { "heading" => Some("heading"), "table" => Some("table"), "list" => Some("list"), "code" => Some("code"), "math" => Some("equation"), _ => None } {
                    if let Some(specs) = parser.input.options.get(group).and_then(|value| value.get("attrs")).and_then(Value::as_object) {
                        let local: serde_json::Map<String, Value> = node.props.iter().filter(|(key, _)| !key.starts_with('_')).map(|(key, value)| (key.clone(), value.clone())).collect();
                        for backend in ["html", "typ"].into_iter().filter(|_| !local.is_empty()) {
                            if let Err((property, message)) = resolve::resolve(backend, specs, &[local.clone()]) {
                                let range = node.prop_spans.get(&property).and_then(|value| serde_json::from_value::<Vec<SourceRange>>(value.clone()).ok()).unwrap_or_else(|| node.source.clone());
                                let at = parser.source.location(&range);
                                return Err(Diagnostic { severity: "error".into(), message, path: at.file, line: at.line, column: at.column, range });
                            }
                        }
                    }
                }
                if let Some(name) = node.name.clone() { parents.push(name); visit(parser, &mut node.children, ids, headings, parents)?; parents.pop(); }
                else { visit(parser, &mut node.children, ids, headings, parents)?; }
            }
            Ok(())
        }
        visit(self, nodes, &mut BTreeSet::new(), &mut BTreeMap::new(), &mut Vec::new())
    }
}

fn markdown_options() -> Options { Options::ENABLE_TABLES | Options::ENABLE_FOOTNOTES | Options::ENABLE_STRIKETHROUGH | Options::ENABLE_TASKLISTS | Options::ENABLE_MATH | Options::ENABLE_GFM }
fn text_of(node: &Node) -> String { node.value.clone().unwrap_or_else(|| node.children.iter().map(text_of).collect()) }
fn inline_children(nodes: Vec<Node>) -> Vec<Node> { nodes.into_iter().flat_map(|node| if node.kind == "paragraph" { node.children } else { vec![node] }).collect() }
fn attribute_end(text: &str, start: usize) -> Option<usize> {
    let mut quote = None; let mut escaped = false;
    for (offset, byte) in text.as_bytes()[start+1..].iter().copied().enumerate() {
        if escaped { escaped = false; continue; }
        if byte == b'\\' { escaped = true; continue; }
        if Some(byte) == quote { quote = None; }
        else if quote.is_none() && matches!(byte, b'\'' | b'"') { quote = Some(byte); }
        else if quote.is_none() && byte == b'}' { return Some(start + offset + 2); }
        else if quote.is_none() && byte == b'\n' { return None; }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parse_document;
    fn parse(text: &str) -> Document { parse_document(Input { text: text.into(), file: "main.md".into(), ..Input::default() }).unwrap() }
    #[test]
    fn void_icons_stay_in_the_paragraph_while_vertical_space_splits_it() {
        let input = Input {
            text: "انجام شد <icon name=\"check\" />، هشدار <icon name=\"star\" />. <v /> After".into(),
            schemas: serde_json::json!({"icon":{"kind":"void"}, "v":{"kind":"void"}}).as_object().unwrap().clone(),
            ..Input::default()
        };
        let document = parse_document(input).unwrap();
        assert_eq!(document.children.len(), 3);
        let paragraph = &document.children[0];
        assert_eq!(paragraph.kind, "paragraph");
        assert_eq!(paragraph.children.iter().filter(|node| node.name.as_deref() == Some("icon")).count(), 2);
        assert_eq!(document.children[1].name.as_deref(), Some("v"));
        assert_eq!(document.children[2].kind, "paragraph");
    }
    #[test]
    fn separated_ordered_sections_keep_their_explicit_non_one_start() {
        for source in ["1. First\n2. Second\n\n۲. New section\n", "1. First\n2. Second\n\t\n\n۲. New section\n"] {
            let document=parse(source); assert_eq!(document.children.len(),2);
            assert_eq!(document.children[1].start,Some(2));
        }
        let document=parse("1. First\n\n2. Second\n\n3. Third\n");
        assert_eq!(document.children.len(),1); assert_eq!(document.children[0].children.len(),3);
    }
    #[test]
    fn citation_shorthand_and_paired_reference_labels_remain_semantic_inline_nodes() {
        let input = Input { text: "See [@cantor1874] and <ref to=\"target\">custom **label**</ref>. `[@literal]` [@link](https://example.org)".into(), schemas: serde_json::json!({"ref":{"kind":"inline","attrs":{"to":{"type":"string"}}},"cite":{"kind":"inline","attrs":{"key":{"type":"string"}}}}).as_object().unwrap().clone(), ..Input::default() };
        let document = parse_document(input).unwrap(); let children=&document.children[0].children;
        let citation=children.iter().find(|node|node.name.as_deref()==Some("cite")).unwrap();
        assert_eq!(citation.props["key"],"cantor1874"); assert_eq!(citation.source[0].start,4);
        let reference=children.iter().find(|node|node.name.as_deref()==Some("ref")).unwrap();
        assert_eq!(text_of(reference),"custom label"); assert_eq!(reference.children[1].kind,"strong");
        assert!(children.iter().any(|node|node.kind=="inlineCode" && node.value.as_deref()==Some("[@literal]")));
        assert!(children.iter().any(|node|node.kind=="link"));
    }
    #[test]
    fn fenced_code_properties_keep_their_md_ranges() {
        let source = "```js {numbering=false highlight=\"2-3\"}\nconst value=1;\n```\n";
        let document = parse(source); let code = &document.children[0];
        assert_eq!(code.props["numbering"],"false"); assert_eq!(code.props["highlight"],"2-3");
        assert_eq!(code.prop_spans["highlight"][0]["start"],source.find("highlight").unwrap());
    }
    #[test]
    fn rich_titles_map_their_words_to_the_attribute_value() {
        let source = "<docheader title=\"Hello **world**\"></docheader>";
        let document = parse(source);
        let title = &document.children[0].rich["title"];
        assert_eq!(title[0].source[0].start,source.find("Hello").unwrap());
        assert_eq!(title[1].children[0].source[0].start,source.find("world").unwrap());
    }
    #[test]
    fn localized_list_markers_preserve_ranges_and_restart_policy() {
        let source = "۱. first\n۲. second\n\n۱. third\n";
        let document = parse(source);
        assert_eq!(document.children.len(), 2);
        assert_eq!(document.children[1].start, Some(1));
        assert_eq!(document.children[1].children[0].at.line, 4);
        assert_eq!(document.children[0].children[0].children[0].source[0].start, source.find("first").unwrap());
        assert_eq!(parse("- a\n\n- b\n").children.len(), 1);
        assert_eq!(parse("- a\n\n\n- b\n").children.len(), 2);
        assert_eq!(parse("```\n۱. literal\n```\n").children[0].value.as_deref(), Some("۱. literal\n"));
    }
    #[test]
    fn commonmark_structure_and_raw_components() {
        let document = parse("## Hello {#intro}\n\nSome **bold** and $x^2$.\n\n<box>\n\nBody\n\n<alert>Nested</alert>\n\n</box>\n\n<cetz>\n```typ\nlet x = \"<box>\"\n```\n</cetz>");
        assert_eq!(document.children[0].props["id"], "intro");
        assert_eq!(document.children[2].name.as_deref(), Some("box"));
        assert_eq!(document.children[2].children[1].name.as_deref(), Some("alert"));
        assert!(document.children[3].value.as_deref().unwrap().contains("let x"));
    }
    #[test]
    fn protects_inline_code_math_and_fences() {
        let document = parse("`<box>` $x < y$\n\n```html\n<box>\n```\n\nText [**hi**]{#word} end");
        assert_eq!(document.children[0].children[0].kind, "inlineCode");
        assert_eq!(document.children[1].kind, "code");
        assert!(document.children[2].children.iter().any(|node| node.name.as_deref() == Some("span")));
    }
    #[test]
    fn maps_generated_and_included_ranges_in_utf8_and_utf16() {
        let mut input = Input { text: "سلام **😀**".into(), file: "main.md".into(), ..Input::default() };
        input.sources.insert("part.md".into(), "سلام **😀**".into());
        input.segments.push(Segment { start: 0, end: input.text.len(), file: "part.md".into(), original: [0, input.text.len()], generated: false });
        let document = parse_document(input).unwrap();
        let strong = &document.children[0].children[1];
        assert_eq!(strong.source[0].file, "part.md");
        assert_eq!(strong.source[0].utf16_start, 5);
        assert_eq!(strong.at.column, 6);
        assert_eq!(strong.span[0], 9);
    }
    #[test]
    fn attributes_attach_to_following_block_and_errors_have_location() {
        let document = parse("{width=full}\n\n| A |\n|---|\n| B |");
        assert_eq!(document.children[0].kind, "table");
        assert_eq!(document.children[0].props["width"], "full");
        let error = parse_document(Input { text: "First\n\n<box>Missing".into(), file: "chapter.md".into(), ..Input::default() }).unwrap_err();
        assert_eq!(error.path, "chapter.md"); assert_eq!(error.line, 3);
    }
    #[test]
    fn settings_split_equal_marker_lists_without_losing_global_reference_definitions() {
        let document = parse("- First\n\n{guides=tree}\n- Second\n\nLink [target].\n\n[target]: https://example.org\n");
        assert_eq!(document.children[0].kind, "list");
        assert_eq!(document.children[0].children.len(), 1);
        assert_eq!(document.children[1].kind, "list");
        assert_eq!(document.children[1].props["guides"], "tree");
        assert!(document.children[2].children.iter().any(|node| node.url.as_deref() == Some("https://example.org")));
    }
    #[test]
    fn raw_components_inside_align_and_doc_code_examples_parse_cleanly() {
        let nested = parse("<align>\n\n<typ>\n```\n#import \"@preview/cetz:0.3.4\"\n\nlet a = 1\n```\n\n</typ>\n\n</align>\n");
        assert_eq!(nested.children[0].name.as_deref(), Some("align"));
        assert_eq!(nested.children[0].children[0].name.as_deref(), Some("typ"));

        let docs = parse("Inline `<cetz>` example.\n\n````markdown\n$$e^{i\\pi} + 1 = 0$$ {#eq-euler}\n\n<fig>\n<cetz>\n\n```typ\nx\n```\n\n</cetz>\n</fig>\n````\n");
        assert_eq!(docs.children[0].kind, "paragraph");
        assert_eq!(docs.children[1].kind, "code");
    }
}

fn skip_fenced_code(text: &str, line_start: usize) -> Option<usize> {
    let line_end = text[line_start..].find('\n').map_or(text.len(), |n| line_start + n + 1);
    let line = text[line_start..line_end].trim_end_matches(['\r', '\n']);
    let indent = line.bytes().take(4).take_while(|b| *b == b' ').count();
    if indent > 3 { return None; }
    let rest = &line[indent..];
    let fence_char = *rest.as_bytes().first()?;
    if fence_char != b'`' && fence_char != b'~' { return None; }
    let fence_len = rest.bytes().take_while(|b| *b == fence_char).count();
    if fence_len < 3 { return None; }
    if fence_char == b'`' && rest[fence_len..].contains('`') { return None; }
    let mut pos = line_end;
    while pos < text.len() {
        let next_end = text[pos..].find('\n').map_or(text.len(), |n| pos + n + 1);
        let cur = text[pos..next_end].trim_end_matches(['\r', '\n']);
        let c_indent = cur.bytes().take(4).take_while(|b| *b == b' ').count();
        if c_indent <= 3 {
            let c_rest = &cur[c_indent..];
            let close_len = c_rest.bytes().take_while(|b| *b == fence_char).count();
            if close_len >= fence_len && c_rest[close_len..].trim().is_empty() {
                return Some(next_end);
            }
        }
        pos = next_end;
    }
    Some(text.len())
}

fn skip_inline_code(text: &str, start: usize) -> usize {
    let bytes = text.as_bytes();
    let mut count = 0;
    while start + count < bytes.len() && bytes[start + count] == b'`' { count += 1; }
    let mut pos = start + count;
    while pos < bytes.len() {
        if bytes[pos] == b'\n' {
            let after = if pos + 1 < bytes.len() && bytes[pos + 1] == b'\r' { pos + 2 } else { pos + 1 };
            let trimmed = text[after..].trim_start_matches([' ', '\t']);
            if trimmed.starts_with(['\r', '\n']) { break; }
        }
        if bytes[pos] == b'`' {
            let mut close = 0;
            while pos + close < bytes.len() && bytes[pos + close] == b'`' { close += 1; }
            if close == count { return pos + close; }
            pos += close;
            continue;
        }
        pos += 1;
    }
    start + count
}

/// Only list-marker digits are normalized; offsets remain in the original prepared source.
fn digit(c: char) -> Option<char> {
    match c { '۰'..='۹' => char::from_u32('0' as u32 + c as u32 - '۰' as u32), '٠'..='٩' => char::from_u32('0' as u32 + c as u32 - '٠' as u32), '0'..='9' => Some(c), _ => None }
}
fn ordinal(text: &str) -> Option<u64> { text.trim_start().chars().take_while(|c| digit(*c).is_some()).filter_map(digit).collect::<String>().parse().ok() }
fn normalize_list_markers(text: &str) -> (String, Vec<usize>) {
    let protected: Vec<_> = Parser::new_ext(text, markdown_options()).into_offset_iter().filter_map(|(event, range)| matches!(event, Event::Start(Tag::CodeBlock(_))).then_some(range)).collect();
    let mut replace = BTreeMap::new();
    let mut offset = 0;
    for line in text.split_inclusive('\n') {
        let content = line.trim_start_matches([' ', '\t']);
        let start = offset + line.len() - content.len();
        let digits = content.chars().take_while(|c| digit(*c).is_some()).collect::<String>();
        let suffix = &content[digits.len()..];
        if !digits.is_empty() && suffix.starts_with(['.', ')']) && suffix[1..].starts_with(char::is_whitespace) && !protected.iter().any(|range| range.contains(&start)) {
            let mut at = start;
            for c in digits.chars() { if !c.is_ascii() { replace.insert(at, digit(c).unwrap()); } at += c.len_utf8(); }
        }
        offset += line.len();
    }
    let mut output = String::new(); let mut offsets = Vec::new();
    for (at, c) in text.char_indices() {
        if let Some(replacement) = replace.get(&at) { output.push(*replacement); offsets.push(at); }
        else { output.push(c); offsets.extend(at..at+c.len_utf8()); }
    }
    offsets.push(text.len()); (output, offsets)
}
