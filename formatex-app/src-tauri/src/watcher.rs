//! Watching a project that lives in a folder of the user's: the folder can be changed from outside the app (an editor, git, a sync
//! tool), and the app shows it without being closed and opened again.
//!
//! One watcher per open project. Its events are gathered for a moment (a save is often several events), then sent to the window as
//! one `project-changed` event with the project-relative paths that changed and whether the set of files changed (a file or folder
//! was created, removed or renamed). The app's own writes come back as events too; the window tells them apart by comparing the text.

use std::collections::{BTreeSet, HashMap};
use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::{LazyLock, Mutex};
use std::time::Duration;

use notify::event::{EventKind, ModifyKind};
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::compile::project_root;

/// Folders at the top of a project that are never watched or reported: their churn is not part of any document.
const IGNORED: [&str; 2] = [".git", "node_modules"];

/// How long events are gathered before they are sent.
const QUIET: Duration = Duration::from_millis(200);

static WATCHERS: LazyLock<Mutex<HashMap<String, RecommendedWatcher>>> = LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Changed {
    project_id: String,
    /// Project-relative paths with `/`, sorted.
    paths: Vec<String>,
    /// A file or folder appeared, went away or was renamed: the list of files has to be read again.
    structural: bool,
}

/// The project-relative path of `path` (with `/`), or `None` for the root itself and for what is ignored.
fn relative(root: &Path, path: &Path) -> Option<String> {
    let inside = path.strip_prefix(root).ok()?;
    let parts: Vec<String> = inside.components().map(|part| part.as_os_str().to_string_lossy().into_owned()).collect();
    let first = parts.first()?;
    if IGNORED.contains(&first.as_str()) {
        return None;
    }
    Some(parts.join("/"))
}

fn is_structural(kind: &EventKind) -> bool {
    matches!(kind, EventKind::Create(_) | EventKind::Remove(_) | EventKind::Modify(ModifyKind::Name(_)))
}

/// Starts watching the folder of a project (`project_set_root` has registered it). Watching it again replaces the watcher.
#[tauri::command]
pub fn project_watch(app: AppHandle, project_id: String) -> Result<(), String> {
    let root: PathBuf = project_root(&project_id).ok_or_else(|| format!("{project_id} is not kept in a folder"))?;
    let (sender, receiver) = mpsc::channel::<(Vec<String>, bool)>();

    let watched = root.clone();
    let mut watcher = RecommendedWatcher::new(
        move |event: notify::Result<notify::Event>| {
            let Ok(event) = event else { return };
            // Reading a file is an event too, and not a change
            if matches!(event.kind, EventKind::Access(_) | EventKind::Other) {
                return;
            }
            let paths: Vec<String> = event.paths.iter().filter_map(|path| relative(&watched, path)).collect();
            if !paths.is_empty() {
                let _ = sender.send((paths, is_structural(&event.kind)));
            }
        },
        Config::default(),
    )
    .map_err(|error| error.to_string())?;
    watcher.watch(&root, RecursiveMode::Recursive).map_err(|error| error.to_string())?;

    // Gathers the events of a moment into one message; it ends when the watcher (and with it the sender) is dropped
    let id = project_id.clone();
    std::thread::spawn(move || {
        while let Ok((first, structural)) = receiver.recv() {
            let mut paths: BTreeSet<String> = first.into_iter().collect();
            let mut structural = structural;
            loop {
                match receiver.recv_timeout(QUIET) {
                    Ok((more, also)) => {
                        paths.extend(more);
                        structural |= also;
                    }
                    Err(RecvTimeoutError::Timeout) => break,
                    Err(RecvTimeoutError::Disconnected) => return,
                }
            }
            let _ = app.emit("project-changed", Changed { project_id: id.clone(), paths: paths.into_iter().collect(), structural });
        }
    });

    WATCHERS.lock().unwrap_or_else(|e| e.into_inner()).insert(project_id, watcher);
    Ok(())
}

/// Stops watching a project (it was closed).
#[tauri::command]
pub fn project_unwatch(project_id: String) {
    WATCHERS.lock().unwrap_or_else(|e| e.into_inner()).remove(&project_id);
}

/// Stops watching every project: the app is closing. A watcher is a handle on a folder with a read waiting on it, and a static is not
/// dropped when the process ends, so they are let go of here.
pub fn stop_all() {
    WATCHERS.lock().unwrap_or_else(|e| e.into_inner()).clear();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn paths_are_relative_and_the_ignored_folders_are_left_out() {
        let root = Path::new("/work/book");
        assert_eq!(relative(root, Path::new("/work/book/chapters/one.md")).as_deref(), Some("chapters/one.md"));
        assert_eq!(relative(root, Path::new("/work/book/.formatex/config.toml")).as_deref(), Some(".formatex/config.toml"));
        assert_eq!(relative(root, Path::new("/work/book/node_modules/x/index.js")), None);
        assert_eq!(relative(root, Path::new("/work/book/.git/HEAD")), None);
        assert_eq!(relative(root, Path::new("/work/book")), None);
        assert_eq!(relative(root, Path::new("/elsewhere/file.md")), None);
    }

    #[test]
    fn what_changes_the_list_of_files_is_told_apart() {
        use notify::event::{CreateKind, DataChange, RemoveKind, RenameMode};
        assert!(is_structural(&EventKind::Create(CreateKind::File)));
        assert!(is_structural(&EventKind::Remove(RemoveKind::Folder)));
        assert!(is_structural(&EventKind::Modify(ModifyKind::Name(RenameMode::Both))));
        assert!(!is_structural(&EventKind::Modify(ModifyKind::Data(DataChange::Content))));
    }

    /// A real folder: a file written from outside is reported, and so is a new one as a change of the file list.
    #[test]
    fn a_change_in_a_real_folder_reaches_the_channel() {
        let dir = std::env::temp_dir().join(format!("formatex-watch-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let dir = dir.canonicalize().unwrap();
        let (sender, receiver) = mpsc::channel::<(Vec<String>, bool)>();
        let watched = dir.clone();
        let mut watcher = RecommendedWatcher::new(
            move |event: notify::Result<notify::Event>| {
                if let Ok(event) = event {
                    let paths: Vec<String> = event.paths.iter().filter_map(|path| relative(&watched, path)).collect();
                    if !paths.is_empty() && !matches!(event.kind, EventKind::Access(_)) {
                        let _ = sender.send((paths, is_structural(&event.kind)));
                    }
                }
            },
            Config::default(),
        )
        .unwrap();
        watcher.watch(&dir, RecursiveMode::Recursive).unwrap();

        std::fs::write(dir.join("new.md"), "# hi\n").unwrap();
        let mut seen: Vec<(Vec<String>, bool)> = Vec::new();
        while let Ok(item) = receiver.recv_timeout(Duration::from_secs(3)) {
            seen.push(item);
            if seen.iter().any(|(paths, structural)| *structural && paths.contains(&"new.md".to_string())) {
                break;
            }
        }
        let _ = std::fs::remove_dir_all(&dir);
        assert!(seen.iter().any(|(paths, structural)| *structural && paths.contains(&"new.md".to_string())), "{seen:?}");
    }
}
