//! Fonts available to the compiler.
//!
//! Order matters (earlier fonts win when two match equally): fonts the user imported, then the operating system's fonts, then
//! the few fonts Typst embeds. On desktop (Windows, macOS, Linux) the system fonts are read; on Android the user imports
//! fonts (`<app data>/fonts`), and the system font folder is scanned as a fallback.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};

use serde::Serialize;
use typst_kit::fonts::{self, FontPath, FontStore};

pub struct FontService {
    fonts_dir: PathBuf,
    store: RwLock<Option<Arc<FontStore>>>,
}

#[derive(Serialize)]
pub struct FamilyInfo {
    pub family: String,
    pub faces: usize,
    /// "imported", "system" or "embedded"
    pub origin: &'static str,
}

impl FontService {
    pub fn new(fonts_dir: PathBuf) -> Self {
        Self { fonts_dir, store: RwLock::new(None) }
    }

    /// The font store; scans the fonts on first use (a second or two with many system fonts).
    pub fn get(&self) -> Arc<FontStore> {
        if let Some(store) = self.store.read().unwrap().as_ref() {
            return store.clone();
        }
        let mut slot = self.store.write().unwrap();
        // Another thread may have finished while this one waited for the lock
        if let Some(store) = slot.as_ref() {
            return store.clone();
        }
        let store = Arc::new(build(&self.fonts_dir));
        *slot = Some(store.clone());
        store
    }

    /// Forgets the scanned fonts; the next `get()` scans again (after the user imported or removed a font).
    pub fn reload(&self) {
        *self.store.write().unwrap() = None;
    }

    /// Every font family, once, with where it comes from.
    pub fn families(&self) -> Vec<FamilyInfo> {
        let store = self.get();
        let mut out: BTreeMap<String, (usize, &'static str)> = BTreeMap::new();
        let mut index = 0;
        while let Some(info) = store.book().info(index) {
            let origin = origin(&store, index, &self.fonts_dir);
            let entry = out.entry(info.family.clone()).or_insert((0, origin));
            entry.0 += 1;
            index += 1;
        }
        out.into_iter()
            .map(|(family, (faces, origin))| FamilyInfo { family, faces, origin })
            .collect()
    }
}

fn origin(store: &FontStore, index: usize, fonts_dir: &Path) -> &'static str {
    let Some(source) = store.source(index) else { return "system" };
    let any: &dyn std::any::Any = source;
    match any.downcast_ref::<FontPath>() {
        Some(path) if path.path.starts_with(fonts_dir) => "imported",
        Some(_) => "system",
        None => "embedded",
    }
}

fn build(fonts_dir: &Path) -> FontStore {
    let mut store = FontStore::new();
    if fonts_dir.exists() {
        store.extend(fonts::scan(fonts_dir));
    }
    store.extend(fonts::system());
    #[cfg(target_os = "android")]
    store.extend(fonts::scan(Path::new("/system/fonts")));
    store.extend(fonts::embedded());
    store
}
