//! Where the mistake is in the Typst a document writes inside `<typ>`.
//!
//! The engine sets the code of a `<typ>` block with `eval`, and Typst reports a mistake in evaluated text at the `eval` call (a line of
//! `components/typ.typ`), without the line inside the block. So when a build fails there, the app looks for the block itself: it finds
//! every `<typ>` block of the project's Markdown files, builds each one alone as a small Typst file (the same words the engine gives it:
//! the kit, with `theme`, `zoom` and `feel`), and the one that fails has real lines, which are turned back into lines of the Markdown
//! file. A `<typ src="...">` whose file is not there is told on its tag. Mistakes inside a `src` file need none of this: Typst names
//! that file and line itself.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use regex::Regex;
use typst_layout::PagedDocument;

use crate::compile::{Diagnostic, Engine, convert};
use crate::world::ProjectWorld;

/// The file the engine's `<typ>` runs `eval` in: a mistake with this path has lost its place inside the block.
const ENGINE_FILE: &str = "components/typ.typ";

/// The small file a block is built alone in (never written to disk: it is served beside the editor's unsaved texts).
const CHECK_FILE: &str = "__typ_check.typ";

/// At most this many blocks are built alone for one failed build.
const MAX_BLOCKS: usize = 40;

/// A `<typ>` in a Markdown file.
#[derive(Debug, PartialEq)]
pub(crate) struct Block {
    /// The Markdown file it is in (project-relative).
    pub file: String,
    /// The line of the `<typ` tag (1-based).
    pub tag_line: usize,
    /// `src="..."`, when the tag names a Typst file instead of holding code.
    pub src: Option<String>,
    /// The code between the fences, and the line it starts on (1-based; `0` for a `src` tag).
    pub code: String,
    pub first_line: usize,
}

fn fence_of(line: &str) -> Option<String> {
    let trimmed = line.trim_start();
    let marker = trimmed.chars().next().filter(|c| *c == '`' || *c == '~')?;
    let run = trimmed.chars().take_while(|c| *c == marker).count();
    (run >= 3).then(|| marker.to_string().repeat(run))
}

fn opens_typ(line: &str) -> bool {
    let trimmed = line.trim_start();
    trimmed.strip_prefix("<typ").is_some_and(|rest| rest.chars().next().is_none_or(|c| c.is_whitespace() || c == '>' || c == '/'))
}

/// Every `<typ>` of a Markdown text. A `<typ>` that is shown inside a fenced code block of the document (an example in a manual) is not one.
pub(crate) fn find_blocks(file: &str, markdown: &str) -> Vec<Block> {
    let src = Regex::new(r#"\bsrc\s*=\s*"([^"]*)""#).expect("a valid pattern");
    let lines: Vec<&str> = markdown.lines().collect();
    let mut out = Vec::new();
    let mut open_fence: Option<String> = None;
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i];
        if let Some(fence) = &open_fence {
            if line.trim_start().starts_with(fence.as_str()) {
                open_fence = None;
            }
            i += 1;
            continue;
        }
        if opens_typ(line) {
            if let Some(found) = src.captures(line) {
                out.push(Block { file: file.to_string(), tag_line: i + 1, src: Some(found[1].to_string()), code: String::new(), first_line: 0 });
                i += 1;
                continue;
            }
            // The code block: the first fence after the tag, before the tag is closed
            let mut j = i + 1;
            while j < lines.len() && !lines[j].contains("</typ>") && fence_of(lines[j]).is_none() {
                j += 1;
            }
            if j < lines.len() && fence_of(lines[j]).is_some() {
                let fence = fence_of(lines[j]).unwrap_or_default();
                let mut k = j + 1;
                while k < lines.len() && !lines[k].trim_start().starts_with(fence.as_str()) {
                    k += 1;
                }
                out.push(Block { file: file.to_string(), tag_line: i + 1, src: None, code: lines[j + 1..k.min(lines.len())].join("\n"), first_line: j + 2 });
                i = k + 1;
                continue;
            }
            i += 1;
            continue;
        }
        if let Some(fence) = fence_of(line) {
            open_fence = Some(fence);
        }
        i += 1;
    }
    out
}

/// The paths of `#include "..."` / `#import "..."` written from the project root, as the engine rewrites them before `eval`.
fn root_paths(code: &str) -> String {
    let pattern = Regex::new(r#"\b(include|import)(\s+)"([^"@/:][^"]*)""#).expect("a valid pattern");
    pattern.replace_all(code, "$1$2\"/$3\"").into_owned()
}

/// The Markdown files of a project folder (the editor's unsaved texts are used instead of what is on disk).
fn markdown_files(dir: &Path) -> Vec<String> {
    let mut out = Vec::new();
    let mut stack: Vec<PathBuf> = vec![dir.to_path_buf()];
    while let Some(folder) = stack.pop() {
        let Ok(entries) = std::fs::read_dir(&folder) else { continue };
        for entry in entries.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().into_owned();
            if path.is_dir() {
                if !matches!(name.as_str(), ".git" | "node_modules" | ".formatex") {
                    stack.push(path);
                }
            } else if name.ends_with(".md") || name.ends_with(".markdown") {
                if let Ok(inside) = path.strip_prefix(dir) {
                    out.push(inside.to_string_lossy().replace('\\', "/"));
                }
            }
        }
        if out.len() > 500 {
            break;
        }
    }
    out.sort();
    out
}

