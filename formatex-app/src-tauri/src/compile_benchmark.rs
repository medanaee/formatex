//! Opt-in measurements of the actual native preview pipeline. Never runs in the normal test suite.
use super::*;
use serde_json::{json, Value};
use std::fs;

fn ms(started: Instant) -> f64 { started.elapsed().as_secs_f64() * 1000.0 }

fn fixture(sections: usize) -> String {
    let mut text = String::from("---\ndir: auto\ncover:\n  enabled: false\n---\n\n# Large bilingual performance fixture\n\n");
    for n in 0..sections {
        text += &format!("## بخش پژوهش {n}\n\n");
        for _ in 0..3 {
            text += "این یک بند فارسی برای سنجش سرعت پردازش سند بزرگ است. هدف آزمایش، اندازه‌گیری زمان تبدیل متن، صفحه‌آرایی و تولید پیش‌نمایش در هنگام ویرایش است. داده‌های این پژوهش باید با دقت بررسی شوند و نتیجهٔ اندازه‌گیری قابل تکرار باشد.\n\n";
            text += "This English paragraph measures a realistic bilingual document rather than an empty typesetting loop. The preview should follow small edits without rebuilding unrelated work. Each section contains prose, references to data, a table, a list and mathematical notation.\n\n";
        }
        text += &format!("Edit marker BENCH_TOKEN_{n:03}.\n\n- First observation and its explanation\n- مشاهدهٔ دوم و نتیجهٔ آزمایش\n- Third observation with **bold** and *italic* text\n\n| Metric | Value | Unit |\n|---|---:|---|\n| Sample A | {n} | ms |\n| نمونهٔ ب | ۴۲ | میلی‌ثانیه |\n\n$$ E = mc^2 + \\sum_{{i=1}}^n i $$\n\n```python\ndef estimate(value):\n    return value * 2 + {n}\n```\n\n");
        if n % 10 == 0 { text += "<alert type=\"info\">\n\nThis is a representative component with mixed-language content: نتیجهٔ آزمایش.\n\n</alert>\n\n"; }
    }
    text
}

fn paged(engine: &Engine, source: &str, known: &mut Vec<String>, label: &str) -> Value {
    let total = Instant::now();
    let started = Instant::now();
    let compiled = compile_as(engine, "large", "main.md", Inputs::from([("markers".into(), "1".into())]), HashMap::from([("main.md".into(), source.into())]), false).unwrap();
    let compile_ms = ms(started);
    let document = compiled.document.unwrap_or_else(|| panic!("{}", serde_json::to_string(&compiled.diagnostics).unwrap()));
    let mut hash_ms = 0.0;
    let mut svg_ms = 0.0;
    let mut map_ms = 0.0;
    let mut changed = 0;
    let mut svg_bytes = 0;
    let mut output = Vec::new();
    let mut hashes = Vec::new();
    for (index, page) in document.pages().iter().enumerate() {
        let started = Instant::now();
        let hash = format!("{:032x}", typst::utils::hash128(page));
        hash_ms += ms(started);
        let fresh = known.get(index) != Some(&hash);
        let (svg, map) = if fresh {
            changed += 1;
            let started = Instant::now();
            let svg = typst_svg::svg(page, &SvgOptions::default());
            svg_ms += ms(started);
            svg_bytes += svg.len();
            let started = Instant::now();
            let map = links::map_page(&document, page);
            map_ms += ms(started);
            (Some(svg), Some(map))
        } else { (None, None) };
        hashes.push(hash.clone());
        output.push(PageOutput { hash, svg, map });
    }
    *known = hashes;
    let started = Instant::now();
    let markers = links::markers(&document);
    let markers_ms = ms(started);
    let started = Instant::now();
    let payload = serde_json::to_vec(&CompileOutput { pages: output, diagnostics: compiled.diagnostics, markers, ok: true, elapsed_ms: 0 }).unwrap();
    let json_ms = ms(started);
    json!({"kind":"paged", "label":label, "compile_ms":compile_ms, "hash_ms":hash_ms, "svg_ms":svg_ms, "map_ms":map_ms, "markers_ms":markers_ms, "json_ms":json_ms, "total_ms":ms(total), "pages":document.pages().len(), "changed_pages":changed, "svg_bytes":svg_bytes, "ipc_json_bytes":payload.len()})
}

