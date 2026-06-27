# @ol-grid/tempo

Tree-shakable date and time utilities built on `Intl.DateTimeFormat`. This package vendors [FormKit Tempo](https://github.com/formkit/tempo) v1.1.0 (MIT) as `@ol-grid/tempo` for use across the ol-grid monorepo.

## Attribution

- **Upstream:** [formkit/tempo](https://github.com/formkit/tempo) — Copyright (c) 2023-present FormKit, Inc.
- **License:** MIT — see [LICENSE](./LICENSE).

## Install

Workspace package — depend via `workspace:*` in the monorepo:

```json
{
  "dependencies": {
    "@ol-grid/tempo": "workspace:*"
  }
}
```

## Usage

```ts
import { format, parse, sameDay, dayStart, dayEnd } from "@ol-grid/tempo";

const d = parse("2020-06-15", "YYYY-MM-DD");
format(d, "long"); // locale-aware long date
sameDay(d, dayStart(new Date())); // boolean
```

See upstream docs at https://tempo.formkit.com for the full API (`add`, `diff`, `tzDate`, `parts`, `range`, etc.).

## ol-grid integration (planned)

`@ol-grid/filter` date filtering (`date-filter.ts`) uses ad-hoc `Date.parse` and manual `setHours` day boundaries. Future work can swap those helpers for `parse`, `dayStart`, and `dayEnd` from this package for consistent timezone-safe comparisons. Cell display formatting can use `format` with column `valueFormatter` options instead of raw `toLocaleDateString`.
