//! The component library: the engine's built-in components plus the user's own, and the registry generated from them.
//!
//! A **component** is one Typst file, `components/<name>.typ`, that exports `<name>-tags` (the tags and their code),
//! `<name>-schema` (their description: attributes, values, docs; what autocomplete reads) and optionally `<name>-rules` and
//! `<name>-scope`. The engine imports every component through `components/_registry.typ`, which this module **generates** (the
//! port of the engine's `tools/gen-registry.mjs`) from the built-in components and the user's, so a new component works without
//! anyone running a script. Users add components in `<app data>/components/<name>.typ`; a file with a built-in's name replaces
//! it (the built-in stays available to revert to). `manifest.json` there records which components are disabled and where each
//! came from (`user` today; `store` when components can be downloaded).

use std::borrow::Cow;
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, RwLock};

use regex::Regex;
use serde::{Deserialize, Serialize};
use tauri::State;
use typst::foundations::Label;
use typst::introspection::{Introspector, MetadataElem};
use typst::utils::PicoStr;
use typst_layout::PagedDocument;

use crate::compile::{Diagnostic, Engine, convert};
use crate::engine;
use crate::themes::{self, UserTheme};
use crate::world::ProjectWorld;

const DEFAULT_CONFIG: &str = include_str!("../../engine/config.toml");

