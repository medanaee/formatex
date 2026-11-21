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

fn graph_fixture(label: &str, config: &str, source: &str) -> (Engine, PathBuf) {
    let root = std::env::temp_dir().join(format!("formatex-graph-{label}-{}", std::process::id()));
    let project = root.join("documents/p");
    fs::create_dir_all(&project).unwrap();
    fs::write(project.join("config.toml"), config).unwrap();
    fs::write(project.join("main.md"), source).unwrap();
    (crate::compile::tests_engine(&root), root)
}
fn graph(engine: &Engine, overrides: HashMap<String,String>) -> Value {
    let result = prepare_document_in(engine,"p","main.md",overrides).unwrap();
    assert_eq!(result["ok"], true, "{}", result.get("diagnostics").unwrap_or(&Value::Null));
    result["document"].clone()
}

#[test]
fn live_preview_reuses_world_and_fonts_without_changing_export() {
    let (engine, root) = graph_fixture("world", "source = \"main.md\"\n", "## First\n\nHello\n");
    graph(&engine,HashMap::new());
    let kept = engine.worlds.lock().unwrap().get("p\0html").unwrap().1.clone();
    let edited = graph(&engine,HashMap::from([("main.md".into(),"## Updated\n\nمتن فارسی\n".into())]));
    assert_eq!(edited["children"][0]["children"][0]["value"],"Updated");
    assert!(Arc::ptr_eq(&kept,&engine.worlds.lock().unwrap().get("p\0html").unwrap().1));
    assert!(compile_as(&engine,"p","main.md",Inputs::new(),HashMap::new(),false).unwrap().document.is_some());
    engine.fonts.reload(); graph(&engine,HashMap::new());
    assert!(!Arc::ptr_eq(&kept,&engine.worlds.lock().unwrap().get("p\0html").unwrap().1));
    fs::remove_dir_all(root).unwrap();
}


#[test]
fn html_uses_merged_document_configuration() {
    let (engine,root)=graph_fixture("config","source = \"main.md\"\ndir = \"rtl\"\n[code]\nnumbering = true\n[html.code]\ncopy-button = false\n", "---\ndir: ltr\nhtml:\n  code:\n    copy-button: true\n---\n\n## English\n");
    let document=graph(&engine,HashMap::new());
    assert_eq!(document["settings"]["dir"],"ltr");
    assert_eq!(document["settings"]["code"]["numbering"],true);
    assert_eq!(document["settings"]["html"]["code"]["copy-button"],true);
    fs::remove_dir_all(root).unwrap();
}


#[test]
fn cover_is_an_explicit_page_component_in_pdf_and_html() {
    let source="## Before\n\nBefore.\n\n<cover title=\"Cover title\">Additional information</cover>\n\n## After\n\nAfter.\n";
    let (engine,root)=graph_fixture("cover","source = \"main.md\"\n",source);
    let pages=compile_as(&engine,"p","main.md",Inputs::new(),HashMap::new(),false).unwrap().document.unwrap();
    assert_eq!(pages.pages().len(),3);
    let document=graph(&engine,HashMap::new());
    assert_eq!(document["children"][2]["name"],"cover");
    assert_eq!(document["tokens"]["page-height"],297.0);
    let mobile=graph(&engine,HashMap::from([("config.toml".into(),"source = \"main.md\"\n[typ]\npage = \"mobile\"\n".into())]));
    assert_eq!(mobile["tokens"]["page-height"],245.0);
    fs::remove_dir_all(root).unwrap();
}


#[test]
fn separated_numbered_lists_restart_at_one() {
    let (engine,root)=graph_fixture("lists","source = \"main.md\"\n", "1. first\n2. second\n\n1. third\n");
    for (source,count) in [("1. first\n2. second\n\n1. third\n",2),("۱. اول\n۲. دوم\n\n۱. سوم\n",2),("- a\n- b\n\n\n- c\n",2),("- a\n\n- b\n",1)] {
        let document=graph(&engine,HashMap::from([("main.md".into(),source.into())]));
        assert_eq!(document["children"].as_array().unwrap().iter().filter(|node|node["type"]=="list").count(),count,"{source}");
    }
    assert!(compile_as(&engine,"p","main.md",Inputs::new(),HashMap::new(),false).unwrap().document.is_some());
    fs::remove_dir_all(root).unwrap();
}


#[test]
fn katex_is_conditional_and_keeps_equation_references() {
    let (engine,root)=graph_fixture("equations","source = \"main.md\"\n[html]\nmath = \"katex\"\n", "$$x^2$$ {#first}\n\n$$y^2$$ {#second}\n\n<ref to=\"first\"></ref> / <ref to=\"second\"></ref>\n");
    let document=graph(&engine,HashMap::new());
    let nodes=document["children"].as_array().unwrap();
    fn equation(node: &Value) -> Option<&Value> { if node["type"]=="math" { Some(node) } else { node["children"].as_array()?.iter().find_map(equation) } }
    assert_eq!(equation(&nodes[0]).unwrap()["props"]["id"],"first");
    assert_eq!(equation(&nodes[1]).unwrap()["props"]["id"],"second");
    assert_eq!(document["settings"]["html"]["math"],"katex");
    fs::remove_dir_all(root).unwrap();
}


#[test]
#[ignore = "Real large shared-core preparation benchmark; pairs with the HTML worker benchmark"]
fn shared_core_large_document() {
    let source=fixture(80);
    let (engine,root)=graph_fixture("large-core","source = \"main.md\"\n",&source);
    let output=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../out/performance");
    fs::create_dir_all(&output).unwrap();
    let mut rows=Vec::new();
    for round in 0..6 {
        let edited=if round==0 { source.clone() } else { source.replace("BENCH_TOKEN_040",&format!("EDIT_{round}")) };
        let started=Instant::now();
        let result=prepare_document_in(&engine,"p","main.md",HashMap::from([("main.md".into(),edited)])).unwrap();
        assert_eq!(result["ok"],true,"{}",result.get("diagnostics").unwrap_or(&Value::Null));
        let elapsed=ms(started);
        let data=serde_json::to_vec(&result["document"]).unwrap();
        rows.push(json!({"round":round,"prepareMs":elapsed,"irBytes":data.len(),"sourceBytes":source.len()}));
        if round==0 { fs::write(output.join("large-document.json"),data).unwrap(); }
    }
    fs::write(output.join("core-timings.json"),serde_json::to_vec_pretty(&rows).unwrap()).unwrap();
    eprintln!("SHARED_CORE {}",serde_json::to_string(&rows).unwrap());
    fs::remove_dir_all(root).unwrap();
}
