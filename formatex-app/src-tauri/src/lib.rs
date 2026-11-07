mod clipboard;
mod compile;
mod components;
mod engine;
mod fonts;
mod ide;
mod links;
mod packages;
mod remote;
mod themes;
mod typ_blocks;
mod watcher;
mod world;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .invoke_handler(tauri::generate_handler![
      compile::compile_project,
      compile::export_pdf,
      compile::project_preview,
      compile::project_set_root,
      watcher::project_watch,
      ide::typst_complete,
      ide::typst_jump_from_click,
      ide::typst_jump_to_cursor,
      watcher::project_unwatch,
      compile::fonts_list,
      compile::fonts_reload,
      remote::remote_sync,
      clipboard::clipboard_import,
      clipboard::clipboard_image,
      remote::remote_list,
      remote::remote_file,
      components::components_list,
      components::component_source,
      components::component_save,
      components::component_delete,
      components::component_set_enabled,
      components::engine_schema,
      components::project_schema,
      components::themes_set,
    ]);

  // Desktop-only commands and state are added to `builder` the same way, behind `#[cfg(desktop)]`

  builder
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      let engine = compile::init(app.handle())?;
      tauri::Manager::manage(app, engine);
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|_app, event| {
      // Folders that are watched are let go of before the process ends, so no directory handle is left with a read waiting on it
      if let tauri::RunEvent::Exit = event {
        watcher::stop_all();
      }
    });
}
