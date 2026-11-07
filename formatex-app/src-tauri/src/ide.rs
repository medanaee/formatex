//! What a code editor knows about Typst: completions as you type, and the way between a place in the text and a place on the page.
//! This is `typst-ide`, the same code the Typst web app and tinymist use, run on the world of the project (its files, its packages, and the
//! editor's unsaved text), so it sees what the build sees. These tools are for a plain Typst project.

use std::collections::HashMap;
use std::num::NonZeroUsize;
use std::sync::{Arc, LazyLock, Mutex};

use serde::Serialize;
use tauri::State;
use typst::layout::Point;
use typst_layout::PagedDocument;
use typst::introspection::PagedPosition;
use typst::syntax::Source;
use typst::World;
use typst_ide::{CompletionKind, IdeWorld, Jump};

use crate::compile::{Engine, check_relative, kept_world, overrides_to_bytes, project_dir};
use crate::world::ProjectWorld;

/// The last build that worked, by project. A click in the preview or the cursor of the editor are looked up in it.
static LAST: LazyLock<Mutex<HashMap<String, Arc<PagedDocument>>>> = LazyLock::new(|| Mutex::new(HashMap::new()));

pub(crate) fn remember(project_id: &str, document: &PagedDocument) {
    LAST.lock().unwrap_or_else(|e| e.into_inner()).insert(project_id.to_string(), Arc::new(document.clone()));
}

fn last(project_id: &str) -> Option<Arc<PagedDocument>> {
    LAST.lock().unwrap_or_else(|e| e.into_inner()).get(project_id).cloned()
}

// ----- positions -----
// The editor counts in UTF-16 units (JavaScript), Typst in bytes.

fn byte_of(text: &str, utf16: usize) -> usize {
    let mut units = 0;
    for (index, char) in text.char_indices() {
        if units >= utf16 {
            return index;
        }
        units += char.len_utf16();
    }
    text.len()
}

fn utf16_of(text: &str, byte: usize) -> usize {
    text[..byte.min(text.len())].chars().map(char::len_utf16).sum()
}

// ----- completions -----

#[derive(Serialize)]
pub struct Completion {
    /// `func`, `type`, `param`, `constant`, `path`, `package`, `label`, `syntax`, `symbol`.
    kind: &'static str,
    label: String,
    /// What is written instead of the label, with `${}` where the cursor goes.
    apply: Option<String>,
    detail: Option<String>,
}

#[derive(Serialize)]
pub struct Completions {
    /// Where the text the choice replaces starts, in UTF-16 units.
    from: usize,
    completions: Vec<Completion>,
}

fn kind_name(kind: &CompletionKind) -> &'static str {
    match kind {
        CompletionKind::Syntax => "syntax",
        CompletionKind::Func => "func",
        CompletionKind::Type => "type",
        CompletionKind::Param => "param",
        CompletionKind::Constant => "constant",
        CompletionKind::Path => "path",
        CompletionKind::Package => "package",
        CompletionKind::Label => "label",
        CompletionKind::Font { .. } => "font",
        CompletionKind::Symbol(_) => "symbol",
    }
}

/// The main file to compile: the one chosen, else the file being edited (nothing is built without a main file, but the tools still work).
fn entry<'a>(main: &'a str, path: &'a str) -> &'a str {
    if main.is_empty() { path } else { main }
}

fn world_of(engine: &Engine, project_id: &str, main: &str, path: &str, overrides: HashMap<String, String>) -> Result<Arc<Mutex<ProjectWorld>>, String> {
    check_relative(path)?;
    if !main.is_empty() {
        check_relative(main)?;
    }
    let dir = project_dir(engine, project_id)?;
    let world = kept_world(engine, project_id, entry(main, path), &HashMap::new(), true, &dir);
    world.lock().unwrap_or_else(|e| e.into_inner()).refresh(overrides_to_bytes(overrides, true)?);
    Ok(world)
}

/// The completions at a cursor of a file of a plain Typst project. `offset` is in UTF-16 units; `explicit` is a request for them
/// (Ctrl+Space) rather than typing.
#[tauri::command]
pub async fn typst_complete(
    engine: State<'_, Arc<Engine>>,
    project_id: String,
    main: String,
    path: String,
    offset: usize,
    explicit: bool,
    overrides: Option<HashMap<String, String>>,
) -> Result<Option<Completions>, String> {
    let engine = engine.inner().clone();
    tauri::async_runtime::spawn_blocking(move || complete_in(&engine, &project_id, &main, &path, offset, explicit, overrides.unwrap_or_default()))
        .await
        .map_err(|error| error.to_string())?
}

