import { createGrid } from "@ol-grid/vanilla";

interface Person {
  id: number;
  name: string;
  role: string;
  department: string;
  status: string;
}

const roles = ["Engineer", "Designer", "PM", "QA", "Support"];
const departments = ["Platform", "Product", "Growth", "Finance", "People"];
const statuses = ["Active", "On leave", "Contract"];

const rowData: Person[] = Array.from({ length: 100_000 }, (_, index) => {
  const id = index + 1;
  return {
    id,
    name: `User ${id}`,
    role: roles[index % roles.length]!,
    department: departments[index % departments.length]!,
    status: statuses[index % statuses.length]!,
  };
});

const statusEl = document.getElementById("status");
const mountTimeEl = document.getElementById("mount-time");
const host = document.getElementById("grid-host");

if (!host) {
  throw new Error("Missing #grid-host");
}

if (statusEl) {
  statusEl.textContent = `${rowData.length.toLocaleString()} rows ready`;
}

const started = performance.now();

const grid = createGrid<Person>(host, {
  getRowId: ({ data }) => String(data.id),
  rowSelection: "multiple",
  columnDefs: [
    { field: "id", headerName: "ID", width: 80, pinned: "left" },
    { field: "name", headerName: "Name", width: 160, pinned: "left" },
    { field: "role", headerName: "Role", width: 120 },
    { field: "department", headerName: "Department", width: 140 },
    { field: "status", headerName: "Status", width: 120, pinned: "right" },
  ],
  rowData,
  onGridReady: () => {
    const elapsed = performance.now() - started;
    if (mountTimeEl) {
      mountTimeEl.textContent = `Mounted in ${elapsed.toFixed(0)}ms · ${grid.api.getDisplayedRowCount().toLocaleString()} visible rows`;
    }
    console.log(`[perf-100k] grid ready in ${elapsed.toFixed(1)}ms`);
  },
});

(window as unknown as { grid: typeof grid }).grid = grid;
