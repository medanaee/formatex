mod grammar;
mod model;
mod parse;
mod resolve;
mod source;

pub use model::*;
pub use resolve::{resolve, layers, merge_settings};

/// The exact same parser runs in native tests and inside the Typst WASM plugin.
pub fn parse_document(mut input: Input) -> Result<Document, Diagnostic> {
    if input.sources.is_empty() { input.sources.insert(input.file.clone(), input.text.clone().into()); }
    if input.segments.is_empty() && !input.text.is_empty() { input.segments.push(Segment { start: 0, end: input.text.len(), file: input.file.clone(), original: [0, input.text.len()], generated: false }); }
    // Long untouched files need one linear mapping, not a repeated entry for every line/node.
    let mut segments: Vec<Segment> = Vec::new();
    for segment in input.segments.drain(..) {
        if let Some(last) = segments.last_mut() {
            if last.end == segment.start && last.file == segment.file && last.generated == segment.generated && ((!last.generated && last.original[1] == segment.original[0]) || (last.generated && last.original == segment.original)) {
                last.end = segment.end; if !last.generated { last.original[1] = segment.original[1]; } continue;
            }
        }
        segments.push(segment);
    }
    input.segments = segments;
    let mut parser = parse::DocumentParser::new(&input);
    let mut children = parser.parse(&input.text, 0)?;
    parser.bind(&mut children)?;
    Ok(Document { version: 1, file: input.file, children, settings: input.settings, tokens: input.tokens, sources: input.sources, segments: input.segments, packages: input.packages, options: input.options })
}

#[cfg(target_arch = "wasm32")]
wasm_minimal_protocol::initiate_protocol!();

#[cfg(target_arch = "wasm32")]
#[wasm_minimal_protocol::wasm_func]
pub fn parse(bytes: &[u8]) -> Result<Vec<u8>, String> {
    let input: Input = serde_json::from_slice(bytes).map_err(|error| error.to_string())?;
    let result = match parse_document(input) {
        Ok(document) => serde_json::json!({ "ok": true, "document": document }),
        Err(diagnostic) => serde_json::json!({ "ok": false, "diagnostics": [diagnostic] }),
    };
    serde_json::to_vec(&result).map_err(|error| error.to_string())
}
