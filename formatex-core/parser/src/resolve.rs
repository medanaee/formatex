use serde_json::{Map, Value};

fn merge(into: &mut Map<String, Value>, values: &Map<String, Value>) {
    for (key, value) in values {
        if let (Some(Value::Object(old)), Value::Object(new)) = (into.get_mut(key), value) { merge(old, new); }
        else { into.insert(key.clone(), value.clone()); }
    }
}

pub fn dotted(values: &Map<String, Value>) -> Map<String, Value> {
    fn put(into: &mut Map<String, Value>, keys: &[&str], value: Value) {
        if keys.is_empty() { return; }
        if keys.len() == 1 { into.insert(keys[0].into(), value); return; }
        let object = into.entry(keys[0]).or_insert_with(|| Value::Object(Map::new()));
        if let Some(object) = object.as_object_mut() { put(object, &keys[1..], value); }
    }
    let mut out = Map::new();
    for (key, value) in values { put(&mut out, &key.split('.').collect::<Vec<_>>(), value.clone()); }
    out
}

/// Each layer applies common values then its backend override, before the next layer.
pub fn resolve(backend: &str, specs: &Map<String, Value>, layers: &[Map<String, Value>]) -> Result<Map<String, Value>, (String, String)> {
    let mut out = Map::new();
    for (name, spec) in specs {
        let domain = spec.get("domain").and_then(Value::as_str);
        if domain.is_none() || domain == Some("shared") || domain == Some(backend) { if let Some(default) = spec.get("default") { out.insert(name.clone(), default.clone()); } }
    }
    for layer in layers {
        let expanded = dotted(layer);
        for (name, value) in &expanded {
            if name == "html" || name == "typ" || name.starts_with('_') { continue; }
            let Some(spec) = specs.get(name) else {
                if value == &Value::Bool(true) {
                    if let Some((property, _)) = specs.iter().find(|(_, spec)| spec.get("bare").and_then(Value::as_bool) == Some(true) && spec.get("values").and_then(Value::as_array).is_some_and(|values| values.iter().any(|value| value.as_str() == Some(name)))) {
                        out.insert(property.clone(), name.clone().into()); continue;
                    }
                }
                return Err((name.clone(), format!("Unknown property {name}")));
            };
            if let Some(domain) = spec.get("domain").and_then(Value::as_str).filter(|domain| *domain != "shared") { return Err((name.clone(), format!("Use {domain}.{name}; this property is output-specific"))); }
            out.insert(name.clone(), value.clone());
        }
        if let Some(Value::Object(overrides)) = expanded.get(backend) {
            for (name, value) in overrides {
                let Some(spec) = specs.get(name) else { return Err((format!("{backend}.{name}"), format!("Unknown property {backend}.{name}"))); };
                if spec.get("domain").and_then(Value::as_str).is_some_and(|domain| domain != "shared" && domain != backend) { return Err((format!("{backend}.{name}"), format!("{name} is not supported by {backend}"))); }
                out.insert(name.clone(), value.clone());
            }
        }
    }
    for (name, spec) in specs {
        if spec.get("domain").and_then(Value::as_str).is_some_and(|domain| domain != "shared" && domain != backend) { out.remove(name); continue; }
        let Some(value) = out.get_mut(name) else {
            if spec.get("required").and_then(Value::as_bool) == Some(true) { return Err((name.clone(), format!("Missing required property {name}"))); }
            continue;
        };
        let raw = value.as_str().map(str::to_owned);
        match spec.get("type").and_then(Value::as_str).unwrap_or("string") {
            "bool" => if !value.is_boolean() {
                *value = match raw.as_deref() { Some("true") => true.into(), Some("false") => false.into(), _ => return Err((name.clone(), format!("{name} must be true or false"))) };
            },
            "int" => if !value.is_i64() && !value.is_u64() { *value = raw.and_then(|value| value.parse::<i64>().ok()).map(Value::from).ok_or_else(|| (name.clone(), format!("{name} must be an integer")))?; },
            "number" => if !value.is_number() { *value = raw.and_then(|value| value.parse::<f64>().ok()).and_then(serde_json::Number::from_f64).map(Value::Number).ok_or_else(|| (name.clone(), format!("{name} must be a number")))?; },
            "enum" => if let Some(choices) = spec.get("values").and_then(Value::as_array) { if !choices.contains(value) { return Err((name.clone(), format!("Invalid {name}: {value}; expected one of {}", choices.iter().map(Value::to_string).collect::<Vec<_>>().join(", ")))); } },
            _ => {},
        }
    }
    Ok(out)
}

pub fn layers(settings: &Map<String, Value>, name: &str, local: &Map<String, Value>) -> Vec<Map<String, Value>> {
    let project = settings.get("_project").and_then(Value::as_object);
    let document = settings.get("_document").and_then(Value::as_object);
    let domain = |settings: &Map<String, Value>| {
        let mut table = if matches!(name, "html" | "typ") { Map::new() } else { settings.get(name).and_then(Value::as_object).cloned().unwrap_or_default() };
        for backend in ["html", "typ"] { if let Some(value) = settings.get(backend).and_then(|value| value.get(name)).and_then(Value::as_object) { table.insert(backend.into(), Value::Object(value.clone())); } }
        table
    };
    let mut result = if project.is_some() || document.is_some() { project.into_iter().chain(document).map(domain).collect() } else { vec![domain(settings)] };
    result.push(local.clone()); result
}

pub fn merge_settings(base: &Map<String, Value>, over: &Map<String, Value>) -> Map<String, Value> { let mut out = base.clone(); merge(&mut out, over); out }

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn local_common_beats_project_backend_and_exclusive_values_require_namespace() {
        let specs = json!({"numbering":{"type":"bool","default":true},"copy-button":{"type":"bool","domain":"html"}}).as_object().unwrap().clone();
        let values = vec![json!({"html.numbering":false,"html.copy-button":true}).as_object().unwrap().clone(), json!({"numbering":true}).as_object().unwrap().clone()];
        assert_eq!(resolve("html", &specs, &values).unwrap(), json!({"numbering":true,"copy-button":true}).as_object().unwrap().clone());
        assert_eq!(resolve("typ", &specs, &values).unwrap(), json!({"numbering":true}).as_object().unwrap().clone());
        assert!(resolve("html", &specs, &[json!({"copy-button":true}).as_object().unwrap().clone()]).is_err());
    }
}
