//! Compiling a project: commands the editor calls.
//!
//! - `compile_project`: the preview. Pages come back as SVG (vector, exact glyphs, no font needed in the WebView) with the
//!   diagnostics (errors and warnings, with file / line / column).
//! - `export_pdf`: the PDF bytes of the same compilation.
//! - `fonts_list` / `fonts_reload`: the fonts the compiler sees (the user imports fonts as files in `<app data>/fonts`).

use std::collections::{BTreeMap, HashMap};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use serde::Serialize;
use tauri::ipc::Response;
use tauri::{AppHandle, Manager, State};
use typst::diag::{Severity, SourceDiagnostic};
use typst_layout::PagedDocument;
use typst::{World, WorldExt};
use typst_kit::packages::SystemPackages;
use typst_pdf::PdfOptions;
use typst_svg::SvgOptions;

use crate::components::ComponentLibrary;
use crate::engine;
use crate::fonts::{FamilyInfo, FontService};
use crate::links::{self, Marker, PageMap};
use crate::world::ProjectWorld;

/// Everything the commands share; created once at startup.
pub struct Engine {
    pub data_dir: PathBuf,
    pub fonts: FontService,
    pub packages: Arc<SystemPackages>,
    pub components: Arc<ComponentLibrary>,
    /// One world per project, kept between compilations: Typst then reuses what did not change, as its own watch mode does.
    pub worlds: Mutex<HashMap<String, (String, Arc<Mutex<ProjectWorld>>)>>,
}

#[derive(Serialize)]
pub struct Diagnostic {
    severity: &'static str,
    message: String,
    /// Project-relative path; `None` for a package file.
    path: Option<String>,
    /// 1-based.
    line: Option<usize>,
    /// 1-based.
    column: Option<usize>,
    hints: Vec<String>,
}

#[derive(Serialize)]
pub struct PageOutput {
    /// Identifies the page's content: equal hashes are the same page.
    hash: String,
    /// The page as SVG; absent when the frontend already has this hash.
    svg: Option<String>,
    /// Links and text runs of the page, sent with its SVG (the frontend keeps them by hash).
    map: Option<PageMap>,
}

#[derive(Serialize)]
pub struct CompileOutput {
    /// Every page in order; empty when the compilation failed.
    pages: Vec<PageOutput>,
    diagnostics: Vec<Diagnostic>,
    /// Where each block of the source starts on the pages; empty unless the build was asked for `markers=1`.
    markers: Vec<Marker>,
    ok: bool,
    elapsed_ms: u128,
}

impl Diagnostic {
    pub fn is_error(&self) -> bool {
        self.severity == "error"
    }

    pub fn message(&self) -> &str {
        &self.message
    }
}

type Inputs = HashMap<String, String>;

/// Ids come from the app (UUIDs); refuse anything that could leave the documents folder.
fn project_dir(engine: &Engine, project_id: &str) -> Result<PathBuf, String> {
    let valid = !project_id.is_empty() && project_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if !valid {
        return Err(format!("invalid project id {project_id:?}"));
    }
    let dir = engine.data_dir.join("documents").join(project_id);
    if dir.is_dir() { Ok(dir) } else { Err(format!("project folder not found: {project_id}")) }
}

/// A project-relative path: no drive, no leading slash, no `..`.
fn check_relative(path: &str) -> Result<(), String> {
    let bad = path.is_empty() || path.starts_with('/') || path.contains('\\') || path.contains(':') || path.split('/').any(|part| part.is_empty() || part == "..");
    if bad { Err(format!("invalid path {path:?}")) } else { Ok(()) }
}

/// A problem the engine found while reading the user's own text says where it is: `@path:line message` (the engine's
/// `src/preprocess/check.typ`). Returns the path, the line and the message without that mark.
fn located(message: &str) -> Option<(String, usize, String)> {
    let at = message.find('@')?;
    let head = &message[..at];
    // Only Typst's own "assertion failed: " may stand before the mark
    if !head.is_empty() && head != "assertion failed: " {
        return None;
    }
    let (place, text) = message[at + 1..].split_once(' ')?;
    let (path, line) = place.rsplit_once(':')?;
    let line: usize = line.parse().ok()?;
    (!path.is_empty() && line > 0).then(|| (path.to_string(), line, format!("{head}{text}")))
}

