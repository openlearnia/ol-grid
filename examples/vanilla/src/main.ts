import { createGrid } from "@ol-grid/vanilla";

interface Person {
  id: number;
  name: string;
  role: string;
  department: string;
  location: string;
  startYear: number;
  salary: number;
  status: string;
}

const roles = ["Engineer", "Designer", "PM", "QA", "Support"];
const departments = ["Platform", "Product", "Growth", "Finance", "People"];
const locations = ["Remote", "NYC", "London", "Berlin", "Tokyo"];
const statuses = ["Active", "On leave", "Contract"];

const rowData: Person[] = Array.from({ length: 1000 }, (_, index) => {
  const id = index + 1;
  return {
    id,
    name: `User ${id}`,
    role: roles[index % roles.length]!,
    department: departments[index % departments.length]!,
    location: locations[index % locations.length]!,
    startYear: 2015 + (index % 10),
    salary: 70000 + (index % 50) * 1500,
    status: statuses[index % statuses.length]!,
  };
});

const filterInput = document.getElementById("quick-filter") as HTMLInputElement | null;
const exportBtn = document.getElementById("export-csv");
const statusEl = document.getElementById("status");
const lastEditEl = document.getElementById("last-edit");
const host = document.getElementById("grid-host");

if (!host) {
  throw new Error("Missing #grid-host element");
}

const grid = createGrid<Person>(host, {
  getRowId: ({ data }) => String(data.id),
  rowSelection: "multiple",
  stopEditingWhenCellsLoseFocus: true,
  columnDefs: [
    { field: "id", headerName: "ID", width: 72, pinned: "left" },
    { field: "name", headerName: "Name", width: 140, pinned: "left", editable: true },
    { field: "role", headerName: "Role", width: 120, editable: true },
    { field: "department", headerName: "Department", width: 130 },
    { field: "location", headerName: "Location", width: 110 },
    {
      field: "startYear",
      headerName: "Start",
      width: 90,
      editable: true,
      cellEditor: "number",
      cellEditorParams: { min: 1990, max: 2030, step: 1 },
      valueParser: ({ newValue }) => Number(newValue),
    },
    {
      field: "salary",
      headerName: "Salary",
      width: 110,
      editable: true,
      pinned: "right",
      cellEditor: "number",
      cellEditorParams: { min: 0, step: 1000 },
      valueParser: ({ newValue }) => Number(newValue),
      valueSetter: ({ data, newValue }) => {
        if (typeof newValue !== "number" || newValue < 30000) return false;
        data.salary = newValue;
        return true;
      },
      valueFormatter: ({ value }) =>
        typeof value === "number" ? `$${value.toLocaleString()}` : "",
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      editable: true,
      cellEditor: "select",
      cellEditorParams: { values: statuses },
    },
  ],
  rowData,
  onGridReady: () => {
    console.log("grid ready", grid.api.getDisplayedRowCount(), "rows");
    updateStatus();
  },
  onSortChanged: () => {
    console.log("sort changed");
    updateStatus();
  },
  onSelectionChanged: () => {
    console.log("selection changed", grid.api.getSelectedRows().length, "rows");
    updateStatus();
  },
  onFilterChanged: () => {
    console.log("filter changed", grid.api.getDisplayedRowCount(), "rows visible");
    updateStatus();
  },
  onColumnResized: (event) => {
    if (event.finished) {
      console.log("column resized", event.colId, event.width);
    }
  },
  onCellValueChanged: (event) => {
    const label = `${String(event.colDef.field)}: ${String(event.oldValue)} → ${String(event.newValue)}`;
    console.log("cell value changed", label);
    if (lastEditEl) lastEditEl.textContent = label;
  },
});

function updateStatus(): void {
  if (!statusEl) return;
  statusEl.textContent = `${grid.api.getDisplayedRowCount()} rows visible · ${grid.api.getSelectedRows().length} selected · double-click or Enter to edit · Tab between editable cells · salary min $30k`;
}

(window as unknown as { grid: typeof grid }).grid = grid;
