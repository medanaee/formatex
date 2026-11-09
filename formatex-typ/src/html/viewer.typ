// The viewer of the HTML output: a slim toolbar (zoom, theme, feel), a reading-progress line and an outline sidebar on the right.
// Everything is drawn by this file's own CSS and script (no native controls, no network: the file stays one file). Each part is chosen in the
// export dialog (`--input html-toolbar=true`, `html-progress`, `html-outline`). Nothing here is used by the PDF.
#import "/src/core.typ": *
#import "/src/html/kit.typ": css-px

/// An option of the HTML output: the build input `html-<key>` (the export dialog, one export) wins over `[html]` of config.toml, then `true`.
#let html-option(key) = {
  let input = sys.inputs.at("html-" + key, default: none)
  if input != none { input == "true" } else {
    let table = config.at("html", default: (:))
    let value = if type(table) == dictionary { table.at(key, default: true) } else { true }
    value == true
  }
}
#let viewer-on(key) = html-option(key)
#let want-toolbar = viewer-on("toolbar")
#let want-progress = viewer-on("progress")
#let want-outline = viewer-on("outline")

/// The fonts of a feel as the page's font stack: the feel's own, unless config.toml names them (`[font]` always wins, as in the PDF).
#let feel-fonts(f) = (font-config.at("latin", default: f.latin), font-config.at("persian", default: f.persian))
#let feel-body-stack(f) = {
  let (latin, persian) = feel-fonts(f)
  (latin, persian).map(n => "\"" + n + "\"").join(", ") + ", " + if latin == "New Computer Modern" { "serif" } else { "system-ui, sans-serif" }
}
/// The families the toolbar's feel menu can switch to: their font files go in the page too, or the switch would fall back to other fonts
#let feel-font-families = if want-toolbar { feels.values().map(feel-fonts).flatten() } else { () }

/// What the script needs to switch the look: every theme's colors, every feel's corners and table form, and what this page started with.
#let viewer-data() = {
  let hex(c) = rgb(c).to-hex()
  let custom-heading = heading-key("color", "") != ""
  let theme-data = (:)
  for (name, t) in all-themes {
    theme-data.insert(name, (
      dark: t.dark, bg: hex(t.bg), fg: hex(t.fg), heading: if custom-heading { hex(heading-color) } else { hex(t.heading) }, muted: hex(t.muted),
      accent: hex(t.accent), secondary: hex(t.secondary), rule: hex(t.rule), "code-bg": hex(t.code-bg), "code-stroke": hex(t.code-stroke),
    ))
  }
  let feel-data = (:)
  for (name, f) in feels {
    feel-data.insert(name, (
      "r-code": css-px(f.code), "r-inline": css-px(f.inline), "r-badge": css-px(f.badge), "r-alert": css-px(f.alert),
      "r-box": css-px(f.box), "r-image": css-px(f.image), "r-heading": css-px(f.heading), table: f.table, "font-body": feel-body-stack(f),
    ))
  }
  json.encode((
    themes: theme-data, feels: feel-data, theme: theme-name, feel: feel-name, zoom: zoom,
    toolbar: want-toolbar, progress: want-progress, outline: want-outline,
  ))
}

