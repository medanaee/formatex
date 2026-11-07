//! The system clipboard for the file tree's Paste item: files and folders copied in the file manager, and a picture.
//!
//! The browser only gives these to a real paste event (Ctrl + V), never to a menu item, so the native side reads them. Files are copied
//! here, in Rust, from where they are into the project folder: nothing but their names crosses to the page.

use std::path::{Path, PathBuf};
use std::sync::Arc;

use tauri::ipc::Response;
use tauri::State;

use crate::compile::{check_relative, project_dir, Engine};

/// Most files one paste brings in, as for a drop.
const MAX_FILES: usize = 5000;
/// Not part of a document, as for a drop.
const SKIPPED: [&str; 5] = [".git", "node_modules", ".DS_Store", "Thumbs.db", "__MACOSX"];
/// The engine's own names at the top of a Formatex project (mirrors `RESERVED_ROOTS` in the page).
const RESERVED_ROOTS: [&str; 5] = ["main.typ", "code-dark.tmTheme", "src", "components", "tools"];

/// `name`, or `name 2`, `name 3` (before the extension) until nothing in `taken` or in `dir` has it.
fn unique_name(name: &str, dir: &Path, taken: &[String]) -> String {
    let free = |candidate: &str| !dir.join(candidate).exists() && !taken.iter().any(|t| t == candidate);
    if free(name) {
        return name.to_string();
    }
    let (stem, ext) = match name.rfind('.') {
        Some(dot) if dot > 0 => (&name[..dot], &name[dot..]),
        _ => (name, ""),
    };
    (2..).map(|n| format!("{stem} {n}{ext}")).find(|candidate| free(candidate)).expect("an endless range")
}

/// Copies a file, or a folder with what is in it (symbolic links are not followed), counting the files into `count`.
fn copy_tree(from: &Path, to: &Path, count: &mut usize) -> std::io::Result<()> {
    let meta = std::fs::symlink_metadata(from)?;
    if meta.file_type().is_symlink() {
        return Ok(());
    }
    if meta.is_dir() {
        std::fs::create_dir_all(to)?;
        for entry in std::fs::read_dir(from)? {
            let entry = entry?;
            if SKIPPED.contains(&entry.file_name().to_string_lossy().as_ref()) {
                continue;
            }
            copy_tree(&entry.path(), &to.join(entry.file_name()), count)?;
        }
    } else if meta.is_file() {
        if *count >= MAX_FILES {
            return Ok(());
        }
        std::fs::copy(from, to)?;
        *count += 1;
    }
    Ok(())
}

/// Copies `sources` into `target` (a folder of the project, `""` for its root) and returns the new top-level paths relative to the project.
pub fn copy_into(project: &Path, target: &str, sources: &[PathBuf], reserve_roots: bool) -> Result<Vec<String>, String> {
    if !target.is_empty() {
        check_relative(target)?;
    }
    let dir = if target.is_empty() { project.to_path_buf() } else { project.join(target) };
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let mut taken: Vec<String> = if reserve_roots && target.is_empty() { RESERVED_ROOTS.iter().map(|name| name.to_string()).collect() } else { Vec::new() };
    let mut added = Vec::new();
    let mut count = 0;
    for source in sources {
        let Some(name) = source.file_name().map(|name| name.to_string_lossy().to_string()) else { continue };
        if SKIPPED.contains(&name.as_str()) || !source.exists() {
            continue;
        }
        let name = unique_name(&name, &dir, &taken);
        copy_tree(source, &dir.join(&name), &mut count).map_err(|error| format!("could not copy {}: {error}", source.display()))?;
        added.push(if target.is_empty() { name.clone() } else { format!("{target}/{name}") });
        taken.push(name);
    }
    Ok(added)
}

/// A clipboard path as a file system path: some systems give `file://` addresses.
#[cfg(desktop)]
fn clipboard_path(raw: &str) -> PathBuf {
    let text = raw.strip_prefix("file://").unwrap_or(raw);
    // `/C:/Users/me` is `C:/Users/me` on Windows
    match text.as_bytes() {
        [b'/', drive, b':', ..] if drive.is_ascii_alphabetic() => PathBuf::from(&text[1..]),
        _ => PathBuf::from(text),
    }
}

