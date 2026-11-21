use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Input {
    pub text: String,
    #[serde(default = "default_file")]
    pub file: String,
    #[serde(default)]
    pub sources: Map<String, Value>,
    #[serde(default)]
    pub segments: Vec<Segment>,
    #[serde(default)]
    pub settings: Map<String, Value>,
    #[serde(default)]
    pub tokens: Map<String, Value>,
    #[serde(default)]
    pub schemas: Map<String, Value>,
    #[serde(default)]
    pub packages: Map<String, Value>,
    #[serde(default)]
    pub options: Map<String, Value>,
}
fn default_file() -> String { "main.md".into() }

/// All offsets in this transport are UTF-8 byte offsets, with exclusive ends.
#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct Segment {
    pub start: usize,
    pub end: usize,
    pub file: String,
    pub original: [usize; 2],
    #[serde(default)]
    pub generated: bool,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct Location { pub file: String, pub line: usize, pub column: usize }

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceRange {
    pub file: String,
    pub start: usize,
    pub end: usize,
    pub utf16_start: usize,
    pub utf16_end: usize,
    pub generated: bool,
    pub text_start: usize,
    pub text_end: usize,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    #[serde(rename = "type")]
    pub kind: String,
    pub key: String,
    pub at: Location,
    pub span: [usize; 2],
    pub source: Vec<SourceRange>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub depth: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ordered: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checked: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lang: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identifier: Option<String>,
    #[serde(default, skip_serializing_if = "Map::is_empty")]
    pub props: Map<String, Value>,
    #[serde(default, skip_serializing_if = "Map::is_empty")]
    pub prop_spans: Map<String, Value>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub align: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<Node>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub rich: BTreeMap<String, Vec<Node>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub version: u8,
    pub file: String,
    pub children: Vec<Node>,
    pub settings: Map<String, Value>,
    pub tokens: Map<String, Value>,
    pub sources: Map<String, Value>,
    pub segments: Vec<Segment>,
    pub packages: Map<String, Value>,
    pub options: Map<String, Value>,
}

#[derive(Clone, Debug, Serialize)]
pub struct Diagnostic {
    pub severity: String,
    pub message: String,
    pub path: String,
    pub line: usize,
    pub column: usize,
    pub range: Vec<SourceRange>,
}