/// A control experiment: keep an HTML World and refresh it as the paged path does. No production cache is changed.
fn retained_html(engine: &Engine, project: &std::path::Path, sources: &[String]) -> Vec<Value> {
    let fonts = engine.fonts.get();
    let inputs = Inputs::from([("source".into(), "main.md".into()), ("target".into(), "html".into()), ("html-ui-lang".into(), "en".into())]);
    let mut world = ProjectWorld::new_html(Some(project.into()), engine::ENTRY, engine.packages.clone(), fonts, engine.components.clone(), &inputs, HashMap::new());
    sources.iter().enumerate().map(|(i, source)| {
        let total = Instant::now();
        world.refresh(HashMap::from([("main.md".into(), source.as_bytes().to_vec())]));
        let started = Instant::now();
        let document = typst::compile::<HtmlDocument>(&world).output.expect("HTML compiles");
        let compile_ms = ms(started);
        let started = Instant::now();
        let html = typst_html::html(&document, &HtmlOptions::default()).unwrap();
        let serialize_ms = ms(started);
        typst::comemo::evict(10);
        json!({"kind":"html-retained-world-no-fonts", "run":i, "compile_ms":compile_ms, "serialize_ms":serialize_ms, "total_ms":ms(total), "bytes":html.len()})
    }).collect()
}

#[test]
#[ignore = "large native performance benchmark; run explicitly, preferably --release"]
fn large_preview_pipeline() {
    let sections = std::env::var("FORMATEX_BENCH_SECTIONS").ok().and_then(|s| s.parse().ok()).unwrap_or(80);
    let output = PathBuf::from(std::env::var("FORMATEX_BENCH_DIR").expect("set FORMATEX_BENCH_DIR to an output folder"));
    let data_dir = output.join(if cfg!(debug_assertions) { "dev" } else { "release" });
    let project = data_dir.join("documents/large");
    fs::create_dir_all(&project).unwrap();
    let config = "source = \"main.md\"\ntheme = \"paper\"\nfeel = \"formal\"\ndir = \"auto\"\n[font]\nlatin = \"New Computer Modern\"\npersian = \"Vazirmatn\"\ncode = \"Anonymous Pro\"\n";
    fs::write(project.join("config.toml"), config).unwrap();
    let base = fixture(sections);
    fs::write(project.join("main.md"), &base).unwrap();
    let engine = Engine { fonts: FontService::new(data_dir.join("fonts")), packages: Arc::new(crate::packages::system_packages(&data_dir.join("cache"))), components: Arc::new(ComponentLibrary::new(data_dir.join("components"))), worlds: Mutex::new(HashMap::new()), data_dir };
    let started = Instant::now();
    let fonts = engine.fonts.get();
    let mut rows = vec![json!({"kind":"fixture", "profile":if cfg!(debug_assertions) {"dev"} else {"release"}, "sections":sections, "source_bytes":base.len(), "source_lines":base.lines().count(), "words":base.split_whitespace().count(), "fonts_scan_ms":ms(started), "font_faces":fonts.book().families().count()})];
    let mut known = Vec::new();
    rows.push(paged(&engine, &base, &mut known, "first-target-build"));
    rows.push(paged(&engine, &base, &mut known, "unchanged"));
    let mut edited = base.clone();
    let mut sources = vec![base.clone(), base.clone()];
    for (label, section) in [("edit-start", 0), ("edit-middle", sections / 2), ("edit-end", sections - 1)] {
        edited = edited.replace(&format!("BENCH_TOKEN_{section:03}"), &format!("BENCH_EDITED_{section:03}"));
        rows.push(paged(&engine, &edited, &mut known, label));
        sources.push(edited.clone());
    }
    for embed_fonts in [false, true] {
        for (i, source) in sources.iter().enumerate() {
            let (html, timing) = render_html_profiled(&engine, "large", "main.md", HashMap::from([("main.md".into(), source.clone())]), false, HtmlExport { embed_fonts, ui_lang: Some(crate::html_export::UiLang::En), ..HtmlExport::default() }).unwrap();
            let mut row = serde_json::to_value(timing).unwrap();
            row["kind"] = json!(if embed_fonts { "html-current-fonts" } else { "html-current-no-fonts" });
            row["run"] = json!(i);
            rows.push(row);
            if i == sources.len() - 1 { fs::write(output.join(if embed_fonts {"large-embedded.html"} else {"large.html"}), html).unwrap(); }
        }
    }
    rows.extend(retained_html(&engine, &project, &sources));
    let mut known_fonts = String::new();
    for (i, source) in sources.iter().enumerate() {
        // Never compiled earlier in this process: avoid measuring a cache hit for an edit from the export loop.
        let live_source = format!("{source}\nLive preview revision {i}.\n");
        let result = render_preview_html(&engine, "large", "main.md", HashMap::from([("main.md".into(), live_source)]), false, HtmlExport { ui_lang: Some(crate::html_export::UiLang::En), ..HtmlExport::default() }, Some(&known_fonts)).unwrap();
        known_fonts = result.font_key.clone();
        let mut row = serde_json::to_value(&result.timings).unwrap();
        row["kind"] = json!("html-live-preview"); row["run"] = json!(i);
        row["font_css_bytes"] = json!(result.font_css.as_ref().map_or(0, String::len));
        if i == 0 || i == sources.len() - 1 {
            fs::write(output.join(if i == 0 {"preview-initial.json"} else {"preview-edited.json"}), serde_json::to_vec(&result).unwrap()).unwrap();
        }
        rows.push(row);
    }
    let fa = render_preview_html(&engine, "large", "main.md", HashMap::from([("main.md".into(), sources.last().unwrap().clone()), ("config.toml".into(), config.replace("paper", "dracula"))]), false, HtmlExport { ui_lang: Some(crate::html_export::UiLang::Fa), ..HtmlExport::default() }, None).unwrap();
    fs::write(output.join("preview-fa-dark.json"), serde_json::to_vec(&fa).unwrap()).unwrap();
    for row in &rows { eprintln!("BENCH {}", row); }
    fs::write(output.join(if cfg!(debug_assertions) {"dev.json"} else {"release.json"}), serde_json::to_vec_pretty(&rows).unwrap()).unwrap();
}