#let viewer-css = `````css
.fxv-bar, .fxv-bar *, .fxv-side, .fxv-side *, .fxv-menu, .fxv-menu *, .fxv-fab { box-sizing: border-box; font-family: var(--font-body); line-height: 1.4; }
.fxv-bar { position: fixed; top: 0; left: 0; right: 0; height: 40px; z-index: 50; display: flex; align-items: center; gap: 2px; padding: 0 8px; font-size: 13px; color: var(--fg); background: color-mix(in srgb, var(--bg) 86%, transparent); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border-bottom: 1px solid var(--code-stroke); }
.fxv-grow { flex: 1; }
.fxv-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 32px; height: 32px; padding: 0 6px; margin: 0; border: 0; border-radius: 8px; background: transparent; color: var(--muted); font: inherit; font-size: 12px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.fxv-btn:hover, .fxv-btn[aria-expanded="true"], .fxv-btn[aria-pressed="true"] { background: var(--code-bg); color: var(--fg); }
.fxv-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.fxv-btn:disabled { opacity: .35; cursor: default; background: transparent; }
.fxv-btn svg { width: 16px; height: 16px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.fxv-pct { min-width: 44px; font-variant-numeric: tabular-nums; direction: ltr; }
.fxv-btn[data-dirty]::after { content: ""; position: absolute; top: 4px; inset-inline-end: 4px; width: 7px; height: 7px; border-radius: 50%; background: #e5484d; box-shadow: 0 0 0 2px var(--bg); }
.fxv-menu-sep { height: 1px; margin: 4px 2px; background: var(--code-stroke); }
.fxv-item:disabled { opacity: .4; cursor: default; }
.fxv-item:disabled:hover { background: transparent; }
.fxv-item svg { width: 16px; height: 16px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.fxv-sep { width: 1px; height: 16px; background: var(--code-stroke); margin: 0 4px; }
.fxv-read { direction: ltr; font-variant-numeric: tabular-nums; color: var(--muted); font-size: 12px; padding: 0 6px; }
.fxv-line { position: fixed; top: 0; left: 0; right: 0; height: 2px; z-index: 60; background: transparent; pointer-events: none; }
.fxv-line > i { display: block; height: 100%; width: 100%; background: var(--accent); transform-origin: 0 50%; transform: scaleX(0); }
.fxv-menu { position: fixed; z-index: 70; min-width: 170px; max-width: calc(100vw - 16px); padding: 4px; border: 1px solid var(--code-stroke); border-radius: 10px; background: var(--bg); color: var(--fg); font-size: 13px; box-shadow: 0 8px 24px rgba(0, 0, 0, .14); }
.fxv-menu[hidden] { display: none; }
.fxv-item { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 34px; padding: 0 10px; border: 0; border-radius: 7px; background: transparent; color: inherit; font: inherit; text-align: start; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.fxv-item:hover { background: var(--code-bg); }
.fxv-item[aria-checked="true"] { background: var(--code-bg); font-weight: 700; }
.fxv-item:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.fxv-sw { display: inline-flex; width: 18px; height: 18px; flex: none; border-radius: 50%; border: 1px solid var(--code-stroke); overflow: hidden; }
.fxv-sw > i { flex: 1; }
.fxv-label { flex: 1; min-width: 0; }
.fxv-feel-icon { width: 18px; height: 18px; flex: none; border: 2px solid currentColor; opacity: .7; }
.fxv-side { position: fixed; top: 0; right: 0; bottom: 0; width: 272px; max-width: 86vw; z-index: 40; padding: 48px 10px 24px; overflow-y: auto; overscroll-behavior: contain; background: var(--bg); border-left: 1px solid var(--code-stroke); font-size: 13px; transition: transform .2s ease; }
.fxv-side[data-open="false"] { transform: translateX(105%); visibility: hidden; transition: transform .2s ease, visibility 0s .2s; }
.fxv-side h2 { margin: 0 0 8px; padding: 0 8px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); background: none; border: 0; }
.fxv-link { display: block; padding: 6px 8px; margin: 1px 0; border-radius: 7px; color: var(--muted); text-decoration: none; unicode-bidi: plaintext; overflow-wrap: anywhere; border-inline-start: 2px solid transparent; }
.fxv-link:hover { background: var(--code-bg); color: var(--fg); }
.fxv-link[aria-current="true"] { color: var(--fg); font-weight: 700; background: var(--code-bg); border-inline-start-color: var(--accent); }
.fxv-shade { position: fixed; inset: 0; z-index: 35; background: rgba(0, 0, 0, .35); }
.fxv-shade[hidden] { display: none; }
.fxv-fab { position: fixed; top: 8px; right: 8px; z-index: 45; }
html.fxv-has-bar body { padding-top: 40px; }
html.fxv-has-bar .fx-doc h1, html.fxv-has-bar .fx-doc h2, html.fxv-has-bar .fx-doc h3, html.fxv-has-bar .fx-doc h4, html.fxv-has-bar .fx-doc h5, html.fxv-has-bar .fx-doc h6 { scroll-margin-top: 56px; }
.fx-doc h1, .fx-doc h2, .fx-doc h3, .fx-doc h4, .fx-doc h5, .fx-doc h6 { scroll-margin-top: 16px; }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } .fxv-side { transition: none; } }
@media (min-width: 1100px) {
  html.fxv-docked body { padding-right: 272px; }
  html.fxv-docked .fxv-shade { display: none; }
  .fxv-bar { right: 0; }
  html.fxv-docked .fxv-bar { right: 272px; }
  .fxv-side { z-index: 55; padding-top: 48px; }
}
@media (max-width: 1099px) {
  .fxv-side { box-shadow: 0 0 40px rgba(0, 0, 0, .25); padding-top: 52px; }
  .fxv-side[data-open="false"] { box-shadow: none; }
  .fxv-link { padding: 10px 10px; font-size: 14px; }
}
@media (max-width: 520px) { .fxv-sep { display: none; } .fxv-pct { min-width: 40px; } .fxv-bar { padding: 0 4px; } }
@media (pointer: coarse) { .fxv-btn { min-width: 40px; height: 40px; } .fxv-item { min-height: 44px; } html.fxv-has-bar body { padding-top: 48px; } .fxv-bar { height: 48px; } html.fxv-has-bar .fx-doc h1, html.fxv-has-bar .fx-doc h2, html.fxv-has-bar .fx-doc h3, html.fxv-has-bar .fx-doc h4 { scroll-margin-top: 64px; } .fxv-side { padding-top: 56px; } }
html[data-fxv-flip] .fx-code pre, html[data-fxv-flip] .fx-frame svg, html[data-fxv-flip] .fx-icon svg { filter: invert(1) hue-rotate(180deg); }
html[data-fxv-flip] .fx-code pre { color: var(--fxv-pre); }
html[data-fx-table="rules"] .fx-table { border: 0; border-radius: 0; }
html[data-fx-table="rules"] .fx-table table { border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
html[data-fx-table="rules"] .fx-table thead th { border-bottom: 1px solid var(--rule); background: none; }
html[data-fx-table="rules"] .fx-table tbody td, html[data-fx-table="rules"] .fx-table tbody tr:nth-child(even) td { border-top: 0; background: none; }
html[data-fx-table="rules"] .fx-table th, html[data-fx-table="rules"] .fx-table td { padding: .6em .8em; }
html[data-fx-table="lined"] .fx-table { border: 1px solid var(--code-stroke); border-radius: var(--r-box); }
html[data-fx-table="lined"] .fx-table table { border: 0; }
html[data-fx-table="lined"] .fx-table thead th { border-bottom: 0; background: color-mix(in srgb, var(--secondary) 8%, var(--bg)); }
html[data-fx-table="lined"] .fx-table tbody td { border-top: 1px solid var(--code-stroke); background: none; }
html[data-fx-table="lined"] .fx-table tbody tr:nth-child(even) td { background: none; }
html[data-fx-table="lined"] .fx-table th, html[data-fx-table="lined"] .fx-table td { padding: .6em .8em; }
html[data-fx-table="card"] .fx-table { border: 1px solid var(--code-stroke); border-radius: var(--r-box); }
html[data-fx-table="card"] .fx-table table { border: 0; }
html[data-fx-table="card"] .fx-table thead th { border-bottom: 0; background: color-mix(in srgb, var(--secondary) 16%, var(--bg)); }
html[data-fx-table="card"] .fx-table tbody td { border-top: 0; background: none; }
html[data-fx-table="card"] .fx-table tbody tr:nth-child(even) td { background: var(--code-bg); }
html[data-fx-table="card"] .fx-table th, html[data-fx-table="card"] .fx-table td { padding: .8em 1.3em; }
@media print { .fxv-bar, .fxv-line, .fxv-side, .fxv-menu, .fxv-shade, .fxv-fab { display: none !important; } html.fxv-has-bar body, html.fxv-docked body { padding: 0; } }
`````.text

#let viewer-script = `````js
(function () {
  var dataNode = document.getElementById("fx-viewer-data");
  if (!dataNode) return;
  var data = JSON.parse(dataNode.textContent);
  var root = document.documentElement;
  var fa = (root.lang || "en").slice(0, 2) === "fa";
  var text = fa
    ? { outline: "فهرست", zoomIn: "بزرگ‌تر", zoomOut: "کوچک‌تر", theme: "تم", feel: "حال‌وهوا", read: "خوانده‌شده", close: "بستن", reset: "بازگشت به پیش‌فرض", zoom: "اندازهٔ متن (بازگشت به پیش‌فرض)" }
    : { outline: "Outline", zoomIn: "Zoom in", zoomOut: "Zoom out", theme: "Theme", feel: "Feel", read: "Read", close: "Close", reset: "Back to default", zoom: "Text size (back to default)" };
  var themeNames = fa
    ? { paper: "کاغذ", sepia: "سپیا", ocean: "اقیانوس", sage: "سبز", midnight: "نیمه‌شب", nord: "نورد", zinc: "خاکستری", dracula: "دراکولا" }
    : {};
  var feelNames = fa ? { formal: "رسمی", standard: "استاندارد", friendly: "صمیمی" } : { formal: "Formal", standard: "Standard", friendly: "Friendly" };
  var icons = {
    list: "<path d='M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'/>",
    minus: "<path d='M5 12h14'/>",
    plus: "<path d='M5 12h14M12 5v14'/>",
    palette: "<circle cx='13.5' cy='6.5' r='1'/><circle cx='17.5' cy='10.5' r='1'/><circle cx='8.5' cy='7.5' r='1'/><circle cx='6.5' cy='12.5' r='1'/><path d='M12 22a10 10 0 1 1 10-10c0 3-2 4-4.5 4H15a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 22z'/>",
    x: "<path d='M18 6 6 18M6 6l12 12'/>",
    undo: "<path d='M3 7v6h6'/><path d='M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13'/>"
  };
  function icon(name) { return "<svg viewBox='0 0 24 24' aria-hidden='true'>" + icons[name] + "</svg>"; }
  function el(tag, cls, attrs) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    for (var key in attrs || {}) node.setAttribute(key, attrs[key]);
    return node;
  }
  function button(name, label) {
    var b = el("button", "fxv-btn", { type: "button", "aria-label": label, title: label });
    b.innerHTML = icon(name);
    return b;
  }
  // What the reader changed is kept in this browser (an empty value is "back to the page's own"). In the app's preview frame there is no storage:
  // the app keeps the choices and gives them back in `window.__fxViewerState` after a rebuild.
  var store = {
    get: function (key) {
      try { var saved = localStorage.getItem("fxv-" + key); if (saved !== null) return saved; } catch (e) {}
      var given = window.__fxViewerState && window.__fxViewerState[key];
      return given === undefined ? null : String(given);
    },
    set: function (key, value) {
      try { if (value === "") localStorage.removeItem("fxv-" + key); else localStorage.setItem("fxv-" + key, value); } catch (e) {}
      try { if (window.parent !== window) window.parent.postMessage({ fxViewerState: { key: key, value: String(value) } }, "*"); } catch (e) {}
    }
  };

  // ---- the look: theme, feel, zoom ----
  var baseDark = data.themes[data.theme].dark;
  var state = { theme: data.theme, feel: data.feel, zoom: data.zoom };
  var savedTheme = store.get("theme"), savedFeel = store.get("feel"), savedZoom = parseFloat(store.get("zoom"));
  if (savedTheme && data.themes[savedTheme]) state.theme = savedTheme;
  if (savedFeel && data.feels[savedFeel]) state.feel = savedFeel;
  if (savedZoom > 0) state.zoom = savedZoom;

  function invert(hex) {
    var n = parseInt(hex.slice(1), 16);
    return "#" + ("000000" + (0xffffff - n).toString(16)).slice(-6);
  }
  function applyTheme(name) {
    var t = data.themes[name];
    state.theme = name;
    ["bg", "fg", "heading", "muted", "accent", "secondary", "rule", "code-bg", "code-stroke"].forEach(function (key) { root.style.setProperty("--" + key, t[key]); });
    root.style.setProperty("color-scheme", t.dark ? "dark" : "light");
    var tint = t.dark ? ["16%", "45%", "70%", "white", "0%", "22%", "50%", "transparent"] : ["10%", "35%", "85%", "black", "30%", "100%", "60%", "var(--fg)"];
    ["tf", "tb", "ic-pct", "ic-with", "ink-fg", "hf", "hb", "hb-with"].forEach(function (key, i) { root.style.setProperty("--" + key, tint[i]); });
    root.style.setProperty("--fxv-pre", invert(t.fg));
    if (t.dark !== baseDark) root.setAttribute("data-fxv-flip", ""); else root.removeAttribute("data-fxv-flip");
    refreshDirty();
  }
  function applyFeel(name) {
    var f = data.feels[name];
    state.feel = name;
    for (var key in f) if (key.indexOf("r-") === 0) root.style.setProperty("--" + key, f[key]);
    root.setAttribute("data-fx-table", f.table);
    root.style.setProperty("--font-body", f["font-body"]);
    refreshDirty();
  }
  var zoomMin = 0.7, zoomMax = 1.8;
  function applyZoom(value) {
    state.zoom = Math.min(zoomMax, Math.max(zoomMin, Math.round(value * 100) / 100));
    root.style.setProperty("--zoom", String(state.zoom));
    if (pct) pct.textContent = Math.round((state.zoom / data.zoom) * 100) + "%";
    refreshDirty();
    if (zin) zin.disabled = state.zoom >= zoomMax - 0.001;
    if (zout) zout.disabled = state.zoom <= zoomMin + 0.001;
  }
  var pct = null, zin = null, zout = null, themeButton = null, feelButton = null;
  // A small red dot on a setting the reader changed from the page's own (the theme and the feel it was built with, the normal text size)
  function refreshDirty() {
    var mark = function (node, dirty) { if (!node) return; if (dirty) node.setAttribute("data-dirty", ""); else node.removeAttribute("data-dirty"); };
    mark(themeButton, state.theme !== data.theme);
    mark(feelButton, state.feel !== data.feel);
    mark(pct, Math.abs(state.zoom - data.zoom) > 0.001);
  }
  function resetItem(menu, dirty, reset) {
    menu.appendChild(el("div", "fxv-menu-sep"));
    var item = el("button", "fxv-item", { type: "button", role: "menuitem" });
    item.disabled = !dirty;
    item.innerHTML = icon("undo") + "<span class='fxv-label'></span>";
    item.querySelector(".fxv-label").textContent = text.reset;
    item.addEventListener("click", function () { reset(); closeMenu(); });
    menu.appendChild(item);
  }

  // ---- menus ----
  var openMenu = null;
  function closeMenu() {
    if (!openMenu) return;
    openMenu.menu.hidden = true;
    openMenu.trigger.setAttribute("aria-expanded", "false");
    openMenu = null;
  }
  function makeMenu(trigger, build) {
    var menu = el("div", "fxv-menu", { role: "menu" });
    menu.hidden = true;
    document.body.appendChild(menu);
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      if (openMenu && openMenu.menu === menu) { closeMenu(); return; }
      closeMenu();
      build(menu);
      menu.hidden = false;
      var box = trigger.getBoundingClientRect();
      var width = menu.offsetWidth;
      var left = Math.min(Math.max(8, box.right - width), window.innerWidth - width - 8);
      menu.style.left = left + "px";
      menu.style.top = (box.bottom + 6) + "px";
      menu.style.maxHeight = (window.innerHeight - box.bottom - 16) + "px";
      menu.style.overflowY = "auto";
      trigger.setAttribute("aria-expanded", "true");
      openMenu = { menu: menu, trigger: trigger };
      var current = menu.querySelector("[aria-checked='true']") || menu.querySelector("button");
      if (current) current.focus({ preventScroll: true });
    });
    menu.addEventListener("click", function (event) { event.stopPropagation(); });
  }
  document.addEventListener("click", closeMenu);
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") { closeMenu(); if (!docked()) setOutline(false); } });
  window.addEventListener("resize", closeMenu);

  // ---- the page ----
  var bar = null, fab = null;
  if (data.toolbar) {
    bar = el("div", "fxv-bar", { role: "toolbar" });
    root.classList.add("fxv-has-bar");
  }
  var outlineButton = null;
  if (data.outline) {
    outlineButton = button("list", text.outline);
    outlineButton.setAttribute("aria-pressed", "false");
  }

  if (bar) {
    if (outlineButton) bar.appendChild(outlineButton);
    var readout = el("span", "fxv-read");
    if (data.progress) bar.appendChild(readout);
    bar.appendChild(el("span", "fxv-grow"));
    zout = button("minus", text.zoomOut);
    pct = el("button", "fxv-btn fxv-pct", { type: "button", title: text.zoom, "aria-label": text.zoom });
    pct.addEventListener("click", function () { applyZoom(data.zoom); store.set("zoom", ""); updateSpy(); });
    zin = button("plus", text.zoomIn);
    bar.appendChild(zout); bar.appendChild(pct); bar.appendChild(zin);
    bar.appendChild(el("span", "fxv-sep"));
    themeButton = button("palette", text.theme);
    feelButton = button("palette", text.feel);
    feelButton.innerHTML = "<svg viewBox='0 0 24 24' aria-hidden='true'><rect x='4' y='4' width='16' height='16' rx='6'/></svg>";
    bar.appendChild(themeButton); bar.appendChild(feelButton);
    document.body.appendChild(bar);
    zout.addEventListener("click", function () { applyZoom(state.zoom - 0.1); store.set("zoom", Math.abs(state.zoom - data.zoom) < 0.001 ? "" : state.zoom); updateSpy(); });
    zin.addEventListener("click", function () { applyZoom(state.zoom + 0.1); store.set("zoom", Math.abs(state.zoom - data.zoom) < 0.001 ? "" : state.zoom); updateSpy(); });

    makeMenu(themeButton, function (menu) {
      menu.innerHTML = "";
      Object.keys(data.themes).forEach(function (name) {
        var t = data.themes[name];
        var item = el("button", "fxv-item", { type: "button", role: "menuitemradio", "aria-checked": String(name === state.theme) });
        var sw = el("span", "fxv-sw");
        sw.style.background = t.bg;
        sw.innerHTML = "<i style='background:" + t.bg + "'></i><i style='background:" + t.accent + "'></i>";
        var label = el("span", "fxv-label");
        label.textContent = themeNames[name] || (name.charAt(0).toUpperCase() + name.slice(1));
        item.appendChild(sw); item.appendChild(label);
        item.addEventListener("click", function () { applyTheme(name); store.set("theme", name === data.theme ? "" : name); closeMenu(); });
        menu.appendChild(item);
      });
      resetItem(menu, state.theme !== data.theme, function () { applyTheme(data.theme); store.set("theme", ""); });
    });
    makeMenu(feelButton, function (menu) {
      menu.innerHTML = "";
      Object.keys(data.feels).forEach(function (name) {
        var f = data.feels[name];
        var item = el("button", "fxv-item", { type: "button", role: "menuitemradio", "aria-checked": String(name === state.feel) });
        var shape = el("span", "fxv-feel-icon");
        shape.style.borderRadius = f["r-box"] === "0px" ? "0" : (parseFloat(f["r-box"]) > 10 ? "9px" : "4px");
        var label = el("span", "fxv-label");
        label.textContent = feelNames[name] || name;
        item.appendChild(shape); item.appendChild(label);
        item.addEventListener("click", function () { applyFeel(name); store.set("feel", name === data.feel ? "" : name); closeMenu(); });
        menu.appendChild(item);
      });
      resetItem(menu, state.feel !== data.feel, function () { applyFeel(data.feel); store.set("feel", ""); });
    });
  }

  var line = null, fill = null;
  if (data.progress) {
    line = el("div", "fxv-line", { role: "progressbar", "aria-label": text.read, "aria-valuemin": "0", "aria-valuemax": "100" });
    fill = el("i");
    line.appendChild(fill);
    document.body.appendChild(line);
  }

  // ---- the outline ----
  var side = null, shade = null, links = [], heads = [];
  function docked() { return window.matchMedia("(min-width: 1100px)").matches; }
  function setOutline(open, remember) {
    if (!side) return;
    side.setAttribute("data-open", String(open));
    if (outlineButton) outlineButton.setAttribute("aria-pressed", String(open));
    if (fab) fab.setAttribute("aria-pressed", String(open));
    root.classList.toggle("fxv-docked", open && docked());
    shade.hidden = !(open && !docked());
    if (remember && docked()) store.set("outline", open ? "1" : "0");
  }
  if (data.outline) {
    var nodes = document.querySelectorAll(".fx-doc h1, .fx-doc h2, .fx-doc h3, .fx-doc h4");
    var minLevel = 6;
    for (var i = 0; i < nodes.length; i++) minLevel = Math.min(minLevel, parseInt(nodes[i].tagName.charAt(1), 10));
    side = el("nav", "fxv-side", { "aria-label": text.outline, "data-open": "false" });
    shade = el("div", "fxv-shade");
    shade.hidden = true;
    var title = el("h2");
    title.textContent = text.outline;
    side.appendChild(title);
    for (var j = 0; j < nodes.length; j++) {
      var h = nodes[j];
      if (h.closest(".fx-toc")) continue;
      var label = (h.textContent || "").replace(/\s+/g, " ").trim();
      if (!label) continue;
      if (!h.id) h.id = "fxv-h" + j;
      var a = el("a", "fxv-link", { href: "#" + h.id });
      a.style.paddingInlineStart = (8 + (parseInt(h.tagName.charAt(1), 10) - minLevel) * 14) + "px";
      a.textContent = label;
      a.addEventListener("click", function (event) {
        var target = document.getElementById(this.getAttribute("href").slice(1));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ block: "start" });
        if (!docked()) setOutline(false);
      });
      side.appendChild(a);
      links.push(a); heads.push(h);
    }
    if (!links.length) { side = null; shade = null; if (outlineButton) { outlineButton.remove(); outlineButton = null; } }
  }
  if (side) {
    document.body.appendChild(shade); document.body.appendChild(side);
    shade.addEventListener("click", function () { setOutline(false); });
    var toggle = function () { setOutline(side.getAttribute("data-open") !== "true", true); };
    if (outlineButton) outlineButton.addEventListener("click", toggle);
    else {
      fab = button("list", text.outline);
      fab.classList.add("fxv-fab");
      fab.setAttribute("aria-pressed", "false");
      fab.addEventListener("click", toggle);
      document.body.appendChild(fab);
    }
    var saved = store.get("outline");
    setOutline(docked() && saved !== "0");
    window.matchMedia("(min-width: 1100px)").addEventListener("change", function () { setOutline(docked() && store.get("outline") !== "0"); });
  }

  // ---- reading position ----
  var activeIndex = -1, ticking = false;
  function updateSpy() {
    ticking = false;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var ratio = Math.min(1, Math.max(0, window.scrollY / max));
    if (fill) { fill.style.transform = "scaleX(" + ratio + ")"; line.setAttribute("aria-valuenow", String(Math.round(ratio * 100))); }
    if (data.progress && typeof readout !== "undefined") readout.textContent = Math.round(ratio * 100) + "%";
    if (!links.length) return;
    var offset = 90, index = -1;
    for (var k = 0; k < heads.length; k++) { if (heads[k].getBoundingClientRect().top <= offset) index = k; else break; }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) index = heads.length - 1;
    if (index === activeIndex) return;
    if (activeIndex >= 0) links[activeIndex].removeAttribute("aria-current");
    activeIndex = index;
    if (index >= 0) {
      var current = links[index];
      current.setAttribute("aria-current", "true");
      if (side.getAttribute("data-open") === "true") {
        var top = current.offsetTop, view = side.clientHeight;
        if (top < side.scrollTop + 40 || top > side.scrollTop + view - 60) side.scrollTop = Math.max(0, top - view / 3);
      }
    }
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(updateSpy); } }, { passive: true });
  window.addEventListener("resize", updateSpy);

  applyTheme(state.theme);
  applyFeel(state.feel);
  applyZoom(state.zoom);
  updateSpy();
})();
`````.text

/// The parts of the viewer the export dialog turned on: the data, the style and the script (nothing at all when none is on).
#let viewer-parts() = if want-toolbar or want-progress or want-outline {
  html.elem("script", attrs: (type: "application/json", id: "fx-viewer-data"), viewer-data())
  html.elem("style", viewer-css)
  html.elem("script", viewer-script)
}
