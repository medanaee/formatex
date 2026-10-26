# Documentation Agent Guidelines (`docs/AGENTS.md`)

The `docs/` directory is the repository's memory: architecture, decisions, specifications, design rules and the task board. This file tells agents how to navigate and maintain it.

---

## 1. Directory Map

| Path | Purpose |
| :--- | :--- |
| [`architecture.md`](architecture.md) | Layered architecture, routing, state, persistence, i18n, theming. |
| [`codebase-map.md`](codebase-map.md) | Fast lookup of every folder, module and store. |
| [`agent-workflow.md`](agent-workflow.md) | Task lifecycle, guardrails, ADR requirements, verification. |
| [`design-roles/`](design-roles) | Design rules: adaptive layout, light / dark, shadcn exclusivity, RTL. |
| [`features/`](features) | Specifications of features, each with phone / tablet / desktop sections. |
| [`decisions/`](decisions) | Chronological Architecture Decision Records (ADRs). |
| [`tasks/todo.md`](tasks/todo.md) | Task board, bugs and milestone roadmap. |

---

## 2. Core Documentation Rules

1. **English only.** All documentation, comments and ADRs are English, whatever the product UI language is.
2. **Sync on completion.** When a feature lands, a pattern is introduced or a bug is fixed, update the relevant document **before** finishing the response, and tick or add the item in [`tasks/todo.md`](tasks/todo.md).
3. **Decisions are immutable.** Never delete or reverse an ADR on your own. A superseded decision is replaced by a new, higher-numbered ADR that names the old one; the old one gets `Status: Superseded by ADR NNNN`.
4. **Links stay valid.** Use relative links (`../src/lib/platform.ts`), not absolute paths, so the docs work from any checkout.
5. **Three form factors per feature.** A document in `features/` has a distinct section for **phone**, **tablet** and **desktop** behavior (even if it is one line saying "same as tablet").
6. **Map what exists, not what is hoped for.** Planned work lives in `tasks/todo.md` or a "Planned" heading; the rest of a document describes the code as it is.
