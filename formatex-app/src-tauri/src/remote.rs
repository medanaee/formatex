//! Files from the internet (`https://...` in an image, or in a data function of a `{{ }}` block): downloaded the first time they are
//! asked for and kept in the project's cache folder, so no compile needs the network again. The engine writes an address as a path
//! under `/.remote/` (see `src/lib/remote.typ` in the engine); the world's loader decodes it here.
//!
//! A file outside the project (`file:///home/me/a.png`) is kept the same way, under `/.external/`: copied into the cache, copied again
//! when the original changes (its modification time or size), and the kept copy is used when the original is gone.
//!
//! The cache is `.cache/` in a project kept by the app, and `.formatex/.cache/` in a project kept in a folder of the user's. Each file
//! is `<key>.<ext>` with a `<key>.url` next to it holding the address, which is what the sync button downloads again.

use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::Duration;

use serde::Serialize;

/// The most a single download may be.
const MAX_BYTES: u64 = 64 * 1024 * 1024;

/// The path (without the leading slash) under which the engine writes an address.
pub const PREFIX: &str = ".remote/";
/// The same for a file on this computer.
pub const EXTERNAL_PREFIX: &str = ".external/";

/// What may be read from outside the project: pictures and data files, not any file.
const EXTERNAL_EXTENSIONS: [&str; 11] = ["png", "jpg", "jpeg", "gif", "webp", "svg", "json", "yaml", "yml", "toml", "csv"];

/// The address a `.remote/...` path stands for: the folders are joined, then each `~XX` is a byte.
pub fn decode(path: &str) -> Option<String> {
    let encoded = path.strip_prefix(PREFIX).or_else(|| path.strip_prefix(EXTERNAL_PREFIX))?.replace('/', "");
    let bytes = encoded.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'~' {
            let hex = std::str::from_utf8(bytes.get(i + 1..i + 3)?).ok()?;
            out.push(u8::from_str_radix(hex, 16).ok()?);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    let url = String::from_utf8(out).ok()?;
    (url.starts_with("http://") || url.starts_with("https://") || url.starts_with("file://")).then_some(url)
}

/// Where the cache of the project in `root` is.
pub fn cache_dir(root: &Path) -> PathBuf {
    if root.join(".formatex").join("config.toml").is_file() {
        root.join(".formatex").join(".cache")
    } else {
        root.join(".cache")
    }
}

/// A name for the address: a 64-bit FNV-1a hash in hex, and the file's own extension (the address without its query) when it has a short one.
fn file_name(url: &str) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in url.bytes() {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    let path = url.split(['?', '#']).next().unwrap_or(url);
    let ext = path
        .rsplit('/')
        .next()
        .and_then(|name| name.rsplit_once('.'))
        .map(|(_, ext)| ext.to_ascii_lowercase())
        .filter(|ext| !ext.is_empty() && ext.len() <= 5 && ext.bytes().all(|b| b.is_ascii_alphanumeric()));
    match ext {
        Some(ext) => format!("{hash:016x}.{ext}"),
        None => format!("{hash:016x}"),
    }
}

fn agent() -> &'static ureq::Agent {
    static AGENT: OnceLock<ureq::Agent> = OnceLock::new();
    AGENT.get_or_init(|| ureq::AgentBuilder::new().timeout_connect(Duration::from_secs(15)).timeout_read(Duration::from_secs(60)).build())
}

fn download(url: &str) -> Result<Vec<u8>, String> {
    let response = agent().get(url).call().map_err(|error| format!("could not download {url}: {error}"))?;
    let mut data = Vec::new();
    response.into_reader().take(MAX_BYTES + 1).read_to_end(&mut data).map_err(|error| format!("could not download {url}: {error}"))?;
    if data.len() as u64 > MAX_BYTES {
        return Err(format!("{url} is larger than {} MB", MAX_BYTES / 1024 / 1024));
    }
    Ok(data)
}

/// Written whole or not at all: a half-written file would be served as the image from then on.
fn store(dir: &Path, name: &str, url: &str, data: &[u8]) -> Result<(), String> {
    std::fs::create_dir_all(dir).map_err(|error| error.to_string())?;
    let temp = dir.join(format!("{name}.part"));
    std::fs::write(&temp, data).map_err(|error| error.to_string())?;
    std::fs::rename(&temp, dir.join(name)).map_err(|error| error.to_string())?;
    std::fs::write(dir.join(format!("{name}.url")), url).map_err(|error| error.to_string())
}