fn complete_in(engine: &Engine, project_id: &str, main: &str, path: &str, offset: usize, explicit: bool, overrides: HashMap<String, String>) -> Result<Option<Completions>, String> {
    let world = world_of(engine, project_id, main, path, overrides)?;
    let world = world.lock().unwrap_or_else(|e| e.into_inner());
    let Some(id) = ProjectWorld::project_file(path) else { return Ok(None) };
    let Ok(source) = world.source(id) else { return Ok(None) };
    let cursor = byte_of(source.text(), offset);
    let document = last(project_id);
    let found = typst_ide::autocomplete(&*world as &dyn IdeWorld, document.as_deref(), &source, cursor, explicit);
    Ok(found.map(|(from, completions)| Completions {
        from: utf16_of(source.text(), from),
        completions: completions
            .into_iter()
            .map(|item| Completion { kind: kind_name(&item.kind), label: item.label.to_string(), apply: item.apply.map(|text| text.to_string()), detail: item.detail.map(|text| text.to_string()) })
            .collect(),
    }))
}

// ----- the way between the text and the page -----

/// A place in a file, 1-based line and column (in characters).
#[derive(Serialize)]
pub struct Place {
    path: String,
    line: usize,
    column: usize,
}

/// A place on a page, in points from its top left corner.
#[derive(Serialize)]
pub struct OnPage {
    page: usize,
    x: f64,
    y: f64,
}

fn place_of(world: &ProjectWorld, id: typst::syntax::FileId, byte: usize) -> Option<Place> {
    let path = ProjectWorld::display_path(id)?;
    let source: Source = world.source(id).ok()?;
    let (line, column) = source.lines().byte_to_line_column(byte)?;
    Some(Place { path, line: line + 1, column: column + 1 })
}

/// What stands at a click in the preview: the place in the text it was typeset from. `x` and `y` are in points from the page's top left.
#[tauri::command]
pub async fn typst_jump_from_click(
    engine: State<'_, Arc<Engine>>,
    project_id: String,
    main: String,
    page: usize,
    x: f64,
    y: f64,
) -> Result<Option<Place>, String> {
    let engine = engine.inner().clone();
    tauri::async_runtime::spawn_blocking(move || click_in(&engine, &project_id, &main, page, x, y))
        .await
        .map_err(|error| error.to_string())?
}

fn click_in(engine: &Engine, project_id: &str, main: &str, page: usize, x: f64, y: f64) -> Result<Option<Place>, String> {
    let Some(document) = last(project_id) else { return Ok(None) };
    let Some(page) = NonZeroUsize::new(page) else { return Ok(None) };
    let dir = project_dir(engine, project_id)?;
    let world = kept_world(engine, project_id, main, &HashMap::new(), true, &dir);
    let world = world.lock().unwrap_or_else(|e| e.into_inner());
    let position = PagedPosition { page, point: Point::new(typst::layout::Abs::pt(x), typst::layout::Abs::pt(y)) };
    Ok(match typst_ide::jump_from_click(&*world as &dyn IdeWorld, &*document, &position) {
        Some(Jump::File(id, byte)) => place_of(&world, id, byte),
        _ => None,
    })
}

/// Where on the page the text at a cursor was typeset (the first place, when it is on several). `offset` is in UTF-16 units.
#[tauri::command]
pub async fn typst_jump_to_cursor(
    engine: State<'_, Arc<Engine>>,
    project_id: String,
    main: String,
    path: String,
    offset: usize,
    overrides: Option<HashMap<String, String>>,
) -> Result<Option<OnPage>, String> {
    let engine = engine.inner().clone();
    tauri::async_runtime::spawn_blocking(move || cursor_in(&engine, &project_id, &main, &path, offset, overrides.unwrap_or_default()))
        .await
        .map_err(|error| error.to_string())?
}

