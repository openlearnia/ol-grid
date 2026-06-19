## Learned User Preferences

- Prefers parallel subagents for large research and spec-writing tasks rather than a single sequential pass.
- Uses "proceed" (and similar green-light phrases) to advance to the next implementation phase without re-specifying scope.
- Expects full per-feature requirement documents with AG Grid parity, competitive analysis, REQ IDs, and testable acceptance criteria.
- Cell editing must replace only the edited cell with an inline input — never mount a duplicate row or nested row structure inside one cell.
- Edit inputs should fill the entire cell edge-to-edge; partial-size inputs with visible padding gaps are considered bugs.
- Validates grid work in the browser via the vanilla demo (`pnpm --filter @ol-grid/example-vanilla dev`).
- Wants an explicit delivery track (`PLAN.md`) mapping implementation status against requirement tiers and feature specs.
- Does not want git commits unless explicitly requested.
- Integrated charting (AG Grid Enterprise style) is out of scope for v1; external chart libraries via cell renderers or selection events is acceptable.
- Rejects flex as default column sizing; omitted width uses a 150px default — explicit `flex` is optional for fill-remaining behavior only.
- Arrow-key navigation must not change scroll unless the next focused cell is outside the visible viewport (minimal scroll only when needed).

## Learned Workspace Facts

- ol-grid is a framework-agnostic AG Grid alternative: zero-dep `@ol-grid/core`, default `@ol-grid/dom-renderer`, feature modules (e.g. `@ol-grid/sort`), thin adapters (`@ol-grid/react`, `@ol-grid/vanilla`).
- Monorepo uses pnpm workspaces + Turborepo; examples at `examples/vanilla` and `examples/react`.
- Spec hierarchy: `REQUIREMENTS.md` (product) > `requirements/*.md` (30 feature slices) > `ARCHITECTURE.md` (implementation); `PLAN.md` tracks sprint order and done-vs-required status.
- `@ol-grid/dom-renderer` theme CSS must be inlined via tsup `loader: { ".css": "text" }`; otherwise the dist import is `{}` and the grid renders as a blank box.
- Example apps resolve workspace packages from `dist/`; `predev` hooks on examples auto-build dependencies before `pnpm dev`.
- Sort lives in `@ol-grid/sort` (`SortModule`), registered via `ModuleRegistry` on engine create; core exposes the registry and row-model pipeline hooks.
- Column widths: omitted width defaults to 150px; optional `flex` fills remaining center viewport; fixed widths never shrink; center panel scrolls horizontally when total column width exceeds viewport; pinned-left and pinned-right regions supported.
- React `OlGrid` defers engine destroy via `queueMicrotask` + `aliveRef` so StrictMode effect cleanup/remount does not mount a destroyed engine.
- Product wedge vs AG Grid: MIT-licensed grouping, clipboard, SSRM, and analytics features that AG Grid gates behind Enterprise.
- Tier 1 partial: CSRM, virtualization, sort, selection, quick filter, cell editing, CSV export, pinned columns, keyboard nav, column resize/state API, custom cell renderers, React portals; column filters and SSRM not started.