/// Builds one block alone: the kit, then the code, as a small file of the project. Returns the first mistake it finds, with the place it
/// has in that file.
fn check(engine: &Engine, dir: &Path, inputs: &HashMap<String, String>, extra: &HashMap<String, Vec<u8>>, code: &str) -> Option<Diagnostic> {
    let mut files = extra.clone();
    files.insert(CHECK_FILE.to_string(), format!("#import \"/src/kit.typ\": *\n{}\n", root_paths(code)).into_bytes());
    let world = ProjectWorld::new(Some(dir.to_path_buf()), CHECK_FILE, engine.packages.clone(), engine.fonts.get(), engine.components.clone(), inputs, files);
    let errors = typst::compile::<PagedDocument>(&world).output.err()?;
    typst::comemo::evict(10);
    let first = errors.first()?;
    Some(convert(&world, first))
}

/// Replaces the mistakes that were reported at the `eval` of `<typ>` by the ones found inside the blocks: a line of the block, as a line of
/// its Markdown file. A mistake that cannot be placed stays as it was.
pub(crate) fn relocate(engine: &Engine, dir: &Path, inputs: &HashMap<String, String>, extra: &HashMap<String, Vec<u8>>, diagnostics: &mut Vec<Diagnostic>) {
    if !diagnostics.iter().any(|d| d.path.as_deref() == Some(ENGINE_FILE)) {
        return;
    }
    let mut blocks = Vec::new();
    for file in markdown_files(dir) {
        let text = match extra.get(&file) {
            Some(bytes) => String::from_utf8_lossy(bytes).into_owned(),
            None => std::fs::read_to_string(dir.join(&file)).unwrap_or_default(),
        };
        if text.contains("<typ") {
            blocks.extend(find_blocks(&file, &text));
        }
    }

    let mut found: Vec<Diagnostic> = Vec::new();
    for block in blocks.iter().take(MAX_BLOCKS) {
        match &block.src {
            // A Typst file the tag names that is not there (a mistake inside it is named by Typst already)
            Some(path) => {
                let exists = extra.contains_key(path.trim_start_matches('/')) || dir.join(path.trim_start_matches('/')).is_file();
                if !exists {
                    found.push(Diagnostic::error(format!("file not found: {path}"), &block.file, block.tag_line, 1));
                }
            }
            None => {
                let Some(mut problem) = check(engine, dir, inputs, extra, &block.code) else { continue };
                if problem.path.as_deref() == Some(CHECK_FILE) {
                    // Line 1 of the small file is the kit; the code starts on line 2
                    let inside = problem.line.unwrap_or(2).saturating_sub(1).max(1);
                    problem.path = Some(block.file.clone());
                    problem.line = Some(block.first_line + inside - 1);
                }
                found.push(problem);
            }
        }
    }
    if found.is_empty() {
        return;
    }
    diagnostics.retain(|d| d.path.as_deref() != Some(ENGINE_FILE));
    diagnostics.extend(found);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_the_blocks_and_the_line_their_code_starts_on() {
        let md = "# T\n\n<typ>\n\n```typ\nLine one\n#let a = 1\n```\n\n</typ>\n\ntext\n\n<typ src=\"parts/x.typ\"></typ>\n";
        let blocks = find_blocks("main.md", md);
        assert_eq!(blocks.len(), 2);
        assert_eq!(blocks[0], Block { file: "main.md".into(), tag_line: 3, src: None, code: "Line one\n#let a = 1".into(), first_line: 6 });
        assert_eq!(blocks[1].src.as_deref(), Some("parts/x.typ"));
        assert_eq!(blocks[1].tag_line, 14);
    }

    #[test]
    fn a_typ_shown_inside_a_code_block_of_the_document_is_not_a_block() {
        let md = "How to write it:\n\n````md\n<typ>\n\n```typ\n#oops\n```\n\n</typ>\n````\n\n<typed>not a typ</typed>\n";
        assert!(find_blocks("m.md", md).is_empty());
    }

    #[test]
    fn paths_are_rooted_the_way_the_engine_does_it() {
        assert_eq!(root_paths("#import \"parts/a.typ\": x\n#include \"b.typ\""), "#import \"/parts/a.typ\": x\n#include \"/b.typ\"");
        assert_eq!(root_paths("#import \"@preview/cetz:0.5.2\"\n#import \"/src/kit.typ\": *"), "#import \"@preview/cetz:0.5.2\"\n#import \"/src/kit.typ\": *");
    }

    #[test]
    fn a_tag_without_a_code_block_is_skipped() {
        assert!(find_blocks("m.md", "<typ></typ>\n").is_empty());
    }
}
