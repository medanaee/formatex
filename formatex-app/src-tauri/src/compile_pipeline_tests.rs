//! Real embedded-core tests: no JS parser and no mock Typst world.
use super::*;
use std::fs;

fn fixture() -> (Engine, PathBuf) {
    let root = std::env::temp_dir().join(format!("formatex-core-pipeline-{}-{}", std::process::id(), std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
    let project = root.join("documents/p");
    fs::create_dir_all(&project).unwrap();
    fs::write(project.join("config.toml"), include_str!("../../engine/config.toml")).unwrap();
    let engine = Engine { fonts: FontService::new(root.join("fonts")), packages: Arc::new(crate::packages::system_packages(&root.join("cache"))), components: Arc::new(ComponentLibrary::new(root.join("components"))), worlds: Mutex::new(HashMap::new()), data_dir: root.clone() };
    (engine, root)
}

#[test]
fn shared_pipeline_preserves_expressions_includes_ranges_and_paged_rendering() {
    let (engine, root) = fixture();
    let project = root.join("documents/p");
    let source = "---\nvars:\n  count: 2\ntyp:\n  page: desktop-a5\nhtml:\n  toolbar: false\n---\n\n## Intro {#intro}\n\nسلام {{ count + 1 }} 😀 end.\n\n<include src=\"./part.md\"></include>\n";
    fs::write(project.join("main.md"), source).unwrap();
    fs::write(project.join("part.md"), "Included **word**.\n").unwrap();
    let output = prepare_document_in(&engine, "p", "main.md", HashMap::new()).unwrap();
    assert_eq!(output["ok"], true, "{output}");
    let document = &output["document"];
    assert_eq!(document["settings"]["html"]["toolbar"], false);
    let children = document["children"].as_array().unwrap();
    assert_eq!(children[0]["props"]["id"], "intro");
    assert_eq!(children[1]["children"][0]["value"], "سلام 3 😀 end.");
    assert!(document["segments"].as_array().unwrap().iter().any(|segment| segment["generated"] == true));
    assert_eq!(children[2]["source"][0]["file"], "part.md");
    let compiled = compile_as(&engine, "p", "main.md", Inputs::new(), HashMap::new(), false).unwrap();
    assert!(compiled.document.is_some(), "{:?}", compiled.diagnostics.iter().map(|d| &d.message).collect::<Vec<_>>());
    assert!(project.join("main.md").is_file());
    assert!(root.starts_with(std::env::temp_dir())); fs::remove_dir_all(root).unwrap();
}

#[test]
fn html_page_values_and_wrong_backend_properties_report_the_md_position() {
    let (engine, root) = fixture();
    let project = root.join("documents/p");
    for (source, expected, line) in [
        ("Text\n\n{{ PAGE }}\n", "PAGE", 3),
        ("Text\n\n<code copy-button=\"true\">\n```js\nx\n```\n</code>", "html.copy-button", 3),
    ] {
        fs::write(project.join("main.md"), source).unwrap();
        let output = prepare_document_in(&engine, "p", "main.md", HashMap::new()).unwrap();
        assert_eq!(output["ok"], false, "{output}");
        let diagnostic = &output["diagnostics"][0];
        assert_eq!(diagnostic["path"], "main.md", "{output}"); assert_eq!(diagnostic["line"], line, "{output}");
        assert!(diagnostic["message"].as_str().unwrap().contains(expected), "{output}");
    }
    assert!(root.starts_with(std::env::temp_dir())); fs::remove_dir_all(root).unwrap();
}

#[test]
#[ignore = "Finishes the opt-in HTML integration artifact for offline browser QA"]
fn finish_real_html_fixture_with_subset_fonts() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().unwrap().parent().unwrap().to_path_buf();
    let input = root.join("out/pipeline/document.html");
    let html = fs::read_to_string(&input).expect("Run FORMATEX_DOCUMENT_INTEGRATION=1 first");
    let fonts = FontService::new(root.join("out/pipeline/fonts")).get();
    let output = crate::html_export::embed_fonts(html, &fonts);
    assert!(output.contains("@font-face"));
    assert!(output.contains("font-family: \"KaTeX_Math\""));
    fs::write(root.join("out/pipeline/document.fonts.html"), &output).unwrap();
    eprintln!("Offline full-demo HTML: {} bytes with subset fonts", output.len());
}

#[test]
fn project_html_only_packages_remain_in_the_ir_but_are_omitted_from_pdf() {
    let (engine,root)=fixture(); let project=root.join("documents/p");
    fs::create_dir_all(project.join("custom/web")).unwrap();
    fs::write(project.join("custom/web/manifest.toml"),"name = \"web\"\ntyp = false\n").unwrap();
    fs::write(project.join("custom/web/schema.json"),r#"{"web":{"kind":"block","attrs":{}}}"#).unwrap();
    fs::write(project.join("custom/web/docs.json"),"{}").unwrap();
    fs::write(project.join("custom/web/html.tsx"),"export default function Web({node,context}) { return <section className=\"p-2\">{context.children(node)}</section> }").unwrap();
    fs::write(project.join("custom/web/html.css"),"").unwrap();
    fs::write(project.join("main.md"),"---\ncomponents: [custom/web]\n---\n\n## Visible\n\n<web>\n\n## HiddenHeading\n\nOnlyHTML\n\n</web>\n\nAfterPDF\n").unwrap();
    let graph=prepare_document_in(&engine,"p","main.md",HashMap::new()).unwrap();
    assert_eq!(graph["ok"],true,"{}",graph.get("diagnostics").unwrap_or(&serde_json::Value::Null));
    assert!(graph["document"]["packages"]["web"]["typ"].is_null());
    assert!(serde_json::to_string(&graph["document"]["children"]).unwrap().contains("HiddenHeading"));
    let built=compile_as(&engine,"p","main.md",Inputs::new(),HashMap::new(),false).unwrap();
    let document=built.document.unwrap_or_else(||panic!("{:?}",built.diagnostics.iter().map(|d|&d.message).collect::<Vec<_>>()));
    let map=serde_json::to_value(links::map_page(&document,&document.pages()[0])).unwrap();
    let text=map["texts"].as_array().unwrap().iter().map(|run|run["text"].as_str().unwrap_or("")).collect::<String>();
    assert!(text.contains("AfterPDF"),"{text}"); assert!(!text.contains("OnlyHTML"),"{text}"); assert!(!text.contains("HiddenHeading"),"{text}");
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn html_context_values_use_logical_sections_with_the_bytes_transport_enabled() {
    let (engine,root)=fixture(); let project=root.join("documents/p");
    fs::write(project.join("main.md"),"---\nheading:\n  numbering: true\nvars:\n  suffix: \"!\"\n---\n\n## First\n\n{{ SECTION }} / {{ SECTION_NUMBER }}\n\n## Second\n\n{{ SECTION + suffix }} / {{ SECTION_NUMBER }}\n").unwrap();
    let result=prepare_document_in(&engine,"p","main.md",HashMap::new()).unwrap();
    assert_eq!(result["ok"],true,"{}",result.get("diagnostics").unwrap_or(&serde_json::Value::Null));
    let children=serde_json::to_string(&result["document"]["children"]).unwrap();
    assert!(children.contains("First")); assert!(children.contains("Second!"),"{children}"); assert!(!children.contains("fx-deferred"));
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn nested_pdf_flex_items_survive_source_markers_without_collapsing_or_overlapping() {
    let (engine,root)=fixture(); let project=root.join("documents/p");
    fs::write(project.join("main.md"),r#"---
feel: standard
dir: rtl
---
<div tailwind="flex gap-3">
<div tailwind="flex-1 p-3 bg-green">First cell</div>
<div tailwind="flex-1 p-3 bg-red">Second cell</div>
<div tailwind="w-24 p-3 bg-yellow">Fixed cell</div>
</div>
<div tailwind="flex flex-wrap gap-2">
<div tailwind="p-2">tag one</div>
<div tailwind="p-2">tag two</div>
<div tailwind="p-2">tag three</div>
</div>
<div tailwind="flex items-center gap-3 p-3 border rounded-xl">
<div tailwind="flex flex-col gap-1">
<div tailwind="font-bold">Card title</div>
<div>Subtitle under the title</div>
</div>
<div tailwind="ms-auto p-2">New</div>
</div>
"#).unwrap();
    let mut previous=None;
    for markers in ["0","1"] {
        let built=compile_as(&engine,"p","main.md",Inputs::from([("markers".into(),markers.into())]),HashMap::new(),false).unwrap();
        let doc=built.document.unwrap_or_else(||panic!("{:?}",built.diagnostics.iter().map(|d|&d.message).collect::<Vec<_>>()));
        let page=serde_json::to_value(links::map_page(&doc,&doc.pages()[0])).unwrap();
        let runs=page["texts"].as_array().unwrap();
        let run=|text:&str| runs.iter().find(|run|run["text"].as_str().unwrap_or("").contains(text)).unwrap_or_else(||panic!("missing {text}: {runs:?}"));
        let field=|text:&str,key:&str|run(text)[key].as_f64().unwrap();
        assert!((field("First","y")-field("Second","y")).abs()<1.0);
        for label in ["two","three"] { assert!((field("one","y")-field(label,"y")).abs()<1.0); }
        assert!(field("one","x") > field("two","x") + field("two","w"));
        assert!(field("two","x") > field("three","x") + field("three","w"));
        assert!(field("Card","w")>20.0);
        assert!(field("New","y")>=field("Card","y")-10.0 && field("New","y")<=field("Subtitle","y")+10.0);
        let positions=links::glyph_geometry(&doc.pages()[0]);
        if let Some(previous)=previous { assert_eq!(previous,positions,"markers must not alter flex layout"); }
        previous=Some(positions);
    }
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn inline_references_follow_the_current_paragraph_direction_and_keep_custom_labels() {
    let (engine,root)=fixture(); let project=root.join("documents/p");
    fs::write(project.join("main.md"),"---\ndir: rtl\nheading:\n  numbering: true\n---\n\n## عنوان فارسی {#target}\n\n<dir ltr>\n\nSee <ref to=\"target\"></ref> and <ref to=\"target\">custom label</ref>.\n\n<def id=\"target\">English definition.</def>\n\n</dir>\n").unwrap();
    let built=compile_as(&engine,"p","main.md",Inputs::new(),HashMap::new(),false).unwrap();
    let doc=built.document.unwrap_or_else(||panic!("{:?}",built.diagnostics.iter().map(|d|&d.message).collect::<Vec<_>>()));
    let page=serde_json::to_value(links::map_page(&doc,&doc.pages()[0])).unwrap();
    let text=page["texts"].as_array().unwrap().iter().map(|run|run["text"].as_str().unwrap_or("")).collect::<String>();
    assert!(text.contains("Section"),"{text}"); assert!(text.contains("custom label"),"{text}"); assert!(!text.contains("بخش"),"{text}");
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn pdf_provenance_preserves_repeated_words_wrapped_rows_includes_and_generated_origins() {
    let (engine,root)=fixture(); let project=root.join("documents/p");
    let words="first repeated middle repeated سلام 😀 end ".repeat(120);
    let source=format!("---\nvars:\n  count: 42\n---\n\n{words}\n\nGenerated {{{{ count }}}}.\n\n[real link](https://example.org)\n\n<include src=\"./part.md\"></include>\n");
    fs::write(project.join("main.md"),&source).unwrap();
    fs::write(project.join("part.md"),"Included repeated repeated.\n").unwrap();
    let build=|markers:&str| {
        let built=compile_as(&engine,"p","main.md",Inputs::from([("markers".into(),markers.into())]),HashMap::new(),false).unwrap();
        let doc=built.document.unwrap_or_else(||panic!("{:?}",built.diagnostics.iter().map(|d|&d.message).collect::<Vec<_>>()));
        doc.pages().iter().map(|page|(serde_json::to_value(links::map_page(&doc,page)).unwrap(),links::glyph_geometry(page))).collect::<Vec<_>>()
    };
    let mapped=build("1"); let plain=build("0");
    assert!(mapped.len()>1,"the single source line must span PDF pages");
    assert_eq!(mapped.len(),plain.len());
    for (a,b) in mapped.iter().zip(&plain) { assert_eq!(a.1,b.1,"mapping must preserve shaping and layout"); assert!(b.0["sources"].as_array().unwrap().is_empty()); assert_eq!(a.0["links"],b.0["links"],"source provenance must preserve user links"); }
    let boxes=mapped.iter().flat_map(|page|page.0["sources"].as_array().unwrap()).collect::<Vec<_>>();
    let repeats=source.match_indices("repeated").map(|(at,_)|source[..at].encode_utf16().count() as u64).collect::<Vec<_>>();
    for offset in repeats { assert!(boxes.iter().any(|b|b["source"][0]["file"]=="main.md" && b["source"][0]["utf16Start"]==offset),"missing repeated word at {offset}"); }
    let rows=boxes.iter().map(|b|b["y"].as_f64().unwrap().round() as i64).collect::<std::collections::HashSet<_>>();
    assert!(rows.len()>5,"single source line must have multiple visual-row boxes");
    assert!(boxes.iter().any(|b|b["source"][0]["file"]=="part.md"));
    let expression=source[..source.find("{{ count }}").unwrap()].encode_utf16().count() as u64;
    assert!(boxes.iter().any(|b|b["source"][0]["generated"]==true && b["source"][0]["utf16Start"]==expression));
    assert!(mapped.iter().all(|page|!page.0["links"].to_string().contains("formatex-source:")));
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn pdf_list_word_provenance_keeps_offsets_after_the_inline_marker() {
    let (engine, root) = fixture();
    let project = root.join("documents/p");
    let source = "- استفاده از هرگونه گجت ماوس بی‌سیم یا دانگل همراه، ساعت هوشمند، گوشی همراه و ... ممنوع است. در صورت مشاهده به شدت برخورد خواهد شد.\n\n1. 😀 English words after emoji **bold words** and more.\n   - Nested child words after marker.\n\n<include src=\"./part.md\"></include>\n";
    let part = "- Included list words after marker.\n";
    fs::write(project.join("main.md"), source).unwrap();
    fs::write(project.join("part.md"), part).unwrap();
    let mut previous = None;
    for markers in ["0", "1"] {
        let built = compile_as(&engine, "p", "main.md", Inputs::from([("markers".into(), markers.into())]), HashMap::new(), false).unwrap();
        let doc = built.document.unwrap_or_else(|| panic!("{:?}", built.diagnostics.iter().map(|d| &d.message).collect::<Vec<_>>()));
        let geometry = doc.pages().iter().map(links::glyph_geometry).collect::<Vec<_>>();
        if let Some(previous) = previous { assert_eq!(previous, geometry, "list mapping must preserve layout and shaping"); }
        previous = Some(geometry);
        if markers == "0" { continue; }
        let maps = doc.pages().iter().map(|page| serde_json::to_value(links::map_page(&doc, page)).unwrap()).collect::<Vec<_>>();
        let boxes = maps.iter().flat_map(|map| map["sources"].as_array().unwrap()).collect::<Vec<_>>();
        for (file, text, words) in [
            ("main.md", source, vec!["استفاده", "گجت", "ماوس", "بی‌سیم", "همراه،", "برخورد", "خواهد", "😀", "English", "after", "bold", "Nested", "child"]),
            ("part.md", part, vec!["Included", "list", "words", "after", "marker."]),
        ] {
            for word in words {
                let start = text[..text.find(word).unwrap()].encode_utf16().count() as u64;
                let end = start + word.encode_utf16().count() as u64;
                assert!(boxes.iter().any(|b| b["source"][0]["file"] == file && b["source"][0]["utf16Start"] == start && b["source"][0]["utf16End"] == end), "missing exact list word {word:?} in {file} at {start}..{end}: {boxes:?}");
            }
        }
    }
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn pdf_thematic_breaks_have_their_own_source_markers() {
    let (engine, root) = fixture();
    let project = root.join("documents/p");
    fs::write(project.join("main.md"), "Before\n\n---\n\nBetween\n\n---\n\nAfter\n\n<include src=\"./part.md\"></include>\n").unwrap();
    fs::write(project.join("part.md"), "Included before\n\n***\n\nIncluded after\n").unwrap();
    let mut previous = None;
    for enabled in ["0", "1"] {
        let built = compile_as(&engine, "p", "main.md", Inputs::from([("markers".into(), enabled.into())]), HashMap::new(), false).unwrap();
        let doc = built.document.unwrap_or_else(|| panic!("{:?}", built.diagnostics.iter().map(|d| &d.message).collect::<Vec<_>>()));
        let geometry = doc.pages().iter().map(links::glyph_geometry).collect::<Vec<_>>();
        if let Some(previous) = previous { assert_eq!(previous, geometry, "divider markers must preserve layout"); }
        previous = Some(geometry);
        let markers = links::markers(&doc);
        if enabled == "0" { assert!(markers.is_empty()); continue; }
        for (file, line) in [("main.md", 3), ("main.md", 7), ("part.md", 3)] {
            assert!(markers.iter().any(|marker| marker.file == file && marker.line == line), "missing divider marker {file}:{line}: {markers:?}");
        }
    }
    fs::remove_dir_all(root).unwrap();
}
