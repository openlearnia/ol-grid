import { OlGrid, type OlGridHandle, type OlGridProps } from "@ol-grid/react";
import { localeEn } from "@ol-grid/locale-en";
import { StrictMode, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  DATASET_OPTIONS,
  getDataset,
  type DatasetId,
  type DemoColumnDef,
} from "./datasets";

const COLUMN_CONFIG_HEADERS = [
  "colId",
  "field",
  "headerName",
  "width",
  "flex",
  "minWidth",
  "pinned",
  "sortable",
  "editable",
  "cellEditor",
  "cellEditorParams",
  "cellRenderer",
  "valueParser",
  "valueSetter",
  "valueFormatter",
] as const;

function formatConfigCell(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "function") return "fn";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function columnDefToConfigRow(col: DemoColumnDef, index: number): Record<string, string> {
  const colId = col.id ?? col.field ?? `col-${index}`;
  return {
    colId,
    field: formatConfigCell(col.field),
    headerName: formatConfigCell(col.headerName),
    width: formatConfigCell(col.width),
    flex: formatConfigCell(col.flex),
    minWidth: formatConfigCell(col.minWidth),
    pinned: formatConfigCell(col.pinned),
    sortable: formatConfigCell(col.sortable),
    editable: formatConfigCell(col.editable),
    cellEditor: formatConfigCell(col.cellEditor),
    cellEditorParams: formatConfigCell(col.cellEditorParams),
    cellRenderer: formatConfigCell(col.cellRenderer),
    valueParser: formatConfigCell(col.valueParser),
    valueSetter: formatConfigCell(col.valueSetter),
    valueFormatter: formatConfigCell(col.valueFormatter),
  };
}

function ColumnConfigTable({ columnDefs }: { columnDefs: DemoColumnDef[] }): ReactNode {
  const rows = columnDefs.map(columnDefToConfigRow);
  return (
    <section className="demo-column-config">
      <h2>Column configuration</h2>
      <div className="demo-column-config-scroll">
        <table>
          <thead>
            <tr>
              {COLUMN_CONFIG_HEADERS.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.colId}>
                {COLUMN_CONFIG_HEADERS.map((header) => (
                  <td key={header}>{row[header]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function App() {
  const gridRef = useRef<OlGridHandle<unknown>>(null);
  const [datasetId, setDatasetId] = useState<DatasetId>("employees-large");
  const dataset = useMemo(() => getDataset(datasetId), [datasetId]);
  const [selectionMode, setSelectionMode] = useState<"single" | "multiple">("multiple");
  const [selectedCount, setSelectedCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(dataset.rowData.length);
  const [quickFilter, setQuickFilter] = useState("");
  const [lastEdit, setLastEdit] = useState("none");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [pagination, setPagination] = useState(false);

  const refreshCounts = useCallback(() => {
    setSelectedCount(gridRef.current?.api.getSelectedRows().length ?? 0);
    setVisibleCount(gridRef.current?.api.getDisplayedRowCount() ?? 0);
  }, []);

  const handleDatasetChange = useCallback((nextId: DatasetId) => {
    setDatasetId(nextId);
    setQuickFilter("");
    setSelectedCount(0);
    setLastEdit("none");
    setVisibleCount(getDataset(nextId).rowData.length);
  }, []);

  const handleQuickFilterChange = useCallback((value: string) => {
    setQuickFilter(value);
    gridRef.current?.api.setQuickFilterText(value);
  }, []);

  const handleExport = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv({ fileName: dataset.exportFileName });
  }, [dataset.exportFileName]);

  return (
    <div className="demo-shell">
      <h1>ol-grid React Demo</h1>
      <div className="demo-toolbar">
        <label>
          Dataset{" "}
          <select
            data-testid="demo-dataset-select"
            value={datasetId}
            onChange={(event) => handleDatasetChange(event.target.value as DatasetId)}
          >
            {DATASET_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
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
          Theme{" "}
          <select
            data-testid="demo-theme-select"
            value={theme}
            onChange={(event) => setTheme(event.target.value as typeof theme)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </label>
        <label>
          Pagination{" "}
          <select
            data-testid="demo-pagination-select"
            value={pagination ? "on" : "off"}
            onChange={(event) => setPagination(event.target.value === "on")}
          >
            <option value="off">Off (virtual scroll)</option>
            <option value="on">On (25 / page)</option>
          </select>
        </label>
        <label>
          Quick filter{" "}
          <input
            type="search"
            data-testid="demo-quick-filter"
            value={quickFilter}
            onChange={(event) => handleQuickFilterChange(event.target.value)}
            placeholder="Filter all columns…"
          />
        </label>
        <button type="button" data-testid="demo-export-csv" onClick={handleExport}>
          Export CSV
        </button>
        <span>{visibleCount} rows visible</span>
        <span>{selectedCount} row(s) selected</span>
        <span>Column groups: Organization · Timeline · Shift+click headers for multi-sort</span>
        <span>Last edit: {lastEdit}</span>
        <span>Tab between editable cells · salary min $30k</span>
      </div>
      <div className="demo-grid">
        <OlGrid
          key={`${datasetId}-${pagination ? "paged" : "virtual"}`}
          ref={gridRef}
          getRowId={dataset.getRowId}
          columnDefs={dataset.columnDefs as OlGridProps<unknown>["columnDefs"]}
          rowData={dataset.rowData}
          rowSelection={selectionMode}
          quickFilterText={quickFilter}
          theme={theme}
          localeBundle={localeEn}
          pagination={pagination}
          paginationPageSize={25}
          paginationPageSizeSelector={[10, 25, 50, 100]}
          onGridReady={refreshCounts}
          onSelectionChanged={refreshCounts}
          onFilterChanged={refreshCounts}
          onSortChanged={refreshCounts}
          onCellValueChanged={(event) => {
            setLastEdit(`${String(event.colDef.field)}: ${String(event.oldValue)} → ${String(event.newValue)}`);
          }}
        />
      </div>
      {/* <ColumnConfigTable columnDefs={dataset.columnDefs} /> */}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
