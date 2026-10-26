//! Typst packages (`@preview/cmarker`, ...): found in the cache folder, downloaded from Typst Universe when missing.
//!
//! On desktop the cache is the one the `typst` command line tool uses, so packages already downloaded are reused (and work
//! offline). On Android the cache is the app's own cache folder.

use std::any::Any;
use std::io::{self, Read};
use std::path::Path;
use std::time::Duration;

use typst_kit::downloader::Downloader;
use typst_kit::packages::{FsPackages, SystemPackages, UniversePackages};

/// HTTP through `ureq` with rustls, so no OpenSSL is needed on any platform.
struct HttpDownloader {
    agent: ureq::Agent,
}

impl Downloader for HttpDownloader {
    fn stream(&self, _key: &dyn Any, url: &str) -> io::Result<(Option<usize>, Box<dyn Read>)> {
        let response = self.agent.get(url).call().map_err(io::Error::other)?;
        let length = response.header("Content-Length").and_then(|value| value.parse().ok());
        Ok((length, Box::new(response.into_reader())))
    }
}

pub fn system_packages(app_cache: &Path) -> SystemPackages {
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(15))
        .timeout_read(Duration::from_secs(60))
        .build();
    let cache = if cfg!(desktop) { FsPackages::system_cache() } else { None };
    let cache = cache.unwrap_or_else(|| FsPackages::new(app_cache.join("typst-packages")));
    let data = if cfg!(desktop) { FsPackages::system_data() } else { None };
    SystemPackages::from_parts(data, Some(cache), UniversePackages::new(HttpDownloader { agent }))
}
