use crate::model::*;
use std::collections::BTreeMap;

pub struct Index<'a> {
    input: &'a Input,
    lines: BTreeMap<String, Vec<(usize, usize)>>,
}

impl<'a> Index<'a> {
pub fn new(input: &'a Input) -> Self {
    let lines = input.sources.iter().filter_map(|(file, value)| {
        let text = value.as_str()?;
        let mut offsets = vec![(0, 0)]; let mut utf16 = 0;
        for (at, ch) in text.char_indices() { utf16 += ch.len_utf16(); if ch == '\n' { offsets.push((at + 1, utf16)); } }
        Some((file.clone(), offsets))
    }).collect();
    Self { input, lines }
}
fn position(&self, file: &str, offset: usize) -> (usize, usize, usize) {
    let text = self.input.sources.get(file).and_then(|value| value.as_str()).unwrap_or("");
    let Some(lines) = self.lines.get(file) else { return (1, 1, 0); };
    let line = lines.partition_point(|&(at, _)| at <= offset).saturating_sub(1);
    let (start, prefix) = lines[line];
    let column = text.get(start..offset).unwrap_or("").encode_utf16().count();
    (line + 1, column + 1, prefix + column)
}
pub fn ranges(&self, start: usize, end: usize) -> Vec<SourceRange> {
    let from = self.input.segments.partition_point(|segment| segment.end <= start);
    self.input.segments[from..].iter().take_while(|segment| segment.start < end).filter_map(|segment| {
        let left = start.max(segment.start);
        let right = end.min(segment.end);
        if left >= right { return None; }
        let (a, b) = if segment.generated { (segment.original[0], segment.original[1]) } else { (segment.original[0] + left - segment.start, segment.original[0] + right - segment.start) };
        Some(SourceRange { file: segment.file.clone(), start: a, end: b, utf16_start: self.position(&segment.file, a).2, utf16_end: self.position(&segment.file, b).2, generated: segment.generated, text_start: self.input.text.get(start..left).unwrap_or("").encode_utf16().count(), text_end: self.input.text.get(start..right).unwrap_or("").encode_utf16().count() })
    }).collect()
}

pub fn location(&self, ranges: &[SourceRange]) -> Location {
    let Some(first) = ranges.first() else { return Location { file: self.input.file.clone(), line: 1, column: 1 }; };
    let (line, column, _) = self.position(&first.file, first.start);
    Location { file: first.file.clone(), line, column }
}

pub fn diagnostic(&self, start: usize, end: usize, message: impl Into<String>) -> Diagnostic {
    let range = self.ranges(start, end);
    let at = self.location(&range);
    Diagnostic { severity: "error".into(), message: message.into(), path: at.file, line: at.line, column: at.column, range }
}
}
