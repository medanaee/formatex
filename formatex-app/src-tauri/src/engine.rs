//! The directly assembled shared core and PDF backend embedded in the native application.
//!
//! `npm run engine:sync` copies it to `engine/`; `include_dir!` embeds `engine/bundle`. A project folder holds only the
//! user's files (config.toml, Markdown, images, ...): the engine files are served from here, so the user cannot break them.

use include_dir::{Dir, include_dir};

static BUNDLE: Dir<'static> = include_dir!("$CARGO_MANIFEST_DIR/../engine/bundle");

/// Top-level names of the project root that belong to the engine. A project can neither shadow nor create them.
const OWNED: &[&str] = &["main.typ", "code-dark.tmTheme", "src", "components", "tools"];

/// Whether a project-relative path (`src/core.typ`, `main.typ`) is an engine file.
pub fn owns(path: &str) -> bool {
    let first = path.trim_start_matches('/').split('/').next().unwrap_or("");
    OWNED.contains(&first)
}

/// The contents of an engine file, by project-relative path.
pub fn file(path: &str) -> Option<&'static [u8]> {
    BUNDLE.get_file(path.trim_start_matches('/')).map(|f| f.contents())
}

/// The file every compilation starts from.
pub const ENTRY: &str = "main.typ";

/// The entry that exposes every component's schema as data (`#metadata(...) <schemas>`).
pub const SCHEMA_ENTRY: &str = "tools/schema.typ";

/// The components that ship with the engine: name and source, from six-file `components/<name>/` packages.
pub fn builtin_components() -> Vec<(String, &'static str)> {
    let Some(dir) = BUNDLE.get_dir("components") else { return Vec::new() };
    let mut out: Vec<(String, &'static str)> = dir.dirs().filter_map(|folder| {
        let name = folder.path().file_name()?.to_str()?;
        let source = file(&format!("components/{name}/typst.typ")).and_then(|bytes| std::str::from_utf8(bytes).ok()).unwrap_or("");
        Some((name.to_string(), source))
    }).collect();
    out.sort();
    out
}
