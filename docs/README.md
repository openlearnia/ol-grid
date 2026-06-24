# ol-grid documentation

Developer-facing docs for migrating from AG Grid and using the public API.

| Document | Description |
|----------|-------------|
| [MIGRATION.md](./MIGRATION.md) | AG Grid → ol-grid deltas (Sprint 9 draft) |
| [API reference](./api/index.html) | Generated TypeDoc (`pnpm docs`) |

**Product specs** (not duplicated here): [REQUIREMENTS.md](../REQUIREMENTS.md), [requirements/](../requirements/), [ARCHITECTURE.md](../ARCHITECTURE.md), [PLAN.md](../PLAN.md).

## Generate API docs

```bash
pnpm docs          # write HTML to docs/api/
pnpm docs:watch    # rebuild on source changes
```

Open `docs/api/index.html` in a browser after generation.