#[test]
#[ignore = "opt-in detailed trace after the large benchmark"]
fn trace_large_edit() {
    let output = PathBuf::from(std::env::var("FORMATEX_BENCH_DIR").expect("set FORMATEX_BENCH_DIR"));
    let data_dir = output.join("release");
    let project = data_dir.join("documents/large");
    let source = fs::read_to_string(project.join("main.md")).expect("run large_preview_pipeline first");
    let edited = source.replace("BENCH_TOKEN_040", "BENCH_EDITED_040");
    let engine = Engine { fonts: FontService::new(data_dir.join("fonts")), packages: Arc::new(crate::packages::system_packages(&data_dir.join("cache"))), components: Arc::new(ComponentLibrary::new(data_dir.join("components"))), worlds: Mutex::new(HashMap::new()), data_dir };
    let fonts = engine.fonts.get();
    let inputs = Inputs::from([("source".into(), "main.md".into()), ("target".into(), "html".into())]);
    let mut world = ProjectWorld::new_html(Some(project), engine::ENTRY, engine.packages.clone(), fonts, engine.components.clone(), &inputs, HashMap::from([("main.md".into(), source.into_bytes())]));
    typst::compile::<HtmlDocument>(&world).output.unwrap();
    world.refresh(HashMap::from([("main.md".into(), edited.into_bytes())]));
    typst_timing::enable();
    let started = Instant::now();
    typst::compile::<HtmlDocument>(&world).output.unwrap();
    eprintln!("Traced HTML edit: {} ms (tracing adds overhead)", ms(started));
    typst_timing::disable();
    typst_timing::export_json(fs::File::create(output.join("html-edit-trace.json")).unwrap(), |raw| {
        let span = typst::syntax::Span::from_raw(raw);
        let Some(id) = span.id() else { return ("evaluated".into(), 0) };
        let line = world.range(span).and_then(|range| world.source(id).ok().map(|s| s.text()[..range.start].lines().count() as u32)).unwrap_or(0);
        (id.vpath().get_with_slash().to_string(), line)
    }).unwrap();
}

