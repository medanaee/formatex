# Agentic Workflow Guidelines (`docs/agent-workflow.md`)

## 1. Task Lifecycle

```
[Request]
   ↓
[Read ../AGENTS.md and the relevant docs/]
   ↓
[Read docs/tasks/todo.md: where is the project?]
   ↓
[Plan: write a short plan for anything that touches more than one layer]
   ↓
[Implement: adaptive (phone / tablet / desktop), RTL + LTR, light + dark, i18n]
   ↓
[Verify: npm run typecheck && npm run lint && npm test && npm run build;
         cargo check --manifest-path src-tauri/Cargo.toml  if Rust or capabilities changed]
   ↓
[Update docs/ and tick docs/tasks/todo.md]
```

## 2. Guardrails

1. **English only** in docs, comments and commit messages.
2. **Generated native code is not edited.** `src-tauri/gen/` (Android Studio / Xcode projects) is produced by the Tauri CLI and is git-ignored. Needed a native change? Do it through `tauri.conf.json`, a Tauri plugin, or Rust code in `src-tauri/src/`, and record why in an ADR.
3. **Dependency conservatism.** Do not add a heavy package when a platform primitive or a few lines will do. Check React 19 compatibility and bundle size first. Adding a dependency is mentioned in the final summary with the reason.
4. **Capabilities are least privilege.** A new Tauri permission goes into `src-tauri/capabilities/default.json` only together with the feature that needs it; filesystem scopes name exact folders.
5. **Migrations are append-only.** Never edit an applied migration in `src/lib/db/schema.ts`; add a new one and a test.
6. **Never leave the UI broken on one form factor.** Check phone (360 px), tablet (768 px) and desktop (1280 px), RTL and LTR, light and dark.
7. **Windows shell note.** Run `cargo` and `tauri` from PowerShell or cmd, not Git Bash (Git's `link.exe` shadows MSVC's).

## 3. When an ADR Is Required

A new numbered document in [`decisions/`](decisions) is required for: changing the router, state library, UI kit or CSS system; changing the storage engine or file layout; adding a native plugin or a Rust module; changing how the app is built or distributed; choosing how Typst is embedded.

Format: Status, Date, Context, Decision, Alternatives rejected, Consequences.

## 4. Definition of Done

- The four frontend commands pass; `cargo check` passes when Rust changed.
- New strings exist in both locale files.
- New UI was looked at in light and dark, RTL and LTR, at phone and desktop widths.
- Docs and `tasks/todo.md` are updated.
- The final summary says what was verified and what was not.
