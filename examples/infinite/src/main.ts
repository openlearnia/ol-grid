import { ModuleRegistry } from "@ol-grid/core";
import { InfiniteRowModelModule } from "@ol-grid/infinite-row-model";
import { createGrid } from "@ol-grid/vanilla";

interface Person {
  id: number;
  name: string;
  department: string;
  salary: number;
}

const TOTAL_ROWS = 10_000;
const departments = ["Engineering", "Sales", "Support", "Finance", "People"];

/** Simulates a REST API with artificial latency. */
function mockFetchRows(startRow: number, endRow: number): Promise<Person[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const rows: Person[] = [];
      for (let i = startRow; i < endRow && i < TOTAL_ROWS; i++) {
        rows.push({
          id: i + 1,
          name: `User ${i + 1}`,
          department: departments[i % departments.length]!,
          salary: 60_000 + (i % 40) * 2_500,
        });
      }
      resolve(rows);
    }, 120);
  });
}

ModuleRegistry.register(InfiniteRowModelModule);

const host = document.getElementById("grid-host");
const statusEl = document.getElementById("status");

if (!host) {
  throw new Error("Missing #grid-host");
}

const grid = createGrid<Person>(host, {
  rowModelType: "infinite",
  cacheBlockSize: 100,
  maxBlocksInCache: 5,
  infiniteInitialRowCount: 100,
  getRowId: ({ data }) => String(data.id),
  overlayLoadingTemplate: "Loading rows…",
  columnDefs: [
    { field: "id", headerName: "ID", width: 80, pinned: "left" },
    { field: "name", headerName: "Name", width: 160, sortable: true },
    { field: "department", headerName: "Department", width: 140 },
    {
      field: "salary",
      headerName: "Salary",
      width: 120,
      valueFormatter: ({ value }) =>
        typeof value === "number" ? `$${value.toLocaleString()}` : "",
    },
  ],
  datasource: {
    getRows(params) {
      void mockFetchRows(params.startRow, params.endRow)
        .then((rows) => params.success({ rows, rowCount: TOTAL_ROWS }))
        .catch(() => params.fail());
    },
  },
});

grid.api.setSortModel([{ colId: "name", sort: "asc" }]);

document.getElementById("refresh-cache")?.addEventListener("click", () => {
  grid.api.refreshInfiniteCache();
  if (statusEl) statusEl.textContent = "Cache refreshed";
});

document.getElementById("purge-cache")?.addEventListener("click", () => {
  grid.api.purgeInfiniteCache();
  if (statusEl) statusEl.textContent = "Cache purged";
});

grid.engine.getStore().subscribe(() => {
  if (!statusEl) return;
  const count = grid.api.getInfiniteRowCount();
  statusEl.textContent = `Displayed: ${grid.api.getDisplayedRowCount()} · logical: ${count}`;
});