#[test]
#[ignore = "controlled in-memory regex experiment; does not modify the engine"]
fn regex_control() {
    let output = PathBuf::from(std::env::var("FORMATEX_BENCH_DIR").expect("set FORMATEX_BENCH_DIR"));
    let data_dir = output.join("release");
    let project = data_dir.join("documents/large");
    let source = fs::read_to_string(project.join("main.md")).unwrap();
    let optimized = std::str::from_utf8(engine::file("src/preprocess/mark-lines.typ").unwrap()).unwrap();
    let code = r#"regex("`[^`\\n]*`")"#;
    let math = r#"regex("\\$[^$\\n]+\\$")"#;
    let fast = "      let code = if line.contains(\"`\") { line.replace(inline-code-re, m => blank(m.text)) } else { line }\n      lines.push(if code.contains(\"$\") { code.replace(inline-math-re, m => blank(m.text)) } else { code })";
    assert!(optimized.contains(fast));
    let original = optimized.replace(fast, &format!("      lines.push(line.replace({code}, m => blank(m.text)).replace({math}, m => blank(m.text)))"));
    let engine = Engine { fonts: FontService::new(data_dir.join("fonts")), packages: Arc::new(crate::packages::system_packages(&data_dir.join("cache"))), components: Arc::new(ComponentLibrary::new(data_dir.join("components"))), worlds: Mutex::new(HashMap::new()), data_dir };
    let fonts = engine.fonts.get();
    let inputs = Inputs::from([("source".into(), "main.md".into()), ("target".into(), "html".into())]);
    let mut rows = Vec::new();
    let mut baseline = Vec::new();
    for hoisted in [false, true] {
        let mut world = ProjectWorld::new_html(Some(project.clone()), engine::ENTRY, engine.packages.clone(), fonts.clone(), engine.components.clone(), &inputs, HashMap::new());
        for i in 0..4 {
            let edited = source.replace("BENCH_TOKEN_040", &format!("BENCH_EDIT_{i:03}"));
            let mut extra = HashMap::from([("main.md".into(), edited.into_bytes())]);
            extra.insert("src/preprocess/mark-lines.typ".into(), if hoisted { optimized.as_bytes().to_vec() } else { original.as_bytes().to_vec() });
            world.refresh(extra);
            let started = Instant::now();
            let document = typst::compile::<HtmlDocument>(&world).output.unwrap();
            let compile_ms = ms(started);
            let html = typst_html::html(&document, &HtmlOptions::default()).unwrap();
            if hoisted { assert_eq!(html, baseline[i], "regex hoist changed output"); } else { baseline.push(html); }
            typst::comemo::evict(10);
            let row = json!({"hoisted_regex":hoisted, "run":i, "compile_ms":compile_ms});
            eprintln!("REGEX_CONTROL {row}");
            rows.push(row);
        }
    }
    fs::write(output.join("regex-control.json"), serde_json::to_vec_pretty(&rows).unwrap()).unwrap();
}

#[test]
fn live_preview_reuses_world_and_fonts_without_changing_export() {
    let root = std::env::temp_dir().join(format!("formatex-live-html-{}", std::process::id()));
    let project = root.join("documents/p");
    fs::create_dir_all(&project).unwrap();
    fs::write(project.join("config.toml"), "source = \"main.md\"\n").unwrap();
    fs::write(project.join("main.md"), "## First\n\nHello world\n").unwrap();
    let engine = Engine { fonts: FontService::new(root.join("fonts")), packages: Arc::new(crate::packages::system_packages(&root.join("cache"))), components: Arc::new(ComponentLibrary::new(root.join("components"))), worlds: Mutex::new(HashMap::new()), data_dir: root.clone() };

    let options = HtmlExport::default();
    let first = render_preview_html(&engine, "p", "main.md", HashMap::new(), false, options, None).unwrap();
    assert!(first.font_css.as_ref().is_some_and(|css| css.contains("@font-face")));
    let html_world = engine.worlds.lock().unwrap().get("p\0html").unwrap().1.clone();
    let second = render_preview_html(&engine, "p", "main.md", HashMap::from([("main.md".into(), "## Updated\n\nŽluťoučký متن فارسی\n".into())]), false, options, Some(&first.font_key)).unwrap();
    assert_eq!(first.font_key, second.font_key, "new characters must not rebuild full font faces");
    assert!(second.font_css.is_none());
    assert!(second.html.contains("Updated"));
    assert!(Arc::ptr_eq(&html_world, &engine.worlds.lock().unwrap().get("p\0html").unwrap().1));
    assert!(compile_as(&engine, "p", "main.md", Inputs::new(), HashMap::new(), false).unwrap().document.is_some());
    assert!(engine.worlds.lock().unwrap().contains_key("p"));
    assert!(engine.worlds.lock().unwrap().contains_key("p\0html"));
    let export = render_html(&engine, "p", "main.md", HashMap::new(), false, options).unwrap();
    assert!(export.contains("@font-face"));
    engine.fonts.reload();
    render_preview_html(&engine, "p", "main.md", HashMap::new(), false, options, None).unwrap();
    assert!(!Arc::ptr_eq(&html_world, &engine.worlds.lock().unwrap().get("p\0html").unwrap().1));
    let _ = fs::remove_dir_all(root);
}