/// The place on this computer of a `file://` address: `file:///home/me/a.png`, `file:///C:/Users/me/a.png`; `%20` and the like are decoded.
fn local_path(address: &str) -> Result<PathBuf, String> {
    let rest = address.strip_prefix("file://").ok_or_else(|| format!("{address} is not a file address"))?;
    let bytes = rest.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        let hex = bytes.get(i + 1..i + 3).filter(|hex| hex.iter().all(u8::is_ascii_hexdigit));
        match (bytes[i], hex) {
            (b'%', Some(hex)) => {
                out.push(u8::from_str_radix(std::str::from_utf8(hex).unwrap_or("3f"), 16).unwrap_or(b'?'));
                i += 3;
            }
            (byte, _) => {
                out.push(byte);
                i += 1;
            }
        }
    }
    let text = String::from_utf8(out).map_err(|_| format!("{address} is not valid text"))?;
    // `/C:/Users/me` is `C:/Users/me` on Windows
    let text = match text.as_bytes() {
        [b'/', drive, b':', ..] if drive.is_ascii_alphabetic() => text[1..].to_string(),
        _ => text,
    };
    let path = PathBuf::from(&text);
    if !path.is_absolute() {
        return Err(format!("{address} is not an absolute path (a file outside the project is written file:///...)"));
    }
    Ok(path)
}

/// Changes when the file does: its modification time and size.
fn stamp(path: &Path) -> Option<String> {
    let meta = std::fs::metadata(path).ok()?;
    let modified = meta.modified().ok()?.duration_since(std::time::UNIX_EPOCH).ok()?;
    Some(format!("{}.{}-{}", modified.as_secs(), modified.subsec_nanos(), meta.len()))
}

/// A file outside the project, through the cache: copied the first time and whenever the original changed (`force`: always), and when the
/// original is gone the kept copy is used. A file inside the project folder is read where it is.
fn fetch_local(root: &Path, address: &str, force: bool) -> Result<Vec<u8>, String> {
    let source = local_path(address)?;
    let dir = cache_dir(root);
    let name = file_name(address);
    let kept = dir.join(&name);
    let stamp_file = dir.join(format!("{name}.stamp"));
    if source.is_file() {
        if let (Ok(real), Ok(base)) = (source.canonicalize(), root.canonicalize()) {
            if real.starts_with(&base) {
                return std::fs::read(&real).map_err(|error| format!("could not read {address}: {error}"));
            }
        }
        let ext = source.extension().and_then(|ext| ext.to_str()).map(str::to_ascii_lowercase).unwrap_or_default();
        if !EXTERNAL_EXTENSIONS.contains(&ext.as_str()) {
            return Err(format!("{address}: only pictures (png, jpg, gif, webp, svg) and data files (json, yaml, toml, csv) can be read from outside the project"));
        }
        let now = stamp(&source);
        let current = kept.is_file() && now.is_some() && std::fs::read_to_string(&stamp_file).ok() == now;
        if force || !current {
            let data = std::fs::read(&source).map_err(|error| format!("could not read {address}: {error}"))?;
            store(&dir, &name, address, &data)?;
            if let Some(now) = now {
                let _ = std::fs::write(&stamp_file, now);
            }
            return Ok(data);
        }
    }
    std::fs::read(&kept).map_err(|_| format!("{address} was not found, and no copy of it is kept"))
}

/// The bytes of an address: from the cache when it is there, else downloaded now and kept. A `file://` address is a file of this computer.
pub fn fetch(root: &Path, url: &str) -> Result<Vec<u8>, String> {
    if url.starts_with("file://") {
        return fetch_local(root, url, false);
    }
    let dir = cache_dir(root);
    let name = file_name(url);
    if let Ok(data) = std::fs::read(dir.join(&name)) {
        return Ok(data);
    }
    let data = download(url)?;
    // A cache that cannot be written still serves this compile
    if let Err(error) = store(&dir, &name, url, &data) {
        log::warn!("could not keep {url} in the cache: {error}");
    }
    Ok(data)
}

#[derive(Debug, Default, Serialize, PartialEq, Eq)]
pub struct SyncReport {
    /// Addresses downloaded again.
    pub updated: usize,
    /// One message for each address that could not be: its old copy stays.
    pub failed: Vec<String>,
}