/// Files and folders copied in the file manager are added to `target` in the project; returns their new paths (empty: none on the clipboard).
#[cfg(desktop)]
#[tauri::command]
pub async fn clipboard_import(engine: State<'_, Arc<Engine>>, project_id: String, target: String, reserve_roots: bool) -> Result<Vec<String>, String> {
    use clipboard_rs::{Clipboard, ClipboardContext, ContentFormat};
    let project = project_dir(&engine, &project_id)?;
    tauri::async_runtime::spawn_blocking(move || {
        let context = ClipboardContext::new().map_err(|error| error.to_string())?;
        if !context.has(ContentFormat::Files) {
            return Ok(Vec::new());
        }
        let sources: Vec<PathBuf> = context.get_files().map_err(|error| error.to_string())?.iter().map(|raw| clipboard_path(raw)).collect();
        copy_into(&project, &target, &sources, reserve_roots)
    })
    .await
    .map_err(|error| error.to_string())?
}

/// The picture on the clipboard as a PNG (empty: there is none).
#[cfg(desktop)]
#[tauri::command]
pub async fn clipboard_image() -> Result<Response, String> {
    use clipboard_rs::common::RustImage;
    use clipboard_rs::{Clipboard, ClipboardContext, ContentFormat};
    tauri::async_runtime::spawn_blocking(move || {
        let context = ClipboardContext::new().map_err(|error| error.to_string())?;
        if !context.has(ContentFormat::Image) {
            return Ok(Response::new(Vec::<u8>::new()));
        }
        let image = context.get_image().map_err(|error| error.to_string())?;
        let png = image.to_png().map_err(|error| error.to_string())?;
        Ok(Response::new(png.get_bytes().to_vec()))
    })
    .await
    .map_err(|error| error.to_string())?
}

/// Android has no file manager clipboard to read: the page falls back to what the browser gives it.
#[cfg(not(desktop))]
#[tauri::command]
pub async fn clipboard_import(_engine: State<'_, Arc<Engine>>, _project_id: String, _target: String, _reserve_roots: bool) -> Result<Vec<String>, String> {
    Ok(Vec::new())
}

#[cfg(not(desktop))]
#[tauri::command]
pub async fn clipboard_image() -> Result<Response, String> {
    Ok(Response::new(Vec::<u8>::new()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn copies_files_and_folders_with_new_names_and_skips_what_is_not_a_document() {
        let base = std::env::temp_dir().join(format!("formatex-clip-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&base);
        let project = base.join("project");
        let from = base.join("from");
        std::fs::create_dir_all(project.join("docs")).unwrap();
        std::fs::create_dir_all(from.join("pack").join("sub")).unwrap();
        std::fs::create_dir_all(from.join("pack").join(".git")).unwrap();
        std::fs::write(from.join("notes.md"), "n").unwrap();
        std::fs::write(from.join("src"), "x").unwrap();
        std::fs::write(from.join("pack").join("sub").join("a.py"), "a").unwrap();
        std::fs::write(from.join("pack").join(".git").join("config"), "g").unwrap();
        std::fs::write(project.join("docs").join("notes.md"), "old").unwrap();

        // Into a folder: a name that is there gets a number; the folder comes with its content, but not `.git`
        let sources = [from.join("notes.md"), from.join("pack")];
        let added = copy_into(&project, "docs", &sources, true).unwrap();
        assert_eq!(added, vec!["docs/notes 2.md", "docs/pack"]);
        assert_eq!(std::fs::read_to_string(project.join("docs").join("notes.md")).unwrap(), "old");
        assert_eq!(std::fs::read_to_string(project.join("docs").join("notes 2.md")).unwrap(), "n");
        assert!(project.join("docs").join("pack").join("sub").join("a.py").is_file());
        assert!(!project.join("docs").join("pack").join(".git").exists());
        // At the root of a Formatex project the engine's names are not taken
        let added = copy_into(&project, "", &[from.join("src")], true).unwrap();
        assert_eq!(added, vec!["src 2"]);
        // A second copy of the same name in one paste, and a target that leaves the project
        let twice = copy_into(&project, "docs", &[from.join("notes.md"), from.join("notes.md")], false).unwrap();
        assert_eq!(twice, vec!["docs/notes 3.md", "docs/notes 4.md"]);
        assert!(copy_into(&project, "../out", &sources, false).is_err());
        let _ = std::fs::remove_dir_all(&base);
    }
}