#[test]
fn html_uses_merged_document_configuration() {
    let root = std::env::temp_dir().join(format!("formatex-html-config-{}", std::process::id()));
    let project = root.join("documents/p");
    fs::create_dir_all(&project).unwrap();
    let config = "source = \"main.md\"\ndir = \"rtl\"\nscale = 125\n[paragraph]\njustify = true\nletter-spacing = 3\nline-spacing = 150\nword-spacing = 130\n[list]\nnumbers = \"abc\"\nprefix = \"(\"\nsuffix = \")\"\nmarker = \"square\"\n[table]\nwidth = \"auto\"\nalign = \"right\"\nhead-align = \"left\"\nbody-align = \"right\"\n[heading]\nunderline = true\nfill = true\nmax-level = 1\n";
    fs::write(project.join("config.toml"), config).unwrap();
    fs::write(project.join("main.md"), "## English heading\n\nEnglish paragraph.\n\n### Nested heading\n\n1. First\n2. Second\n\n- One\n- Two\n\n| A | B |\n|---|---|\n| C | D |\n\n<alert type=\"info\">\n\nEnglish alert.\n\n</alert>\n").unwrap();
    let engine = Engine { fonts: FontService::new(root.join("fonts")), packages: Arc::new(crate::packages::system_packages(&root.join("cache"))), components: Arc::new(ComponentLibrary::new(root.join("components"))), worlds: Mutex::new(HashMap::new()), data_dir: root.clone() };

    let options = HtmlExport { embed_fonts: false, ..HtmlExport::default() };
    let html = render_html(&engine, "p", "main.md", HashMap::new(), false, options).unwrap();
    fs::write(root.join("configured.html"), &html).unwrap();
    assert!(html.contains("class=\"fx-doc\" dir=\"rtl\""), "main must use the merged direction");
    assert!(html.contains("unicode-bidi: normal"));
    assert!(html.contains("text-align: justify"));
    assert!(html.contains("letter-spacing: 0.03em"));
    assert!(html.contains("line-height: 1.975"));
    assert!(html.contains("word-spacing: 30%"));
    assert!(html.contains(".fx-table th { text-align: left; }"));
    assert!(html.contains(".fx-table td { text-align: right; }"));
    assert!(html.contains("(a)") && html.contains("(b)"), "global enum settings must reach HTML");
    assert!(html.contains("▪"), "global bullet marker must reach HTML");
    let auto = render_html(&engine, "p", "main.md", HashMap::from([("main.md".into(), "---\ndir: auto\n---\n\n## English\n\nText\n".into())]), false, options).unwrap();
    assert!(auto.contains("class=\"fx-doc\" dir=\"auto\""), "front matter still overrides config");
    assert!(auto.contains("unicode-bidi: plaintext"));
    let _ = fs::remove_dir_all(root);
}