/// Typst reports a missing or repeated label on its own, without a line; when the engine has already said the same thing with the
/// line of the text (`... id "x" ...`), the plain one is dropped.
fn drop_unplaced_labels(diagnostics: &mut Vec<Diagnostic>) {
    let said: Vec<String> = diagnostics
        .iter()
        .filter(|d| d.path.is_some())
        .filter_map(|d| d.message.split("id \"").nth(1).and_then(|rest| rest.split('"').next()).map(str::to_owned))
        .collect();
    diagnostics.retain(|d| {
        !(d.path.is_none()
            && said.iter().any(|id| d.message == format!("label `<{id}>` does not exist in the document") || d.message == format!("label `<{id}>` occurs multiple times in the document")))
    });
}

pub(crate) fn convert(world: &ProjectWorld, diagnostic: &SourceDiagnostic) -> Diagnostic {
    let location = diagnostic.span.id().map(|id| {
        let position = world.range(diagnostic.span).and_then(|range| {
            let source = world.source(id).ok()?;
            source.lines().byte_to_line_column(range.start)
        });
        (ProjectWorld::display_path(id), position)
    });
    let (path, position) = location.unwrap_or((None, None));
    let message = diagnostic.message.to_string();
    if let Some((path, line, message)) = located(&message) {
        return Diagnostic {
            severity: if diagnostic.severity == Severity::Error { "error" } else { "warning" },
            message,
            path: Some(path),
            line: Some(line),
            column: Some(1),
            hints: diagnostic.hints.iter().map(|hint| hint.v.to_string()).collect(),
        };
    }
    Diagnostic {
        severity: match diagnostic.severity {
            Severity::Error => "error",
            Severity::Warning => "warning",
        },
        message,
        path,
        line: position.map(|(line, _)| line + 1),
        column: position.map(|(_, column)| column + 1),
        hints: diagnostic.hints.iter().map(|hint| hint.v.to_string()).collect(),
    }
}

struct Compiled {
    document: Option<PagedDocument>,
    diagnostics: Vec<Diagnostic>,
}

/// Unsaved text of the editor, by project path: used instead of the file on disk. Engine paths cannot be replaced.
fn overrides_to_bytes(overrides: HashMap<String, String>) -> Result<HashMap<String, Vec<u8>>, String> {
    let mut out = HashMap::new();
    for (path, text) in overrides {
        check_relative(&path)?;
        if !engine::owns(&path) {
            out.insert(path, text.into_bytes());
        }
    }
    Ok(out)
}

fn compile(engine: &Engine, project_id: &str, main: &str, mut inputs: Inputs, overrides: HashMap<String, String>) -> Result<Compiled, String> {
    check_relative(main)?;
    let dir = project_dir(engine, project_id)?;
    // The engine reads the Markdown file to typeset from `sys.inputs.source`
    inputs.insert("source".into(), main.into());
    let extra = overrides_to_bytes(overrides)?;
    let fonts = engine.fonts.get();

    // The kept world is rebuilt when what it was built from changed: another main file or inputs, a new component library, new fonts
    let sorted: BTreeMap<_, _> = inputs.iter().collect();
    let key = format!("{sorted:?}|{}|{:p}", engine.components.generation(), Arc::as_ptr(&fonts));
    let world = {
        let mut worlds = engine.worlds.lock().unwrap_or_else(|e| e.into_inner());
        match worlds.get(project_id) {
            Some((existing, world)) if *existing == key => world.clone(),
            _ => {
                let world = Arc::new(Mutex::new(ProjectWorld::new(Some(dir), engine::ENTRY, engine.packages.clone(), fonts, engine.components.clone(), &inputs, HashMap::new())));
                worlds.insert(project_id.to_string(), (key, world.clone()));
                world
            }
        }
    };
    let mut world = world.lock().unwrap_or_else(|e| e.into_inner());
    world.refresh(extra);

    let warned = typst::compile::<PagedDocument>(&*world);
    let mut diagnostics: Vec<Diagnostic> = warned.warnings.iter().map(|d| convert(&world, d)).collect();
    let document = match warned.output {
        Ok(document) => Some(document),
        Err(errors) => {
            diagnostics.extend(errors.iter().map(|d| convert(&world, d)));
            drop_unplaced_labels(&mut diagnostics);
            None
        }
    };
    // Keep the incremental cache from growing for ever in a long-running app
    typst::comemo::evict(10);
    Ok(Compiled { document, diagnostics })
}