/// One address kept in the cache.
#[derive(Debug, Serialize, PartialEq, Eq)]
pub struct RemoteItem {
    pub url: String,
    pub size: u64,
    /// A picture the editor can show small (png, jpeg, gif, webp, svg).
    pub image: bool,
}

/// Every address kept in the cache, in the order of their names.
pub fn list(root: &Path) -> Vec<RemoteItem> {
    let dir = cache_dir(root);
    let Ok(entries) = std::fs::read_dir(&dir) else { return Vec::new() };
    let mut items: Vec<(String, RemoteItem)> = entries
        .flatten()
        .filter_map(|entry| {
            let path = entry.path();
            if path.extension().and_then(|ext| ext.to_str()) != Some("url") {
                return None;
            }
            let url = std::fs::read_to_string(&path).ok()?.trim().to_string();
            let name = path.file_stem()?.to_str()?.to_string();
            let size = std::fs::metadata(dir.join(&name)).ok()?.len();
            let ext = name.rsplit_once('.').map(|(_, ext)| ext.to_ascii_lowercase()).unwrap_or_default();
            let image = matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg");
            Some((name, RemoteItem { url, size, image }))
        })
        .collect();
    items.sort_by(|a, b| a.1.url.cmp(&b.1.url));
    items.into_iter().map(|(_, item)| item).collect()
}

/// The kept bytes of an address (never downloads): for the small pictures of the list.
pub fn kept(root: &Path, url: &str) -> Result<Vec<u8>, String> {
    std::fs::read(cache_dir(root).join(file_name(url))).map_err(|error| error.to_string())
}

/// Downloads again the addresses in the cache: all of them, or only `only`.
pub fn sync(root: &Path, only: Option<&str>) -> SyncReport {
    let dir = cache_dir(root);
    let mut report = SyncReport::default();
    for item in list(root) {
        if only.is_some_and(|url| url != item.url) {
            continue;
        }
        let outcome = if item.url.starts_with("file://") {
            fetch_local(root, &item.url, true).map(|_| ())
        } else {
            download(&item.url).and_then(|data| store(&dir, &file_name(&item.url), &item.url, &data))
        };
        match outcome {
            Ok(()) => report.updated += 1,
            Err(error) => report.failed.push(error),
        }
    }
    report
}

/// The sync buttons: the addresses kept in the project's cache are downloaded again (`url`: only that one).
#[tauri::command]
pub async fn remote_sync(engine: tauri::State<'_, std::sync::Arc<crate::compile::Engine>>, project_id: String, url: Option<String>) -> Result<SyncReport, String> {
    let root = crate::compile::project_dir(&engine, &project_id)?;
    tauri::async_runtime::spawn_blocking(move || sync(&root, url.as_deref())).await.map_err(|error| error.to_string())
}

/// What the project keeps from the internet, for the list beside the Export button.
#[tauri::command]
pub async fn remote_list(engine: tauri::State<'_, std::sync::Arc<crate::compile::Engine>>, project_id: String) -> Result<Vec<RemoteItem>, String> {
    let root = crate::compile::project_dir(&engine, &project_id)?;
    tauri::async_runtime::spawn_blocking(move || list(&root)).await.map_err(|error| error.to_string())
}