#[test]
fn cover_is_an_explicit_page_component_in_pdf_and_html() {
    let root = std::env::temp_dir().join(format!("formatex-cover-{}", std::process::id()));
    let project = root.join("documents/p");
    fs::create_dir_all(&project).unwrap();
    fs::write(project.join("config.toml"), "source = \"main.md\"\ndir = \"rtl\"\n").unwrap();
    let source = "## Before\n\nBefore cover.\n\n<dir to=\"ltr\">\n\n<cover title=\"Cover title\" author=\"Writer\" frame=\"true\">\n\n**Additional information**\n\n</cover>\n\n</dir>\n\n## After\n\nAfter cover.\n";
    fs::write(project.join("main.md"), source).unwrap();
    let engine = Engine { fonts: FontService::new(root.join("fonts")), packages: Arc::new(crate::packages::system_packages(&root.join("cache"))), components: Arc::new(ComponentLibrary::new(root.join("components"))), worlds: Mutex::new(HashMap::new()), data_dir: root.clone() };

    let pages = compile_as(&engine, "p", "main.md", Inputs::new(), HashMap::new(), false).unwrap().document.unwrap();
    assert_eq!(pages.pages().len(), 3, "cover must occupy exactly one page between source content");
    let options = HtmlExport { embed_fonts: false, ..HtmlExport::default() };
    let html = render_html(&engine, "p", "main.md", HashMap::new(), false, options).unwrap();

    assert!(html.contains("class=\"fx-cover fx-cover-framed\" dir=\"ltr\" style=\"height: 297mm\""));
    assert!(html.contains("<strong>Additional information</strong>"));
    assert!(html.find(">Before</h").unwrap() < html.find("class=\"fx-cover ").unwrap());
    assert!(html.find("class=\"fx-cover ").unwrap() < html.find(">After</h").unwrap());
    for (config, height) in [("page = \"mobile\"\n", "245mm"), ("page = \"custom\"\npage-width = \"150mm\"\npage-height = \"230mm\"\n", "230mm")] {
        let configured = render_html(&engine, "p", "main.md", HashMap::from([("config.toml".into(), format!("source = \"main.md\"\n{config}"))]), false, options).unwrap();
        assert!(configured.contains(&format!("style=\"height: {height}\"")));
    }
    let long = source.replace("**Additional information**", &"Long information paragraph.\n\n".repeat(100));
    let long_pages = compile_as(&engine, "p", "main.md", Inputs::new(), HashMap::from([("main.md".into(), long)]), false).unwrap().document.unwrap();
    assert_eq!(long_pages.pages().len(), 3, "long cover content must fit its one page");
    let legacy = "---\ncover:\n  title: Legacy cover\n---\n\n## Body\n\nOne body page.\n";
    let old_pages = compile_as(&engine, "p", "main.md", Inputs::new(), HashMap::from([("main.md".into(), legacy.into())]), false).unwrap().document.unwrap();
    assert_eq!(old_pages.pages().len(), 1, "old cover configuration must not create an implicit page");
    let _ = fs::remove_dir_all(root);
}

#[test]
fn separated_numbered_lists_restart_at_one() {
    let root = std::env::temp_dir().join(format!("formatex-lists-{}", std::process::id()));
    let project = root.join("documents/p");
    fs::create_dir_all(&project).unwrap();
    fs::write(project.join("config.toml"), "source = \"main.md\"\n").unwrap();
    let source = "1. مختار\n2. بیست سال\n\n1. nigg\n";
    fs::write(project.join("main.md"), source).unwrap();
    let engine = Engine {
        fonts: FontService::new(root.join("fonts")),
        packages: Arc::new(crate::packages::system_packages(&root.join("cache"))),
        components: Arc::new(ComponentLibrary::new(root.join("components"))),
        worlds: Mutex::new(HashMap::new()),
        data_dir: root.clone(),
    };
    let options = HtmlExport { embed_fonts: false, ..HtmlExport::default() };
    let html = render_html(&engine, "p", "main.md", HashMap::new(), false, options).unwrap();
    assert_eq!(html.matches("<ol").count(), 2, "1. after blank line must start a second <ol>");
    assert!(html.contains("<div class=\"fx-li-body\">مختار</div>"));
    assert!(html.contains("<div class=\"fx-li-body\">بیست سال</div>"));
    assert!(html.contains("<div class=\"fx-li-body\">nigg</div>"));


    // Persian digits
    let persian = "۱. مختار\n۲. بیست سال\n\n۱. nigg\n";
    let fa_html = render_html(&engine, "p", "main.md", HashMap::from([("main.md".into(), persian.into())]), false, options).unwrap();
    assert_eq!(fa_html.matches("<ol").count(), 2, "Persian ۱. after blank line must start a second <ol>");

    // Two blank lines between bullet lists also split into two lists
    let bullets_split = "- a\n- b\n\n\n- c\n";
    let bullets_html = render_html(&engine, "p", "main.md", HashMap::from([("main.md".into(), bullets_split.into())]), false, options).unwrap();
    assert_eq!(bullets_html.matches("<ul").count(), 2, "two blank lines between bullet items must split lists");

    // One blank line between bullet items remains a single loose list
    let bullets_loose = "- a\n\n- b\n";
    let loose_html = render_html(&engine, "p", "main.md", HashMap::from([("main.md".into(), bullets_loose.into())]), false, options).unwrap();
    assert_eq!(loose_html.matches("<ul").count(), 1, "one blank line between bullet items remains one list");

    // PDF compilation check
    let pages = compile_as(&engine, "p", "main.md", Inputs::new(), HashMap::new(), false).unwrap().document.unwrap();
    assert_eq!(pages.pages().len(), 1);
    let _ = fs::remove_dir_all(root);
}


