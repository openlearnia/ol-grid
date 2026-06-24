import {
  createGridEngine,
  ModuleRegistry,
  type GridEngine,
  type GridOptions,
} from "@ol-grid/core";
import { SortModule } from "@ol-grid/sort";
import { FilterModule } from "@ol-grid/filter";

let sortModuleRegistered = false;
let filterModuleRegistered = false;

function ensureSortModuleRegistered(): void {
  if (sortModuleRegistered) return;
  ModuleRegistry.register(SortModule);
  sortModuleRegistered = true;
}

function ensureFilterModuleRegistered(): void {
  if (filterModuleRegistered) return;
  ModuleRegistry.register(FilterModule);
  filterModuleRegistered = true;
}

export const GRID_OPTION_KEYS = [
  "columnDefs",
  "rowData",
  "rowHeight",
  "rowSelection",
  "getRowId",
  "context",
  "quickFilterText",
  "sortModel",
  "filterModel",
  "selectedRowIds",
  "defaultColDef",
  "theme",
  "locale",
  "localeText",
  "localeBundle",
] as const satisfies readonly (keyof GridOptions<unknown>)[];

export function createAdapterEngine<TData>(options: GridOptions<TData>): GridEngine<TData> {
  ensureSortModuleRegistered();
  ensureFilterModuleRegistered();
  return createGridEngine({
    ...options,
    modules: [...(options.modules ?? []), SortModule, FilterModule],
  });
}

export function syncGridOptions<TData>(
  engine: GridEngine<TData>,
  options: GridOptions<TData>,
  synced: Partial<Pick<GridOptions<TData>, (typeof GRID_OPTION_KEYS)[number]>>,
): void {
  for (const key of GRID_OPTION_KEYS) {
    const value = options[key];
    if (value !== undefined && value !== synced[key]) {
      engine.setOption(key, value as GridOptions<TData>[typeof key]);
      (synced as Record<typeof key, unknown>)[key] = value;
    }
  }
}

export function syncEventHandlers<TData>(
  engine: GridEngine<TData>,
  options: GridOptions<TData>,
): void {
  const opts = engine.getOptions() as GridOptions<TData>;
  opts.onSelectionChanged = options.onSelectionChanged;
  opts.onSortChanged = options.onSortChanged;
  opts.onRowDataUpdated = options.onRowDataUpdated;
  opts.onFilterChanged = options.onFilterChanged;
  opts.onFilterOpened = options.onFilterOpened;
  opts.onDisplayedColumnsChanged = options.onDisplayedColumnsChanged;
  opts.onColumnResized = options.onColumnResized;
  opts.onCellValueChanged = options.onCellValueChanged;
  opts.onSortModelChange = options.onSortModelChange;
  opts.onFilterModelChange = options.onFilterModelChange;
  opts.onSelectionChange = options.onSelectionChange;
  opts.onGridReady = options.onGridReady;
}

export function buildGridOptionsFromProps(props: Record<string, unknown>): GridOptions {
  const options: GridOptions = {};
  for (const key of [
    ...GRID_OPTION_KEYS,
    "onGridReady",
    "onSelectionChanged",
    "onSortChanged",
    "onFilterChanged",
    "onFilterOpened",
    "onDisplayedColumnsChanged",
    "onColumnResized",
    "onCellValueChanged",
    "onRowDataUpdated",
    "onSortModelChange",
    "onFilterModelChange",
    "onSelectionChange",
    "modules",
  ] as const) {
    if (props[key] !== undefined) {
      (options as Record<string, unknown>)[key] = props[key];
    }
  }
  return options;
}