#[derive(Default, Serialize, Deserialize)]
struct Manifest {
    #[serde(default)]
    disabled: BTreeSet<String>,
    /// Where a component came from: "user" or "store". Built-ins are not listed.
    #[serde(default)]
    origins: BTreeMap<String, String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentInfo {
    pub name: String,
    /// "builtin", "user" or "store"
    pub origin: String,
    /// A built-in that the user replaced with their own version.
    pub modified: bool,
    pub enabled: bool,
    pub tags: Vec<String>,
    /// Why the component is left out of the registry (missing `-tags`, a tag declared twice, ...).
    pub problem: Option<String>,
}

#[derive(Default)]
struct LibState {
    user: BTreeMap<String, String>,
    registry: String,
    /// `src/themes.typ` as the engine sees it: the built-in themes and the user's.
    themes_typ: String,
    infos: Vec<ComponentInfo>,
}

pub struct ComponentLibrary {
    dir: PathBuf,
    /// The user's themes (`<app data>/themes.json`, next to the components folder).
    themes_path: PathBuf,
    themes: RwLock<BTreeMap<String, UserTheme>>,
    state: RwLock<LibState>,
    schema: Mutex<Option<Arc<serde_json::Value>>>,
    /// Checks compile the whole registry: one at a time.
    check: Mutex<()>,
    /// Grows with every reload: a kept world built on an older library is rebuilt.
    generation: AtomicU64,
}

// ----- reading a component's source -----

struct Parsed {
    has_tags: bool,
    rules: bool,
    scope: bool,
    schema: bool,
    order: i32,
    tags: Vec<String>,
}

/// What a component file declares, found the way the engine's generator does: by its `#let <name>-...` lines.
fn parse(name: &str, text: &str) -> Parsed {
    let esc = regex::escape(name);
    let has = |suffix: &str| Regex::new(&format!(r"(?m)^#let\s+{esc}-{suffix}")).unwrap().is_match(text);
    let order = Regex::new(r"(?m)^//\s*rules-order:\s*(-?\d+)")
        .unwrap()
        .captures(text)
        .and_then(|c| c[1].parse().ok())
        .unwrap_or(100);

    // The tag names: keys at the indentation of the first key, between `#let <name>-tags = (` and the `)` in column 0
    let mut tags = Vec::new();
    let start = Regex::new(&format!(r"^#let\s+{esc}-tags\s*=")).unwrap();
    let key = Regex::new(r#"^(\s+)"?([A-Za-z][\w-]*)"?\s*:\s*\S"#).unwrap();
    let lines: Vec<&str> = text.lines().collect();
    if let Some(index) = lines.iter().position(|line| start.is_match(line)) {
        let empty = lines[index].trim_end().ends_with("(:)");
        let mut indent: Option<usize> = None;
        for line in lines.iter().skip(index + 1) {
            if empty || line.starts_with(')') {
                break;
            }
            if let Some(found) = key.captures(line) {
                let width = found[1].len();
                if *indent.get_or_insert(width) == width {
                    tags.push(found[2].to_string());
                }
            }
        }
    }

    Parsed {
        has_tags: has("tags\\s*="),
        rules: has("rules\\b"),
        scope: has("scope\\b"),
        schema: has("schema\\s*="),
        order,
        tags,
    }
}

/// A component name: lowercase letters, digits and `-`, starting with a letter. Not `_registry`.
pub fn valid_name(name: &str) -> bool {
    Regex::new(r"^[a-z][a-z0-9-]{0,39}$").unwrap().is_match(name)
}

struct Entry {
    name: String,
    parsed: Parsed,
}

/// The text of `components/_registry.typ` for the components given, and the problems that left some of them out.
fn generate_registry(entries: &[Entry]) -> String {
    let mut out = String::from("// GENERATED by the Formatex app from the components. Do not edit.\n");
    for entry in entries {
        let mut names = vec![format!("{}-tags", entry.name)];
        if entry.parsed.rules {
            names.push(format!("{}-rules", entry.name));
        }
        if entry.parsed.scope {
            names.push(format!("{}-scope", entry.name));
        }
        if entry.parsed.schema {
            names.push(format!("{}-schema", entry.name));
        }
        out += &format!("#import \"/components/{}.typ\": {}\n", entry.name, names.join(", "));
    }
    out += "#import \"/src/lib/schema.typ\": wrap-tags\n\n";
    let join = |parts: Vec<String>| std::iter::once("(:)".to_string()).chain(parts).collect::<Vec<_>>().join(" + ");
    out += &format!("#let raw-tags = {}\n", join(entries.iter().map(|e| format!("{}-tags", e.name)).collect()));
    out += &format!("#let all-schemas = {}\n", join(entries.iter().filter(|e| e.parsed.schema).map(|e| format!("{}-schema", e.name)).collect()));
    out += "#let html-tags = wrap-tags(raw-tags, all-schemas)\n";
    out += &format!("#let scope-extras = {}\n\n", join(entries.iter().filter(|e| e.parsed.scope).map(|e| format!("{}-scope", e.name)).collect()));
    out += "#let all-rules(doc) = {\n";
    let mut ruled: Vec<&Entry> = entries.iter().filter(|e| e.parsed.rules).collect();
    ruled.sort_by(|a, b| (a.parsed.order, &a.name).cmp(&(b.parsed.order, &b.name)));
    for entry in ruled {
        out += &format!("  show: {}-rules\n", entry.name);
    }
    out += "  doc\n}\n";
    out
}

impl ComponentLibrary {
    pub fn new(dir: PathBuf) -> Self {
        let themes_path = dir.parent().unwrap_or(&dir).join("themes.json");
        let stored: BTreeMap<String, UserTheme> = fs::read_to_string(&themes_path).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_default();
        let library = Self {
            dir,
            themes_path,
            themes: RwLock::new(themes::sanitize(stored, &themes::builtin_names(&builtin_themes()))),
            state: RwLock::default(),
            schema: Mutex::new(None),
            check: Mutex::new(()),
            generation: AtomicU64::new(0),
        };
        library.reload();
        library
    }

    fn manifest_path(&self) -> PathBuf {
        self.dir.join("manifest.json")
    }

    /// Reads the user's components and the manifest from disk and regenerates the registry. Forgets the cached schema.
    pub fn reload(&self) {
        let mut user = BTreeMap::new();
        if let Ok(read) = fs::read_dir(&self.dir) {
            for item in read.flatten() {
                let path = item.path();
                let name = path.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
                if path.extension().is_some_and(|e| e == "typ") && valid_name(&name) {
                    if let Ok(text) = fs::read_to_string(&path) {
                        user.insert(name, text);
                    }
                }
            }
        }
        let manifest: Manifest = fs::read_to_string(self.manifest_path()).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_default();

        let builtin: BTreeMap<String, &str> = engine::builtin_components().into_iter().collect();
        let names: BTreeSet<&String> = builtin.keys().chain(user.keys()).collect();

        let mut infos = Vec::new();
        let mut included = Vec::new();
        let mut declared: HashMap<String, String> = HashMap::new();
        for name in names {
            let source: &str = user.get(name).map(String::as_str).or_else(|| builtin.get(name).copied()).unwrap_or("");
            let parsed = parse(name, source);
            let enabled = !manifest.disabled.contains(name);
            let mut problem = None;
            if !parsed.has_tags {
                problem = Some(format!("it must define `#let {name}-tags = (...)`"));
            } else if !parsed.tags.is_empty() && !parsed.schema {
                problem = Some(format!("it declares tags but has no `#let {name}-schema = (...)`"));
            } else if enabled {
                if let Some(clash) = parsed.tags.iter().find_map(|tag| declared.get(tag).map(|other| (tag, other))) {
                    problem = Some(format!("the tag <{}> is already declared by `{}`", clash.0, clash.1));
                }
            }
            let origin = if builtin.contains_key(name) {
                "builtin".to_string()
            } else {
                manifest.origins.get(name).cloned().unwrap_or_else(|| "user".to_string())
            };
            infos.push(ComponentInfo {
                name: name.clone(),
                origin,
                modified: builtin.contains_key(name) && user.contains_key(name),
                enabled,
                tags: parsed.tags.clone(),
                problem: problem.clone(),
            });
            if enabled && problem.is_none() {
                for tag in &parsed.tags {
                    declared.insert(tag.clone(), name.clone());
                }
                included.push(Entry { name: name.clone(), parsed });
            }
        }

        let registry = generate_registry(&included);
        let themes_typ = themes::generate(&builtin_themes(), &self.themes.read().unwrap());
        *self.state.write().unwrap() = LibState { user, registry, themes_typ, infos };
        *self.schema.lock().unwrap() = None;
        self.generation.fetch_add(1, Ordering::SeqCst);
    }

    /// The bytes of the engine's `src/themes.typ`, with the user's themes added.
    pub fn themes_source(&self) -> Vec<u8> {
        self.state.read().unwrap().themes_typ.clone().into_bytes()
    }

    pub fn custom_themes(&self) -> Vec<String> {
        self.themes.read().unwrap().keys().cloned().collect()
    }

    /// Replaces the user's themes: they are kept in `themes.json`, and the engine sees them from the next compilation.
    pub fn set_themes(&self, themes: BTreeMap<String, UserTheme>) -> Result<(), String> {
        let clean = themes::sanitize(themes, &themes::builtin_names(&builtin_themes()));
        if let Some(parent) = self.themes_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(&self.themes_path, serde_json::to_string_pretty(&clean).unwrap()).map_err(|e| e.to_string())?;
        *self.themes.write().unwrap() = clean;
        self.reload();
        Ok(())
    }

    pub fn generation(&self) -> u64 {
        self.generation.load(Ordering::SeqCst)
    }

    /// The bytes of a `components/...` path of the engine: the generated registry, a user's component, or the built-in one.
    pub fn source_for(&self, path: &str) -> Option<Cow<'static, [u8]>> {
        let file = path.strip_prefix("components/")?;
        let state = self.state.read().unwrap();
        if file == "_registry.typ" {
            return Some(Cow::Owned(state.registry.clone().into_bytes()));
        }
        let name = file.strip_suffix(".typ")?;
        match state.user.get(name) {
            Some(text) => Some(Cow::Owned(text.clone().into_bytes())),
            None => engine::file(path).map(Cow::Borrowed),
        }
    }

    pub fn list(&self) -> Vec<ComponentInfo> {
        self.state.read().unwrap().infos.clone()
    }

    pub fn source(&self, name: &str) -> Option<String> {
        let state = self.state.read().unwrap();
        state.user.get(name).cloned().or_else(|| builtin_source(name))
    }

    fn write_manifest(&self, edit: impl FnOnce(&mut Manifest)) -> Result<(), String> {
        let mut manifest: Manifest = fs::read_to_string(self.manifest_path()).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_default();
        edit(&mut manifest);
        fs::create_dir_all(&self.dir).map_err(|e| e.to_string())?;
        fs::write(self.manifest_path(), serde_json::to_string_pretty(&manifest).unwrap()).map_err(|e| e.to_string())
    }

    pub fn save(&self, name: &str, source: &str, origin: &str) -> Result<(), String> {
        if !valid_name(name) {
            return Err(format!("invalid component name {name:?}: use lowercase letters, digits and -"));
        }
        fs::create_dir_all(&self.dir).map_err(|e| e.to_string())?;
        fs::write(self.dir.join(format!("{name}.typ")), source).map_err(|e| e.to_string())?;
        if builtin_source(name).is_none() {
            self.write_manifest(|m| {
                m.origins.insert(name.to_string(), origin.to_string());
            })?;
        }
        self.reload();
        Ok(())
    }

    /// Deletes a user's component, or the user's version of a built-in (which brings the built-in back).
    pub fn delete(&self, name: &str) -> Result<(), String> {
        if !valid_name(name) {
            return Err(format!("invalid component name {name:?}"));
        }
        let path = self.dir.join(format!("{name}.typ"));
        if path.exists() {
            fs::remove_file(path).map_err(|e| e.to_string())?;
        }
        self.write_manifest(|m| {
            m.origins.remove(name);
            m.disabled.remove(name);
        })?;
        self.reload();
        Ok(())
    }

    pub fn set_enabled(&self, name: &str, enabled: bool) -> Result<(), String> {
        self.write_manifest(|m| {
            if enabled {
                m.disabled.remove(name);
            } else {
                m.disabled.insert(name.to_string());
            }
        })?;
        self.reload();
        Ok(())
    }
}

/// The engine's own `src/themes.typ`.
fn builtin_themes() -> String {
    engine::file("src/themes.typ").map(|bytes| String::from_utf8_lossy(bytes).into_owned()).unwrap_or_default()
}

fn builtin_source(name: &str) -> Option<String> {
    engine::builtin_components().into_iter().find(|(n, _)| n == name).map(|(_, text)| text.to_string())
}

// ----- the schema: compile the engine's `tools/schema.typ` and read what it exposes -----

/// Compiles `tools/schema.typ` (which imports the registry, hence every component) and returns its `<schemas>` metadata as
/// JSON. This both **validates** the library (a component that does not load shows up as a diagnostic) and gives autocomplete
/// the schema of every tag, the user's included.
pub fn compute_schema(engine: &Engine) -> (Option<serde_json::Value>, Vec<Diagnostic>) {
    let _guard = engine.components.check.lock().unwrap();
    let extra: HashMap<String, Vec<u8>> = HashMap::from([
        ("config.toml".to_string(), DEFAULT_CONFIG.as_bytes().to_vec()),
        ("main.md".to_string(), b"# probe\n".to_vec()),
    ]);
    let inputs = HashMap::from([("source".to_string(), "main.md".to_string())]);
    let world = ProjectWorld::new(None, engine::SCHEMA_ENTRY, engine.packages.clone(), engine.fonts.get(), engine.components.clone(), &inputs, extra);

    let warned = typst::compile::<PagedDocument>(&world);
    let mut diagnostics: Vec<Diagnostic> = warned.warnings.iter().map(|d| convert(&world, d)).collect();
    let document = match warned.output {
        Ok(document) => document,
        Err(errors) => {
            diagnostics.extend(errors.iter().map(|d| convert(&world, d)));
            typst::comemo::evict(10);
            return (None, diagnostics);
        }
    };
    typst::comemo::evict(10);
    let mut value = Label::new(PicoStr::intern("schemas"))
        .and_then(|label| document.introspector().query_label(label).ok())
        .and_then(|content| content.to_packed::<MetadataElem>())
        .and_then(|metadata| serde_json::to_value(&metadata.value).ok());
    // Which of the themes are the user's (the others ship with the engine)
    if let Some(object) = value.as_mut().and_then(|v| v.as_object_mut()) {
        object.insert("customThemes".into(), serde_json::json!(engine.components.custom_themes()));
    }
    (value, diagnostics)
}

/// The schema, cached until the library changes.
fn schema(engine: &Engine) -> Result<Arc<serde_json::Value>, String> {
    if let Some(cached) = engine.components.schema.lock().unwrap().as_ref() {
        return Ok(cached.clone());
    }
    let (value, diagnostics) = compute_schema(engine);
    match value {
        Some(value) => {
            let value = Arc::new(value);
            *engine.components.schema.lock().unwrap() = Some(value.clone());
            Ok(value)
        }
        None => Err(diagnostics.iter().find(|d| d.is_error()).map(|d| d.message().to_string()).unwrap_or_else(|| "the schema could not be read".into())),
    }
}

// ----- commands -----

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceOutput {
    /// The text in use (the user's version when there is one).
    source: String,
    /// The built-in version, when the component is a built-in.
    builtin: Option<String>,
}

#[derive(Serialize)]
pub struct CheckOutput {
    /// Whether the whole library loads.
    ok: bool,
    diagnostics: Vec<Diagnostic>,
}

/// After a change: compile the registry, keep the schema when it works, say what is wrong when it does not.
fn check(engine: &Engine) -> CheckOutput {
    let (value, diagnostics) = compute_schema(engine);
    let ok = value.is_some();
    if let Some(value) = value {
        *engine.components.schema.lock().unwrap() = Some(Arc::new(value));
    }
    CheckOutput { ok, diagnostics }
}

#[tauri::command]
pub fn components_list(engine: State<'_, Arc<Engine>>) -> Vec<ComponentInfo> {
    engine.components.list()
}

#[tauri::command]
pub fn component_source(engine: State<'_, Arc<Engine>>, name: String) -> Result<SourceOutput, String> {
    let source = engine.components.source(&name).ok_or_else(|| format!("no component {name:?}"))?;
    Ok(SourceOutput { source, builtin: builtin_source(&name) })
}

#[tauri::command]
pub async fn component_save(engine: State<'_, Arc<Engine>>, name: String, source: String, origin: Option<String>) -> Result<CheckOutput, String> {
    let engine = engine.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        engine.components.save(&name, &source, origin.as_deref().unwrap_or("user"))?;
        Ok(check(&engine))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn component_delete(engine: State<'_, Arc<Engine>>, name: String) -> Result<CheckOutput, String> {
    let engine = engine.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        engine.components.delete(&name)?;
        Ok(check(&engine))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn component_set_enabled(engine: State<'_, Arc<Engine>>, name: String, enabled: bool) -> Result<CheckOutput, String> {
    let engine = engine.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        engine.components.set_enabled(&name, enabled)?;
        Ok(check(&engine))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Sets the user's themes (from the app settings): they appear in the engine, in `theme = "..."` and in the schema.
#[tauri::command]
pub async fn themes_set(engine: State<'_, Arc<Engine>>, themes: BTreeMap<String, UserTheme>) -> Result<CheckOutput, String> {
    let engine = engine.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        engine.components.set_themes(themes)?;
        Ok(check(&engine))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// The schema of every enabled tag, built-in and the user's.
#[tauri::command]
pub async fn engine_schema(engine: State<'_, Arc<Engine>>) -> Result<serde_json::Value, String> {
    let engine = engine.inner().clone();
    tauri::async_runtime::spawn_blocking(move || schema(&engine).map(|value| (*value).clone())).await.map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_what_a_component_declares() {
        let text = "#let demo-tags = (\n    a: (attrs, body) => body,\n    \"b-c\": (attrs, body) => body,\n)\n#let demo-schema = (:)\n// rules-order: 5\n#let demo-rules(doc) = doc\n";
        let parsed = parse("demo", text);
        assert!(parsed.has_tags && parsed.schema && parsed.rules && !parsed.scope);
        assert_eq!(parsed.tags, ["a", "b-c"]);
        assert_eq!(parsed.order, 5);
        assert!(parse("empty", "#let empty-tags = (:)\n").tags.is_empty());
    }

    #[test]
    fn generates_the_registry_like_the_engine_script() {
        let entries = vec![
            Entry { name: "alert".into(), parsed: parse("alert", "#let alert-tags = (\n  alert: 1,\n)\n#let alert-schema = (:)\n") },
            Entry { name: "lists".into(), parsed: parse("lists", "#let lists-tags = (:)\n#let lists-rules(doc) = doc\n#let lists-scope = (:)\n") },
        ];
        let registry = generate_registry(&entries);
        assert!(registry.contains("#import \"/components/alert.typ\": alert-tags, alert-schema\n"));
        assert!(registry.contains("#import \"/components/lists.typ\": lists-tags, lists-rules, lists-scope\n"));
        assert!(registry.contains("#let raw-tags = (:) + alert-tags + lists-tags\n"));
        assert!(registry.contains("#let all-schemas = (:) + alert-schema\n"));
        assert!(registry.contains("  show: lists-rules\n  doc\n}"));
    }

    #[test]
    fn the_built_in_registry_matches_the_engines_own() {
        let dir = std::env::temp_dir().join(format!("formatex-lib-{}", std::process::id()));
        let library = ComponentLibrary::new(dir.clone());
        let generated = String::from_utf8(library.source_for("components/_registry.typ").unwrap().into_owned()).unwrap();
        let engine_own = String::from_utf8(engine::file("components/_registry.typ").unwrap().to_vec()).unwrap();
        // Same imports and the same sums, apart from the header comment
        let body = |text: &str| text.lines().skip(1).collect::<Vec<_>>().join("\n");
        assert_eq!(body(&generated), body(&engine_own));
        assert!(library.list().iter().all(|c| c.problem.is_none()), "{:?}", library.list().iter().filter_map(|c| c.problem.clone()).collect::<Vec<_>>());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn a_user_component_joins_the_registry_and_a_broken_one_is_left_out() {
        let dir = std::env::temp_dir().join(format!("formatex-lib2-{}", std::process::id()));
        let library = ComponentLibrary::new(dir.clone());
        library.save("hello", "#let hello-tags = (\n  hello: (attrs, body) => body,\n)\n#let hello-schema = (:)\n", "user").unwrap();
        let registry = String::from_utf8(library.source_for("components/_registry.typ").unwrap().into_owned()).unwrap();
        assert!(registry.contains("/components/hello.typ"));

        library.save("broken", "// no tags here\n", "user").unwrap();
        let info = library.list();
        assert!(info.iter().find(|c| c.name == "broken").unwrap().problem.is_some());
        assert!(!String::from_utf8(library.source_for("components/_registry.typ").unwrap().into_owned()).unwrap().contains("broken.typ"));

        // A tag declared by two components: the second is left out
        library.save("twin", "#let twin-tags = (\n  hello: (attrs, body) => body,\n)\n#let twin-schema = (:)\n", "user").unwrap();
        assert!(library.list().iter().find(|c| c.name == "twin").unwrap().problem.as_deref().unwrap().contains("<hello>"));

        library.set_enabled("hello", false).unwrap();
        assert!(!library.list().iter().find(|c| c.name == "hello").unwrap().enabled);
        library.delete("hello").unwrap();
        assert!(library.source("hello").is_none());
        assert!(library.save("../x", "", "user").is_err());
        let _ = fs::remove_dir_all(dir);
    }
}
