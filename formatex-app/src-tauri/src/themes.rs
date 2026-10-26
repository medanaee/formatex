//! The user's document themes. A theme is data (a name, a built-in theme to start from, and some colors), kept by the app in
//! `<app data>/themes.json`. The engine reads its themes from `src/themes.typ`; this module writes the version of that file the
//! engine sees: the built-in themes followed by the user's, so a new theme is as available as a built-in one (in `theme = "..."`,
//! in the schema, in the PDF) without any change to the engine.

use std::collections::{BTreeMap, BTreeSet};

use regex::Regex;
use serde::{Deserialize, Serialize};

/// The colors of a theme, as the engine names them.
pub const COLOR_KEYS: &[&str] = &["bg", "fg", "heading", "muted", "accent", "secondary", "rule", "code-bg", "code-stroke"];

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct UserTheme {
    /// The built-in theme the colors that are not set come from.
    #[serde(default)]
    pub base: String,
    #[serde(default)]
    pub dark: bool,
    /// `#rrggbb` by color key.
    #[serde(default)]
    pub colors: BTreeMap<String, String>,
}

/// A theme name as it is written in `theme = "..."`: letters, digits, `-` and `_`, starting with a letter.
pub fn valid_name(name: &str) -> bool {
    Regex::new(r"^[A-Za-z][\w-]{0,39}$").unwrap().is_match(name)
}

fn valid_hex(value: &str) -> bool {
    Regex::new(r"^#[0-9a-fA-F]{6}$").unwrap().is_match(value)
}

/// The names of the themes in the engine's own `themes.typ`.
pub fn builtin_names(builtin: &str) -> BTreeSet<String> {
    Regex::new(r"(?m)^  ([\w-]+): \(").unwrap().captures_iter(builtin).map(|c| c[1].to_string()).collect()
}

/// Drops what cannot be written into Typst safely: a bad name, a color that is not `#rrggbb`, a name a built-in already has.
pub fn sanitize(themes: BTreeMap<String, UserTheme>, builtin: &BTreeSet<String>) -> BTreeMap<String, UserTheme> {
    themes
        .into_iter()
        .filter(|(name, _)| valid_name(name) && !builtin.contains(name))
        .map(|(name, mut theme)| {
            theme.colors.retain(|key, value| COLOR_KEYS.contains(&key.as_str()) && valid_hex(value));
            if !builtin.contains(&theme.base) {
                theme.base = if theme.dark { "midnight" } else { "paper" }.to_string();
            }
            (name, theme)
        })
        .collect()
}

/// The text of `src/themes.typ` for the engine: the built-in file, then one `#let themes = themes + (...)` that adds the user's
/// themes. A color the user left out is read from the base theme in Typst itself.
pub fn generate(builtin: &str, themes: &BTreeMap<String, UserTheme>) -> String {
    let mut out = builtin.to_string();
    if themes.is_empty() {
        return out;
    }
    out += "\n// The user's themes, added by the Formatex app (Settings > Themes).\n#let themes = themes + (\n";
    for (name, theme) in themes {
        out += &format!("  \"{name}\": (\n    dark: {},\n", theme.dark);
        for key in COLOR_KEYS {
            match theme.colors.get(*key) {
                Some(hex) => out += &format!("    {key}: rgb(\"{hex}\"),\n"),
                None => out += &format!("    {key}: themes.at(\"{}\").{key},\n", theme.base),
            }
        }
        out += "  ),\n";
    }
    out += ")\n";
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    const BUILTIN: &str = "#let themes = (\n  paper: (\n    dark: false,\n    bg: rgb(\"#ffffff\"),\n  ),\n  midnight: (\n    dark: true,\n  ),\n)\n";

    fn theme(base: &str, colors: &[(&str, &str)]) -> UserTheme {
        UserTheme { base: base.into(), dark: false, colors: colors.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect() }
    }

    #[test]
    fn finds_the_built_in_names() {
        assert_eq!(builtin_names(BUILTIN).into_iter().collect::<Vec<_>>(), ["midnight", "paper"]);
    }

    #[test]
    fn drops_what_cannot_be_written_safely() {
        let builtin = builtin_names(BUILTIN);
        let input = BTreeMap::from([
            ("mine".to_string(), theme("nowhere", &[("accent", "#ff0000"), ("bg", "red"), ("evil", "#000000")])),
            ("paper".to_string(), theme("paper", &[])),
            ("bad name\"".to_string(), theme("paper", &[])),
        ]);
        let clean = sanitize(input, &builtin);
        assert_eq!(clean.keys().collect::<Vec<_>>(), ["mine"]);
        assert_eq!(clean["mine"].base, "paper");
        assert_eq!(clean["mine"].colors.keys().collect::<Vec<_>>(), ["accent"]);
    }

    #[test]
    fn adds_the_user_themes_after_the_built_in_ones() {
        let themes = BTreeMap::from([("mine".to_string(), theme("paper", &[("accent", "#ff0000")]))]);
        let text = generate(BUILTIN, &themes);
        assert!(text.starts_with(BUILTIN));
        assert!(text.contains("#let themes = themes + ("));
        assert!(text.contains("accent: rgb(\"#ff0000\"),"));
        assert!(text.contains("bg: themes.at(\"paper\").bg,"));
        assert_eq!(generate(BUILTIN, &BTreeMap::new()), BUILTIN);
    }
}