#[tauri::command]
pub async fn compile_project(
    engine: State<'_, Arc<Engine>>,
    project_id: String,
    main: String,
    inputs: Option<Inputs>,
    overrides: Option<HashMap<String, String>>,
    known: Option<Vec<String>>,
) -> Result<CompileOutput, String> {
    let engine = engine.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let started = Instant::now();
        let compiled = compile(&engine, &project_id, &main, inputs.unwrap_or_default(), overrides.unwrap_or_default())?;
        let known = known.unwrap_or_default();
        // A page whose hash the frontend already has is not rendered or sent again
        let pages = compiled
            .document
            .as_ref()
            .map(|document| {
                document
                    .pages()
                    .iter()
                    .enumerate()
                    .map(|(index, page)| {
                        let hash = format!("{:032x}", typst::utils::hash128(page));
                        let fresh = known.get(index) != Some(&hash);
                        let svg = fresh.then(|| typst_svg::svg(page, &SvgOptions::default()));
                        let map = fresh.then(|| links::map_page(document, page));
                        PageOutput { hash, svg, map }
                    })
                    .collect()
            })
            .unwrap_or_default();
        let markers = compiled.document.as_ref().map(links::markers).unwrap_or_default();
        Ok(CompileOutput {
            ok: compiled.document.is_some(),
            pages,
            markers,
            diagnostics: compiled.diagnostics,
            elapsed_ms: started.elapsed().as_millis(),
        })
    })
    .await
    .map_err(|error| error.to_string())?
}

