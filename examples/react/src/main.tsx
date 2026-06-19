import { OlGrid, type OlGridHandle } from "@ol-grid/react";
import { StrictMode, useCallback, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

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

function App() {
  const gridRef = useRef<OlGridHandle<Person>>(null);
  const [selectionMode, setSelectionMode] = useState<"single" | "multiple">("multiple");
  const [selectedCount, setSelectedCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(rowData.length);
  const [quickFilter, setQuickFilter] = useState("");
  const [lastEdit, setLastEdit] = useState("none");

  const columnDefs = useMemo(
    () => [
      { field: "id" as const, headerName: "ID", width: 72, pinned: "left" as const },
      {
        field: "name" as const,
        headerName: "Name",
        width: 140,
        pinned: "left" as const,
        editable: true,
      },
      { field: "role" as const, headerName: "Role", width: 120, editable: true },
      { field: "department" as const, headerName: "Department", width: 130 },
      { field: "location" as const, headerName: "Location", width: 110 },
      { field: "startYear" as const, headerName: "Start", width: 90, editable: true,
        cellEditor: "number" as const,
        cellEditorParams: { min: 1990, max: 2030, step: 1 },
        valueParser: ({ newValue }: { newValue: unknown }) => Number(newValue),
      },
      {
        field: "salary" as const,
        headerName: "Salary",
        width: 110,
        editable: true,
        pinned: "right" as const,
        cellEditor: "number" as const,
        cellEditorParams: { min: 0, step: 1000 },
        valueParser: ({ newValue }: { newValue: unknown }) => Number(newValue),
        valueSetter: ({ data, newValue }: { data: Person; newValue: unknown }) => {
          if (typeof newValue !== "number" || newValue < 30000) return false;
          data.salary = newValue;
          return true;
        },
        valueFormatter: ({ value }: { value: unknown }) =>
          typeof value === "number" ? `$${value.toLocaleString()}` : "",
      },
      {
        field: "status" as const,
        headerName: "Status",
        width: 120,
        editable: true,
        cellEditor: "select" as const,
        cellEditorParams: { values: statuses },
      },
    ],
    [],
  );

  const refreshCounts = useCallback(() => {
    setSelectedCount(gridRef.current?.api.getSelectedRows().length ?? 0);
    setVisibleCount(gridRef.current?.api.getDisplayedRowCount() ?? 0);
  }, []);

  const handleQuickFilterChange = useCallback((value: string) => {
    setQuickFilter(value);
    gridRef.current?.api.setQuickFilterText(value);
  }, []);

  const handleExport = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv({ fileName: "people.csv" });
  }, []);

  return (
    <div className="demo-shell">
      <h1>ol-grid React Demo</h1>
      <div className="demo-toolbar">
        <label>
          Selection mode{" "}
          <select
            value={selectionMode}
            onChange={(event) =>
              setSelectionMode(event.target.value as "single" | "multiple")
            }
          >
            <option value="single">Single</option>
            <option value="multiple">Multiple</option>
          </select>
        </label>
        <label>
          Quick filter{" "}
          <input
            type="search"
            value={quickFilter}
            onChange={(event) => handleQuickFilterChange(event.target.value)}
            placeholder="Filter all columns…"
          />
        </label>
        <button type="button" onClick={handleExport}>
          Export CSV
        </button>
        <span>{visibleCount} rows visible</span>
        <span>{selectedCount} row(s) selected</span>
        <span>Last edit: {lastEdit}</span>
        <span>Tab between editable cells · salary min $30k</span>
      </div>
      <div className="demo-grid">
        <OlGrid<Person>
          ref={gridRef}
          getRowId={({ data }) => String(data.id)}
          columnDefs={columnDefs}
          rowData={rowData}
          rowSelection={selectionMode}
          quickFilterText={quickFilter}
          onGridReady={refreshCounts}
          onSelectionChanged={refreshCounts}
          onFilterChanged={refreshCounts}
          onSortChanged={refreshCounts}
          onCellValueChanged={(event) => {
            setLastEdit(`${String(event.colDef.field)}: ${String(event.oldValue)} → ${String(event.newValue)}`);
          }}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
