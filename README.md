# ol-grid

Framework-agnostic data grid library — an open, MIT-licensed alternative to AG Grid.

ol-grid combines a **headless core** (zero runtime dependencies) with a **default DOM renderer** and thin framework adapters for React, Vue, Angular, Svelte, and vanilla JS.

## Status

**Phase 1 (MVP) — in progress.** Package boundaries and core types are scaffolded; virtualization, sorting, and full rendering land next.

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [REQUIREMENTS.md](./REQUIREMENTS.md) for the full spec.

## Packages

| Package | Description |
|---------|-------------|
| `@ol-grid/core` | Grid engine: store, column/row models, virtualizer |
| `@ol-grid/dom-renderer` | Default DOM virtualization renderer |
| `@ol-grid/react` | React adapter (`OlGrid`, `useOlGrid`) |
| `@ol-grid/vanilla` | `createGrid()` for vanilla JS |

## Quick start

```bash
pnpm install
pnpm build
pnpm --filter @ol-grid/example-vanilla dev
```

Open the URL Vite prints (default `http://localhost:5173`). The demo logs `grid ready` and renders an empty grid shell.

## Development

```bash
pnpm install          # install all workspace deps
pnpm build            # build all packages (turbo)
pnpm dev              # run dev servers (examples)
pnpm test             # run vitest
pnpm typecheck        # typecheck all packages
```

## License

MIT