/// The kept bytes of one address, to show it small.
#[tauri::command]
pub async fn remote_file(engine: tauri::State<'_, std::sync::Arc<crate::compile::Engine>>, project_id: String, url: String) -> Result<tauri::ipc::Response, String> {
    let root = crate::compile::project_dir(&engine, &project_id)?;
    tauri::async_runtime::spawn_blocking(move || kept(&root, &url).map(tauri::ipc::Response::new)).await.map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::net::TcpListener;

    #[test]
    fn decodes_what_the_engine_writes() {
        assert_eq!(decode(".remote/https~3A~2F~2Fexample~2Ecom~2Fa~2Epng").as_deref(), Some("https://example.com/a.png"));
        // A long address is split over folders, and a character of several bytes is written byte by byte
        assert_eq!(decode(".remote/https~3A~2F~2Fx~2Eorg~2F~C3/~BC~2Epng").as_deref(), Some("https://x.org/ü.png"));
        assert_eq!(decode(".remote/ftp~3A~2F~2Fx"), None);
        assert_eq!(decode(".external/file~3A~2F~2F~2Fhome~2Fme~2Fa~2Epng").as_deref(), Some("file:///home/me/a.png"));
        assert_eq!(decode("images/a.png"), None);
        assert_eq!(decode(".remote/https~3A~2F~2Fx~2"), None);
    }

    #[test]
    fn a_file_outside_the_project_is_copied_and_follows_its_original() {
        let base = std::env::temp_dir().join(format!("formatex-external-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&base);
        let root = base.join("project");
        let outside = base.join("outside");
        std::fs::create_dir_all(&root).unwrap();
        std::fs::create_dir_all(&outside).unwrap();
        let original = outside.join("data one.json");
        std::fs::write(&original, r#"{"a": 1}"#).unwrap();
        let normal = original.to_string_lossy().replace('\\', "/");
        let address = format!("file:///{}", normal.trim_start_matches('/')).replace(' ', "%20");
        let address = if cfg!(windows) { address } else { format!("file://{normal}").replace(' ', "%20") };

        assert_eq!(fetch(&root, &address).unwrap(), br#"{"a": 1}"#);
        assert!(cache_dir(&root).join(file_name(&address)).is_file());
        // Changed: copied again (a different size, so the stamp differs whatever the clock says)
        std::fs::write(&original, r#"{"a": 22}"#).unwrap();
        assert_eq!(fetch(&root, &address).unwrap(), br#"{"a": 22}"#);
        // Gone: the kept copy serves
        std::fs::remove_file(&original).unwrap();
        assert_eq!(fetch(&root, &address).unwrap(), br#"{"a": 22}"#);
        assert_eq!(list(&root).len(), 1);
        // Never seen and gone: an error that says so; other kinds of file are refused
        assert!(fetch(&root, &address.replace("data%20one", "never")).is_err());
        std::fs::write(outside.join("secret.txt"), "x").unwrap();
        let refused = fetch(&root, &address.replace("data%20one.json", "secret.txt")).unwrap_err();
        assert!(refused.contains("only pictures"), "{refused}");
        // Not absolute
        assert!(fetch(&root, "file://relative/a.png").is_err());
        let _ = std::fs::remove_dir_all(&base);
    }

    #[test]
    fn names_a_file_by_address_and_keeps_its_extension() {
        let a = file_name("https://example.com/a/photo.PNG?size=2");
        assert!(a.ends_with(".png"));
        assert_ne!(a, file_name("https://example.com/a/photo.PNG?size=3"));
        assert_eq!(a, file_name("https://example.com/a/photo.PNG?size=2"));
        assert!(!file_name("https://example.com/image").contains('.'));
    }

    #[test]
    fn downloads_once_and_then_serves_the_cache() {
        let root = std::env::temp_dir().join(format!("formatex-remote-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}/pic.png", listener.local_addr().unwrap());
        // A server that answers twice: the second answer is different, and only the sync may see it
        let server = std::thread::spawn(move || {
            for body in ["first", "second"] {
                let (mut stream, _) = listener.accept().unwrap();
                let mut request = [0u8; 2048];
                let _ = stream.read(&mut request);
                write!(stream, "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len()).unwrap();
            }
        });
        assert_eq!(fetch(&root, &url).unwrap(), b"first");
        // Not downloaded again: the server has one answer left, and this would take it
        assert_eq!(fetch(&root, &url).unwrap(), b"first");
        assert!(cache_dir(&root).join(file_name(&url)).is_file());
        assert_eq!(list(&root), vec![RemoteItem { url: url.clone(), size: 5, image: true }]);
        assert_eq!(kept(&root, &url).unwrap(), b"first");
        // Syncing an address that is not kept downloads nothing
        assert_eq!(sync(&root, Some("http://other.invalid/x.png")), SyncReport::default());
        let report = sync(&root, Some(&url));
        assert_eq!(report, SyncReport { updated: 1, failed: vec![] });
        assert_eq!(fetch(&root, &url).unwrap(), b"second");
        server.join().unwrap();
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn a_folder_project_keeps_its_cache_in_the_formatex_folder() {
        let root = std::env::temp_dir().join(format!("formatex-remote-dir-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        assert_eq!(cache_dir(&root), root.join(".cache"));
        std::fs::create_dir_all(root.join(".formatex")).unwrap();
        std::fs::write(root.join(".formatex").join("config.toml"), "").unwrap();
        assert_eq!(cache_dir(&root), root.join(".formatex").join(".cache"));
        let _ = std::fs::remove_dir_all(&root);
    }
}