/// The first page of a project as SVG, for the library's cards; `None` when the project does not compile.
#[tauri::command]
pub async fn project_preview(
    engine: State<'_, Arc<Engine>>,
    project_id: String,
    main: String,
    overrides: Option<HashMap<String, String>>,
) -> Result<Option<String>, String> {
    let engine = engine.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let compiled = compile(&engine, &project_id, &main, Inputs::new(), overrides.unwrap_or_default())?;
        Ok(compiled.document.and_then(|document| document.pages().first().map(|page| typst_svg::svg(page, &SvgOptions::default()))))
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn export_pdf(
    engine: State<'_, Arc<Engine>>,
    project_id: String,
    main: String,
    inputs: Option<Inputs>,
    overrides: Option<HashMap<String, String>>,
) -> Result<Response, String> {
    let engine = engine.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let compiled = compile(&engine, &project_id, &main, inputs.unwrap_or_default(), overrides.unwrap_or_default())?;
        let Some(document) = compiled.document else {
            let first = compiled.diagnostics.iter().find(|d| d.severity == "error");
            return Err(first.map(|d| d.message.clone()).unwrap_or_else(|| "compilation failed".into()));
        };
        let bytes = typst_pdf::pdf(&document, &PdfOptions::default())
            .map_err(|errors| errors.iter().map(|e| e.message.to_string()).collect::<Vec<_>>().join("; "))?;
        Ok(Response::new(bytes))
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn fonts_list(engine: State<'_, Arc<Engine>>) -> Result<Vec<FamilyInfo>, String> {
    let engine = engine.inner().clone();
    tauri::async_runtime::spawn_blocking(move || engine.fonts.families()).await.map_err(|error| error.to_string())
}

/// Call after fonts were imported or removed: the next compilation scans the folders again.
#[tauri::command]
pub fn fonts_reload(engine: State<'_, Arc<Engine>>) {
    engine.fonts.reload();
}

/// Builds the shared state and starts scanning fonts in the background, so the first preview does not wait for it.
pub fn init(app: &AppHandle) -> Result<Arc<Engine>, Box<dyn std::error::Error>> {
    let data_dir = app.path().app_data_dir()?;
    let cache_dir = app.path().app_cache_dir()?;
    let engine = Arc::new(Engine {
        fonts: FontService::new(data_dir.join("fonts")),
        packages: Arc::new(crate::packages::system_packages(&cache_dir)),
        components: Arc::new(ComponentLibrary::new(data_dir.join("components"))),
        worlds: Mutex::new(HashMap::new()),
        data_dir,
    });
    let warm = engine.clone();
    std::thread::spawn(move || {
        warm.fonts.get();
    });
    Ok(engine)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    /// Compiles a real project (the embedded engine, the default config, the starter document) end to end. Needs the Typst
    /// packages of the engine: they are found in the typst cache or downloaded, so run it with network access once.
    #[test]
    fn compiles_the_starter_project() {
        let data_dir = std::env::temp_dir().join(format!("formatex-test-{}", std::process::id()));
        let project = data_dir.join("documents").join("starter");
        fs::create_dir_all(project.join("images")).unwrap();
        fs::write(project.join("config.toml"), include_str!("../../engine/config.toml")).unwrap();
        fs::write(project.join("main.md"), include_str!("../../templates/main.md")).unwrap();

        let engine = Engine {
            fonts: FontService::new(data_dir.join("fonts")),
            packages: Arc::new(crate::packages::system_packages(&data_dir.join("cache"))),
            components: Arc::new(ComponentLibrary::new(data_dir.join("components"))),
        worlds: Mutex::new(HashMap::new()),
            data_dir: data_dir.clone(),
        };

        let started = Instant::now();
        let compiled = compile(&engine, "starter", "main.md", Inputs::new(), HashMap::new()).unwrap();
        let first = started.elapsed();
        for d in &compiled.diagnostics {
            eprintln!("{} {:?}:{:?}:{:?} {}", d.severity, d.path, d.line, d.column, d.message);
        }
        let document = compiled.document.expect("the starter project must compile");
        assert!(!document.pages().is_empty());
        let svg = typst_svg::svg(&document.pages()[0], &SvgOptions::default());
        assert!(svg.starts_with("<svg"));
        let pdf = typst_pdf::pdf(&document, &PdfOptions::default()).unwrap();
        assert!(pdf.starts_with(b"%PDF"));

        // The second compilation reuses everything the first one computed
        let again = Instant::now();
        compile(&engine, "starter", "main.md", Inputs::new(), HashMap::new()).unwrap();
        eprintln!("pages: {}, first: {first:?}, second: {:?}, pdf: {} bytes", document.pages().len(), again.elapsed(), pdf.len());

        // A mistake is reported with a position instead of a panic
        fs::write(project.join("main.md"), "<alert type=\"nope\">x</alert>\n").unwrap();
        let broken = compile(&engine, "starter", "main.md", Inputs::new(), HashMap::new()).unwrap();
        assert!(broken.document.is_none());
        assert!(broken.diagnostics.iter().any(|d| d.severity == "error"));
        let _ = fs::remove_dir_all(data_dir);
    }

    /// With `markers=1` every block of the Markdown (and of an included file) reports where it starts on the pages; without it
    /// there are none, and the pages are the same.
    #[test]
    fn reports_where_the_blocks_of_the_source_start() {
        let data_dir = std::env::temp_dir().join(format!("formatex-test-markers-{}", std::process::id()));
        let project = data_dir.join("documents").join("marked");
        fs::create_dir_all(&project).unwrap();
        fs::write(project.join("config.toml"), include_str!("../../engine/config.toml")).unwrap();
        let repeated = (0..4).map(|_| "October

").collect::<String>();
        fs::write(project.join("part.md"), "Included text
").unwrap();
        fs::write(project.join("main.md"), format!("{repeated}<pagebreak>

{repeated}- one
- two

<include src=\"part.md\">
")).unwrap();
        let engine = Engine {
            fonts: FontService::new(data_dir.join("fonts")),
            packages: Arc::new(crate::packages::system_packages(&data_dir.join("cache"))),
            components: Arc::new(ComponentLibrary::new(data_dir.join("components"))),
            worlds: Mutex::new(HashMap::new()),
            data_dir: data_dir.clone(),
        };
        let built = |inputs: Inputs| {
            let compiled = compile(&engine, "marked", "main.md", inputs, HashMap::new()).unwrap();
            let problems: Vec<String> = compiled.diagnostics.iter().filter(|d| d.is_error()).map(|d| d.message().to_string()).collect();
            compiled.document.unwrap_or_else(|| panic!("does not compile: {problems:?}"))
        };
        let plain = built(Inputs::new());
        assert!(links::markers(&plain).is_empty());
        let inputs: Inputs = [("markers".to_string(), "1".to_string())].into();
        let marked = built(inputs);
        assert_eq!(plain.pages().len(), marked.pages().len());
        let found = links::markers(&marked);
        let lines: Vec<(String, usize, usize)> = found.iter().map(|m| (m.file.clone(), m.line, m.page)).collect();
        // The eight identical paragraphs have a marker each, the ones after the page break are on the next page
        assert_eq!(lines.iter().filter(|(f, l, p)| f == "main.md" && *l <= 7 && *p == 1 && *l % 2 == 1).count(), 4, "{lines:?}");
        assert!(lines.iter().any(|(f, l, p)| f == "main.md" && *l == 11 && *p == 2), "{lines:?}");
        assert!(lines.iter().any(|(f, _, _)| f == "part.md"), "{lines:?}");
        let _ = fs::remove_dir_all(data_dir);
    }

    /// A list item that wraps over several lines is marked where it starts, not where its text ends: the marker of each item is at
    /// the height of the first line of that item.
    #[test]
    fn marks_a_wrapped_list_item_at_its_top() {
        let data_dir = std::env::temp_dir().join(format!("formatex-test-list-{}", std::process::id()));
        let project = data_dir.join("documents").join("lists");
        fs::create_dir_all(&project).unwrap();
        fs::write(project.join("config.toml"), include_str!("../../engine/config.toml")).unwrap();
        let long = "word ".repeat(45);
        let items: String = (1..=3).map(|i| format!("- Item{i} start {long}end
")).collect();
        let loose: String = (1..=3).map(|i| format!("{i}. Loose{i} start {long}end

")).collect();
        fs::write(project.join("main.md"), format!("Intro paragraph.

{items}
{loose}")).unwrap();
        let engine = Engine {
            fonts: FontService::new(data_dir.join("fonts")),
            packages: Arc::new(crate::packages::system_packages(&data_dir.join("cache"))),
            components: Arc::new(ComponentLibrary::new(data_dir.join("components"))),
            worlds: Mutex::new(HashMap::new()),
            data_dir: data_dir.clone(),
        };
        let inputs: Inputs = [("markers".to_string(), "1".to_string())].into();
        let compiled = compile(&engine, "lists", "main.md", inputs, HashMap::new()).unwrap();
        let document = compiled.document.expect("compiles");
        let found = links::markers(&document);
        let page = serde_json::to_value(links::map_page(&document, &document.pages()[0])).unwrap();
        let runs = page["texts"].as_array().unwrap();
        // A text run's box starts 0.85 em above its baseline and is 1.25 em high, so its baseline is at 0.68 of its height
        let baselines: Vec<f64> = runs.iter().map(|r| r["y"].as_f64().unwrap() + 0.68 * r["h"].as_f64().unwrap()).collect();
        for marker in &found {
            if (5..=14).contains(&marker.line) {
                // A list item's marker is on the baseline of the item's first row (the middle of the row's runs lies above it)
                assert!(baselines.iter().any(|b| (b - marker.y).abs() < 1.0), "item at line {}: marker y {} is not on a baseline", marker.line, marker.y);
            } else {
                // The marker of another block is at the top of the block: never below the first row of its text
                assert!(baselines.iter().any(|b| *b >= marker.y - 1.5 && *b - marker.y < 25.0), "block at line {}: marker y {} has no text just under it", marker.line, marker.y);
            }
        }
        let _ = fs::remove_dir_all(data_dir);
    }

    /// Where a marker lies against the text runs of its row: a list item's on the baseline, a block's above its first row. The lookups in
    /// `markerLookup.ts` rely on it (a regression test there holds the numbers measured from this document).
    #[test]
    fn markers_lie_on_the_baseline_or_above_the_text() {
        let data_dir = std::env::temp_dir().join(format!("formatex-test-measure-{}", std::process::id()));
        let project = data_dir.join("documents").join("m");
        fs::create_dir_all(&project).unwrap();
        fs::write(project.join("config.toml"), include_str!("../../engine/config.toml")).unwrap();
        let list = "1. WBS چیست و با یک لیست ساده‌ی کارها چه فرقی دارد؟
2. تفاوت Activity، Summary Task و Milestone؟
3. چرا Milestone مدت ندارد؟
4. چهار نوع وابستگی را نام ببرید. کدام پرکاربردتر است؟
5. Duration و Effort چه فرقی دارند؟ مثال بزنید.
6. مسیر بحرانی چیست؟ آیا همیشه «مهم‌ترین کارها» هستند؟
7. Total Slack و Free Slack را تعریف کنید.
8. چرا ۴۴ ساعت در تنظیمات مهم است؟ اگر کسی ۵۵ ساعت کار کند، Overallocation چند درصد است؟
9. تفاوت WBS در روش Predictive و Agile؟
10. چرا در WBS این پروژه «Testing» قبل از «Pilot» می‌آید؟
";
        let other = "# عنوان اصلی

یک پاراگراف فارسی ساده.

> نقل قول فارسی

- مورد اول
  - زیرمورد الف
  - زیرمورد ب
- مورد دوم

| ستون | مقدار |
|---|---|
| سطر یک | ۱ |
| سطر دو | ۲ |

پایان.
";
        fs::write(project.join("main.md"), format!("# Title

Intro paragraph here.

{list}
{other}")).unwrap();
        let engine = Engine {
            fonts: FontService::new(data_dir.join("fonts")),
            packages: Arc::new(crate::packages::system_packages(&data_dir.join("cache"))),
            components: Arc::new(ComponentLibrary::new(data_dir.join("components"))),
            worlds: Mutex::new(HashMap::new()),
            data_dir: data_dir.clone(),
        };
        let inputs: Inputs = [("markers".to_string(), "1".to_string())].into();
        let document = compile(&engine, "m", "main.md", inputs, HashMap::new()).unwrap().document.expect("compiles");
        let found = links::markers(&document);
        let page = serde_json::to_value(links::map_page(&document, &document.pages()[0])).unwrap();
        let runs = page["texts"].as_array().unwrap();
        for marker in &found {
            println!("MARKER line {:>2} page {} x {:>7.2} y {:>7.2}", marker.line, marker.page, marker.x, marker.y);
        }
        for run in runs {
            println!("RUN y {:>7.2} h {:>5.2} x {:>7.2} w {:>7.2} {}", run["y"].as_f64().unwrap(), run["h"].as_f64().unwrap(), run["x"].as_f64().unwrap(), run["w"].as_f64().unwrap(), run["text"].as_str().unwrap().chars().take(24).collect::<String>());
        }
        let _ = fs::remove_dir_all(data_dir);
    }

    #[test]
    fn refuses_paths_that_leave_the_project() {
        assert!(check_relative("main.md").is_ok());
        assert!(check_relative("docs/a.md").is_ok());
        for bad in ["", "/etc/passwd", "../a.md", "a/../../b", "C:/x", r"a\b", "a//b"] {
            assert!(check_relative(bad).is_err(), "{bad}");
        }
    }
}

#[cfg(test)]
mod component_tests {
    use super::*;
    use std::fs;

    fn engine_in(dir: &std::path::Path) -> Engine {
        Engine {
            fonts: FontService::new(dir.join("fonts")),
            packages: Arc::new(crate::packages::system_packages(&dir.join("cache"))),
            components: Arc::new(ComponentLibrary::new(dir.join("components"))),
            worlds: Mutex::new(HashMap::new()),
            data_dir: dir.to_path_buf(),
        }
    }

    /// A user's component: its schema reaches autocomplete, its tag works in a document, a broken one is reported.
    #[test]
    fn a_user_component_reaches_the_schema_and_the_document() {
        let dir = std::env::temp_dir().join(format!("formatex-comp-{}", std::process::id()));
        let project = dir.join("documents").join("p");
        fs::create_dir_all(&project).unwrap();
        fs::write(project.join("config.toml"), include_str!("../../engine/config.toml")).unwrap();
        fs::write(project.join("main.md"), "Before <shout>loud</shout> after\n").unwrap();
        let engine = engine_in(&dir);

        // Without the component the tag is unknown to the document, and the schema has the built-in tags
        let (schema, diagnostics) = crate::components::compute_schema(&engine);
        assert!(diagnostics.iter().all(|d| !d.is_error()), "{:?}", diagnostics.iter().map(|d| d.message()).collect::<Vec<_>>());
        let schema = schema.expect("the built-in library must load");
        assert!(schema["tags"]["alert"].is_object());
        assert!(schema["tags"]["shout"].is_null());

        let source = r#"#import "/src/kit.typ": *

#let shout-tags = (
  shout: (attrs, body) => text(weight: "bold", upper(plain-text(body))),
)

#let shout-schema = (
  "shout": (
    kind: "inline",
    description: (en: "Loud text", fa: "متن بلند"),
    attrs: (:),
  ),
)
"#;
        engine.components.save("shout", source, "user").unwrap();
        let (schema, diagnostics) = crate::components::compute_schema(&engine);
        assert!(diagnostics.iter().all(|d| !d.is_error()), "{:?}", diagnostics.iter().map(|d| d.message()).collect::<Vec<_>>());
        let schema = schema.unwrap();
        assert_eq!(schema["tags"]["shout"]["description"]["en"], "Loud text");

        let compiled = compile(&engine, "p", "main.md", Inputs::new(), HashMap::new()).unwrap();
        assert!(compiled.document.is_some(), "{:?}", compiled.diagnostics.iter().map(|d| d.message()).collect::<Vec<_>>());

        // A component with a mistake: the library says where, and a document cannot use it
        engine.components.save("shout", &source.replace("upper(", "uper("), "user").unwrap();
        let (value, diagnostics) = crate::components::compute_schema(&engine);
        let _ = value;
        let _ = diagnostics;
        let broken = compile(&engine, "p", "main.md", Inputs::new(), HashMap::new()).unwrap();
        assert!(broken.document.is_none());
        assert!(broken.diagnostics.iter().any(|d| d.is_error()));
        let _ = fs::remove_dir_all(dir);
    }
}

#[cfg(test)]
mod theme_tests {
    use super::*;
    use crate::themes::UserTheme;
    use std::fs;

    /// A user's theme is as available as a built-in one: in the schema (the values of `theme`, its colors) and in a document.
    #[test]
    fn a_user_theme_reaches_the_schema_and_the_document() {
        let dir = std::env::temp_dir().join(format!("formatex-theme-{}", std::process::id()));
        let project = dir.join("documents").join("p");
        fs::create_dir_all(&project).unwrap();
        let config = include_str!("../../engine/config.toml").replace("theme = \"paper\"", "theme = \"mine\"");
        fs::write(project.join("config.toml"), config).unwrap();
        fs::write(project.join("main.md"), "# Hello

Text
").unwrap();
        let engine = Engine {
            fonts: FontService::new(dir.join("fonts")),
            packages: Arc::new(crate::packages::system_packages(&dir.join("cache"))),
            components: Arc::new(ComponentLibrary::new(dir.join("components"))),
            worlds: Mutex::new(HashMap::new()),
            data_dir: dir.clone(),
        };

        // Before the theme exists the document does not compile
        let compiled = compile(&engine, "p", "main.md", Inputs::new(), HashMap::new()).unwrap();
        assert!(compiled.document.is_none());

        let mine = UserTheme { base: "nord".into(), dark: true, colors: std::collections::BTreeMap::from([("accent".to_string(), "#ff0000".to_string())]) };
        engine.components.set_themes(std::collections::BTreeMap::from([("mine".to_string(), mine)])).unwrap();

        let (schema, diagnostics) = crate::components::compute_schema(&engine);
        assert!(diagnostics.iter().all(|d| !d.is_error()), "{:?}", diagnostics.iter().map(|d| d.message()).collect::<Vec<_>>());
        let schema = schema.unwrap();
        assert_eq!(schema["themes"]["mine"]["accent"], "#ff0000");
        assert_eq!(schema["themes"]["mine"]["bg"], schema["themes"]["nord"]["bg"], "a color left out comes from the base theme");
        assert!(schema["config"]["config"]["attrs"]["theme"]["values"].as_array().unwrap().iter().any(|v| v == "mine"));
        assert_eq!(schema["customThemes"], serde_json::json!(["mine"]));

        let compiled = compile(&engine, "p", "main.md", Inputs::new(), HashMap::new()).unwrap();
        assert!(compiled.document.is_some(), "{:?}", compiled.diagnostics.iter().map(|d| d.message()).collect::<Vec<_>>());

        // Removing the theme takes it out again
        engine.components.set_themes(Default::default()).unwrap();
        assert!(compile(&engine, "p", "main.md", Inputs::new(), HashMap::new()).unwrap().document.is_none());
        let _ = fs::remove_dir_all(dir);
    }
}

#[cfg(test)]
mod timing {
    use super::*;
    use std::fs;

    /// Where the time of one preview goes, on the starter document. Run: cargo test --release --lib timing -- --nocapture --ignored
    #[test]
    #[ignore]
    fn where_the_time_goes() {
        let data_dir = std::env::temp_dir().join(format!("formatex-time-{}", std::process::id()));
        let project = data_dir.join("documents").join("t");
        fs::create_dir_all(&project).unwrap();
        fs::write(project.join("config.toml"), include_str!("../../engine/config.toml")).unwrap();
        let base = include_str!("../../templates/main.md");
        fs::write(project.join("main.md"), base).unwrap();
        let engine = Engine {
            fonts: FontService::new(data_dir.join("fonts")),
            packages: Arc::new(crate::packages::system_packages(&data_dir.join("cache"))),
            components: Arc::new(ComponentLibrary::new(data_dir.join("components"))),
            worlds: Mutex::new(HashMap::new()),
            data_dir: data_dir.clone(),
        };
        let t = Instant::now();
        engine.fonts.get();
        eprintln!("fonts scan: {:?}", t.elapsed());
        let t = Instant::now();
        compile(&engine, "t", "main.md", Inputs::new(), HashMap::new()).unwrap();
        eprintln!("first compile (cold): {:?}", t.elapsed());
        for i in 0..5 {
            let text = format!("{base}\nline {i}\n");
            let t = Instant::now();
            let compiled = compile(&engine, "t", "main.md", Inputs::new(), HashMap::from([("main.md".to_string(), text)])).unwrap();
            let compile_time = t.elapsed();
            let document = compiled.document.unwrap();
            let t = Instant::now();
            let svgs: Vec<String> = document.pages().iter().map(|p| typst_svg::svg(p, &SvgOptions::default())).collect();
            let svg_time = t.elapsed();
            eprintln!("edit {i}: compile {compile_time:?}, svg {svg_time:?} ({} KB, {} pages)", svgs.iter().map(|s| s.len()).sum::<usize>() / 1024, svgs.len());
        }
        let _ = fs::remove_dir_all(data_dir);
    }
}

#[cfg(test)]
mod located_tests {
    use super::located;

    #[test]
    fn reads_the_place_of_a_problem_found_in_the_text() {
        let found = located("assertion failed: @chapters/intro.md:12 <alert> type must be one of tip, got \"x\"");
        assert_eq!(found, Some(("chapters/intro.md".into(), 12, "assertion failed: <alert> type must be one of tip, got \"x\"".into())));
    }

    #[test]
    fn leaves_other_messages_alone() {
        assert_eq!(located("assertion failed: Unknown color \"x\" for user@example.com:3 foo"), None);
        assert_eq!(located("unknown variable: x"), None);
        assert_eq!(located("@main.md:0 zero is not a line"), None);
    }
}

#[cfg(test)]
mod label_tests {
    use super::*;

    fn problem(message: &str, path: Option<&str>) -> Diagnostic {
        Diagnostic { severity: "error", message: message.into(), path: path.map(Into::into), line: path.map(|_| 3), column: None, hints: vec![] }
    }

    #[test]
    fn drops_the_plain_message_when_the_placed_one_says_the_same() {
        let mut all = vec![problem("assertion failed: no element with id \"x\"", Some("main.md")), problem("label `<x>` does not exist in the document", None), problem("label `<y>` does not exist in the document", None)];
        all.push(problem("assertion failed: id \"z\" is defined 2 times", Some("main.md")));
        all.push(problem("label `<z>` occurs multiple times in the document", None));
        drop_unplaced_labels(&mut all);
        assert_eq!(all.len(), 3);
        assert!(all[1].message.contains("<y>"));
    }
}