#[test]
#[ignore = "write the complete HTML visual gallery and measure embedded resources"]
fn html_visual_gallery() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
    let output = root.join("out/html-2026-11-11");
    fs::create_dir_all(&output).unwrap();
    let fonts = FontService::new(output.join("fonts")).get();
    let source = fs::read_to_string(root.join("formatex-typ/out/html-structural-check.html")).unwrap();
    let full = crate::html_export::embed_fonts(source.clone(), &fonts);
    eprintln!("GALLERY raw={} embedded={} font_css={} faces={}", source.len(), full.len(), full.len()-source.len(), full.matches("@font-face").count());
    fs::write(output.join("gallery.html"), full).unwrap();
    let cmu = "<html><head><meta name=\"fx-fonts\" content=\"CMU Serif\"></head><body><main>Formal font ABC 123</main></body></html>";
    let css = crate::html_export::font_faces(cmu, &fonts);
    assert!(css.contains("font-family: \"CMU Serif\""), "requested CMU family must be addressable by CSS");
    assert_eq!(css.matches("font-weight: 400; font-style: normal").count(), 1);
    assert_eq!(css.matches("font-weight: 700; font-style: normal").count(), 1);
    fs::write(output.join("cmu.html"), crate::html_export::embed_fonts(cmu.replace("<main>", "<main style=\"font-family: 'CMU Serif'; font-size: 24px\">"), &fonts)).unwrap();
}

#[test]
fn katex_is_conditional_and_keeps_equation_references() {
    let root = std::env::temp_dir().join(format!("formatex-katex-{}", std::process::id()));
    let project = root.join("documents/p");
    fs::create_dir_all(&project).unwrap();
    fs::write(project.join("config.toml"), "source = \"main.md\"\ndir = \"rtl\"\n[html]\nmath = \"katex\"\n").unwrap();
    fs::write(project.join("main.md"), "Just text and `x$` without equations.\n").unwrap();
    let engine = Engine { fonts: FontService::new(root.join("fonts")), packages: Arc::new(crate::packages::system_packages(&root.join("cache"))), components: Arc::new(ComponentLibrary::new(root.join("components"))), worlds: Mutex::new(HashMap::new()), data_dir: root.clone() };
    let options = HtmlExport { embed_fonts: false, ..HtmlExport::default() };
    let plain = render_html(&engine, "p", "main.md", HashMap::new(), false, options).unwrap();
    assert!(!plain.contains("__fxKatexAssets"), "documents without math must not carry the runtime/fonts");
    let source = "$$x^2$$ {#first}\n\n$$y^2$$ {#second}\n\n<ref to=\"first\"></ref> / <ref to=\"second\"></ref>\n";
    let math = render_html(&engine, "p", "main.md", HashMap::from([("main.md".into(), source.into())]), false, options).unwrap();
    assert!(math.contains("__fxKatexAssets") && math.contains("DecompressionStream"));
    assert!(math.contains("(۱)") && math.contains("(۲)"));
    assert!(!math.contains("(۰)"), "references must follow the KaTeX display-equation counter");
    let _ = fs::remove_dir_all(root);
}