fn cursor_in(engine: &Engine, project_id: &str, main: &str, path: &str, offset: usize, overrides: HashMap<String, String>) -> Result<Option<OnPage>, String> {
    let Some(document) = last(project_id) else { return Ok(None) };
    let world = world_of(engine, project_id, main, path, overrides)?;
    let world = world.lock().unwrap_or_else(|e| e.into_inner());
    let Some(id) = ProjectWorld::project_file(path) else { return Ok(None) };
    let Ok(source) = world.source(id) else { return Ok(None) };
    let cursor = byte_of(source.text(), offset);
    Ok(typst_ide::jump_from_cursor(&*document, &source, cursor).first().map(|position| OnPage { page: position.page.get(), x: position.point.x.to_pt(), y: position.point.y.to_pt() }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::compile::{compile_as, tests_engine};
    use std::fs;

    /// A plain Typst project with a built page, to ask the tools about.
    fn built(name: &str, main_text: &str) -> (Engine, std::path::PathBuf) {
        let dir = std::env::temp_dir().join(format!("formatex-ide-{name}-{}", std::process::id()));
        let project = dir.join("documents").join("p");
        fs::create_dir_all(&project).unwrap();
        fs::write(project.join("main.typ"), main_text).unwrap();
        let engine = tests_engine(&dir);
        compile_as(&engine, "p", "main.typ", HashMap::new(), HashMap::new(), true).unwrap().document.expect("compiles");
        (engine, dir)
    }

    #[test]
    fn completes_functions_and_arguments_as_typst_does() {
        // The file on disk builds; what the editor holds, unsaved and unfinished, is what is completed
        let (engine, dir) = built("complete", "= Title
");
        let typed = "#set text(size: 12pt)
#lore";
        let unsaved = HashMap::from([("main.typ".to_string(), typed.to_string())]);
        let found = complete_in(&engine, "p", "main.typ", "main.typ", typed.len(), false, unsaved).unwrap().expect("completions");
        assert!(found.completions.iter().any(|item| item.label == "lorem" && item.kind == "func"), "{:?}", found.completions.iter().map(|c| c.label.clone()).take(10).collect::<Vec<_>>());
        // The choice replaces what was typed: it starts at the `l` after the `#`
        assert_eq!(found.from, typed.find("#lore").unwrap() + 1);

        let typed = "#let greeting = 1
#greet";
        let unsaved = HashMap::from([("main.typ".to_string(), typed.to_string())]);
        let found = complete_in(&engine, "p", "main.typ", "main.typ", typed.len(), false, unsaved).unwrap().expect("completions");
        assert!(found.completions.iter().any(|item| item.label == "greeting"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn a_click_on_the_page_finds_its_text_and_the_text_finds_its_place_on_the_page() {
        let (engine, dir) = built("jump", "#set page(width: 200pt, height: 200pt, margin: 20pt)\nFirst line\n\nSecond line\n");
        // The cursor on "Second": a place on the page
        let text = "#set page(width: 200pt, height: 200pt, margin: 20pt)\nFirst line\n\nSecond line\n";
        let at = text.find("Second").unwrap() + 2;
        let on = cursor_in(&engine, "p", "main.typ", "main.typ", at, HashMap::new()).unwrap().expect("a place on the page");
        assert_eq!(on.page, 1);
        assert!(on.x >= 20.0 && on.y > 20.0, "inside the margins: {} {}", on.x, on.y);

        // A click there leads back to that line of the file
        let back = click_in(&engine, "p", "main.typ", on.page, on.x + 1.0, on.y).unwrap().expect("a place in the text");
        assert_eq!(back.path, "main.typ");
        assert_eq!(back.line, 4, "the Second line is line 4");
        // The margin has no text
        assert!(click_in(&engine, "p", "main.typ", 1, 2.0, 2.0).unwrap().is_none());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn positions_count_utf16_units_in_and_bytes_out() {
        let text = "aالb😀c";
        // a, ا, ل, b are one unit each; the emoji is two units and four bytes
        assert_eq!(byte_of(text, 0), 0);
        assert_eq!(byte_of(text, 1), 1);
        assert_eq!(byte_of(text, 3), 5);
        assert_eq!(byte_of(text, 4), 6);
        assert_eq!(byte_of(text, 6), 10);
        assert_eq!(byte_of(text, 99), text.len());
        for unit in [0, 1, 2, 3, 4, 6, 7] {
            assert_eq!(utf16_of(text, byte_of(text, unit)), unit);
        }
    }
}
