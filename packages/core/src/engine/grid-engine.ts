import { computeAutoColumnWidth } from "../column/auto-size-column.js";
import { mergeColumnState } from "../column/apply-column-state.js";
import { ColumnModel } from "../column/column-model.js";
import { mergeColumnDefs } from "../column/merge-column-defs.js";
import { resolveColId } from "../column/resolve-col-id.js";
import { EventBus } from "../events/event-bus.js";
import { downloadCsvContent, generateCsv } from "../export/csv-export.js";
import { createGridContext } from "../modules/grid-context.js";
import { ModuleRegistry, type GridModule, type RowModelStage } from "../modules/module-registry.js";
import { ClientSideRowModel } from "../row/client-side-row-model.js";
import { formatCellValue, getCellValue } from "../row/get-cell-value.js";
import { commitCellEdit } from "../row/commit-cell-edit.js";
import { findNextEditableCell } from "../row/find-next-editable-cell.js";
import { isCellEditable } from "../row/is-cell-editable.js";
import {
  createSelectionState,
  deselectAllRows,
  getHeaderCheckboxState,
  handleRowClickSelection,
  rowSelectionToMode,
  selectionChanged,
  selectAllRows,
  toggleRowSelection,
  toggleSelectAll,
} from "../selection/selection-manager.js";
import { createGridStore, type GridStore, type Unsubscribe } from "../store/grid-store.js";
import type { CellRendererFn } from "../types/cell-renderer.js";
import type { GridApi } from "../types/api.js";
import type { ColumnDef, ColumnState, ApplyColumnStateParams } from "../types/column.js";
import type { NormalizedColumn } from "../column/column-model.js";
import type { GetRowIdParams, GridOptions, SortModel } from "../types/options.js";
import type { RenderFrame, RendererAdapter } from "../types/renderer.js";
import type { RowNode } from "../types/row.js";
import type { CellPosition, SelectionState } from "../types/state.js";
import {
  computeRowVirtualRange,
  computeDirectionalOverscan,
  type ScrollOverscanState,
  getFirstVisibleRowIndex,
  type RowVirtualRange,
} from "../virtualizer/compute-row-range.js";

const DEFAULT_ROW_HEIGHT = 32;

interface SortControllerLike {
  toggleColumnSort(colId: string): void;
  getSortModel(): SortModel;
  setSortModel(model: SortModel, source?: "api" | "uiColumnSorted"): void;
  rebuildFromColumns(columns: ColumnState[]): void;
}

interface FilterControllerLike {
  getFilterModel(): Record<string, unknown>;
  setFilterModel(
    model: Record<string, unknown> | null,
    source?: "api" | "ui" | "floating" | "quickFilter",
  ): void;
  destroyFilter(colKey: string): void;
  setColumnFilter(
    colId: string,
    model: unknown,
    source?: "api" | "ui" | "floating",
  ): void;
  openFilter(colId: string): void;
  closeFilter(): void;
  getFilterTypeForColumn(colId: string): "text" | "number" | "date" | null;
  getDefaultModelForColumn(colId: string): unknown;
  hasFloatingFilters(): boolean;
  isColumnFilterActiveForCol(colId: string): boolean;
}

function resolveFilterType<TData>(
  colDef: ColumnDef<TData>,
): "text" | "number" | "date" | null {
  const filter = colDef.filter;
  if (filter === "number" || filter === "date" || filter === "text") {
    return filter;
  }
  if (filter === true || colDef.filterable === true) {
    return "text";
  }
  return null;
}

function resolveFloatingFilter<TData>(
  colDef: ColumnDef<TData>,
  defaultColDef?: Partial<ColumnDef<TData>>,
): boolean {
  if (colDef.floatingFilter === false) return false;
  if (colDef.floatingFilter === true) return resolveFilterType(colDef) !== null;
  if (defaultColDef?.floatingFilter === true) return resolveFilterType(colDef) !== null;
  return false;
}

function isFilterModelEntryActive(model: unknown): boolean {
  if (!model || typeof model !== "object") return false;
  const entry = model as Record<string, unknown>;
  if (entry.filterType === "text") {
    return String(entry.filter ?? "").trim().length > 0;
  }
  if (entry.filterType === "number") {
    if (entry.type === "inRange") {
      return entry.filter != null || entry.filterTo != null;
    }
    return entry.filter != null;
  }
  if (entry.filterType === "date") {
    if (entry.type === "inRange") {
      return !!entry.dateFrom || !!entry.dateTo;
    }
    return !!entry.dateFrom;
  }
  return false;
}

function readSortModel(columns: ColumnState[]): SortModel {
  return columns
    .filter((column) => column.sort === "asc" || column.sort === "desc")
    .sort((left, right) => (left.sortIndex ?? 0) - (right.sortIndex ?? 0))
    .map((column) => ({ colId: column.colId, sort: column.sort! }));
}

function applyInitialSortModel(
  columns: ColumnState[],
  sortModel: SortModel,
): ColumnState[] {
  return columns.map((column) => {
    const index = sortModel.findIndex((entry) => entry.colId === column.colId);
    if (index < 0) {
      return { ...column, sort: null, sortIndex: null };
    }
    const entry = sortModel[index]!;
    return { ...column, sort: entry.sort, sortIndex: index };
  });
}

let gridIdCounter = 0;

function columnDefsToState<TData>(columnDefs: ColumnDef<TData>[] = []): ColumnState[] {
  return columnDefs.map((def, index) => ({
    colId: resolveColId(def, index),
    width: def.flex != null && def.flex > 0 ? undefined : def.width ?? 150,
    hide: def.hide ?? false,
    pinned: def.pinned ?? null,
    sort: null,
    sortIndex: null,
  }));
}

function createGridApi<TData>(
  engine: GridEngine<TData>,
  destroyFn: () => void,
): GridApi<TData> {
  return {
    setGridOption(key, value) {
      engine.setOption(key, value);
    },
    getDisplayedRowCount() {
      return engine.getRowModel().getRowCount();
    },
    getRowNode(id) {
      return engine.getRowModel().getRowById(id);
    },
    forEachNode(callback) {
      engine.getRowModel().forEachNode(callback);
    },
    getSelectedRows() {
      return engine.getSelectedRows();
    },
    setFocusedCell(rowIndex, colKey) {
      engine.setFocusedCell(rowIndex, colKey);
    },
    getFocusedCell() {
      return engine.getFocusedCell();
    },
    clearFocusedCell() {
      engine.clearFocusedCell();
    },
    ensureIndexVisible(rowIndex, position) {
      engine.ensureIndexVisible(rowIndex, position);
    },
    getColumnState() {
      return engine.getColumnState();
    },
    applyColumnState(params) {
      return engine.applyColumnState(params);
    },
    setQuickFilterText(text) {
      engine.setQuickFilterText(text);
    },
    setFilterModel(model) {
      engine.setFilterModel(model);
    },
    getFilterModel() {
      return engine.getFilterModel();
    },
    destroyFilter(colKey) {
      engine.destroyFilter(colKey);
    },
    startEditingCell(params) {
      engine.startEditingCell(params.rowIndex, params.colKey);
    },
    stopEditing(cancel) {
      engine.stopEditing(cancel ?? false);
    },
    exportDataAsCsv(params) {
      engine.exportDataAsCsv(params);
    },
    getSortModel() {
      return engine.getSortModel();
    },
    setSortModel(model) {
      engine.setSortModel(model);
    },
    destroy() {
      destroyFn();
    },
  };
}

function toRenderColumn<TData>(
  column: NormalizedColumn<TData>,
  filterModel: Record<string, unknown>,
  defaultColDef?: Partial<ColumnDef<TData>>,
): RenderFrame["columns"][number] {
  const merged = defaultColDef ? { ...defaultColDef, ...column.def } : column.def;
  const filterType = resolveFilterType(merged);
  return {
    colId: column.colId,
    headerName: column.isSelectionColumn ? "" : (column.def.headerName ?? column.colId),
    width: column.width,
    left: column.left,
    sort: column.sort,
    sortable: column.isSelectionColumn ? false : column.def.sortable !== false,
    pinned: column.pinned,
    isSelectionColumn: column.isSelectionColumn,
    filterType,
    filterActive: filterType ? isFilterModelEntryActive(filterModel[column.colId]) : false,
    floatingFilter: resolveFloatingFilter(merged, defaultColDef),
  };
}

export class GridEngine<TData = unknown> {
  private readonly store: GridStore;
  private readonly eventBus = new EventBus();
  private readonly options: GridOptions<TData>;
  private readonly columnModel = new ColumnModel<TData>();
  private readonly rowModel = new ClientSideRowModel<TData>();
  private api: GridApi<TData>;
  private renderer: RendererAdapter | null = null;
  private host: HTMLElement | null = null;
  private destroyed = false;
  private storeUnsubscribe: Unsubscribe | null = null;
  private rowHeight = DEFAULT_ROW_HEIGHT;
  private lastFrame: RenderFrame | null = null;
  private activeModules: GridModule[] = [];
  private moduleContexts: import("../modules/grid-context.js").GridContext[] = [];
  private rowModelStages: RowModelStage[] = [];
  private sortController: SortControllerLike | null = null;
  private filterController: FilterControllerLike | null = null;
  private cellRendererRegistry = new Map<string, CellRendererFn<TData>>();
  private frameworkCellRenderers = new Set<string | CellRendererFn<TData>>();
  private lastBodyFocusedCell: CellPosition | null = null;
  private scrollOverscanState: ScrollOverscanState = {
    scrollTop: 0,
    lastMovementTime: 0,
    direction: "none",
  };

  constructor(options: GridOptions<TData> = {}) {
    const gridId = options.gridId ?? `ol-grid-${++gridIdCounter}`;
    this.options = { ...options };
    this.rowHeight = options.rowHeight ?? DEFAULT_ROW_HEIGHT;
    this.store = createGridStore(gridId);

    const rowData = options.rowData ?? [];
    const mergedColumnDefs = this.getMergedColumnDefs();
    let columns = columnDefsToState(mergedColumnDefs);
    if (options.sortModel?.length) {
      columns = applyInitialSortModel(columns, options.sortModel);
    }
    const quickFilterText = options.quickFilterText ?? "";
    const filterModel = options.filterModel ?? {};

    this.rowModel.setGetRowId(options.getRowId);
    this.rowModel.setRowData(rowData);
    this.rowModel.setQuickFilterText(quickFilterText);
    this.rowModel.setFilterModel(filterModel);
    this.columnModel.setColumnDefs(mergedColumnDefs);
    this.columnModel.setColumnState(columns);
    this.syncSelectionColumn();

    this.api = createGridApi(this, () => this.destroy());
    this.initModules(options.modules ?? []);

    const selectionMode = rowSelectionToMode(options.rowSelection);
    const selection = selectionMode ? createSelectionState(selectionMode) : undefined;

    this.store.batch(() => {
      this.store.dispatch({ type: "SET_QUICK_FILTER", quickFilterText });
      this.store.dispatch({ type: "SET_FILTER_MODEL", filterModel });
      this.store.dispatch({ type: "SET_ROW_COUNT", rowCount: 0 });
      this.store.dispatch({ type: "SET_COLUMNS", columns });
      if (selection) {
        this.store.dispatch({ type: "SET_SELECTION", selection });
      }
    });

    this.rebuildRowModel(columns);
  }

  getStore(): GridStore {
    return this.store;
  }

  getApi(): GridApi<TData> {
    return this.api;
  }

  getOptions(): Readonly<GridOptions<TData>> {
    return this.options;
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getRowModel(): ClientSideRowModel<TData> {
    return this.rowModel;
  }

  getColumnModel(): ColumnModel<TData> {
    return this.columnModel;
  }

  getRenderer(): RendererAdapter | null {
    return this.renderer;
  }

  getCellRenderer(name: string): CellRendererFn<TData> | undefined {
    return this.cellRendererRegistry.get(name);
  }

  registerCellRenderer(name: string, renderer: CellRendererFn<TData>): void {
    this.cellRendererRegistry.set(name, renderer);
  }

  getFrameworkCellRenderers(): ReadonlySet<string | CellRendererFn<TData>> {
    return this.frameworkCellRenderers;
  }

  setSortController(controller: SortControllerLike | null): void {
    this.sortController = controller;
  }

  setFilterController(controller: FilterControllerLike | null): void {
    this.filterController = controller;
  }

  rebuildRowModel(columns = this.store.getState().columns): void {
    const sortModel = readSortModel(columns);
    const filterModel = this.getFilterModel();
    this.rowModel.setFilterModel(filterModel);
    this.rowModel.rebuild(
      sortModel,
      filterModel,
      this.getMergedColumnDefs(),
      this.api,
      this.options.context ?? null,
    );
    this.store.dispatch({ type: "SET_ROW_COUNT", rowCount: this.rowModel.getRowCount() });
  }

  private initModules(perGridModules: GridModule[]): void {
    this.activeModules = ModuleRegistry.resolve(perGridModules);
    const stages: RowModelStage[] = [];

    for (const mod of this.activeModules) {
      if (mod.rowModelStages) {
        stages.push(...mod.rowModelStages);
      }
    }

    const registerCellRenderer = (name: string, renderer: CellRendererFn) => {
      this.cellRendererRegistry.set(name, renderer as CellRendererFn<TData>);
    };

    const registerRowModelStage = (stage: RowModelStage) => {
      stages.push(stage);
    };

    for (const mod of this.activeModules) {
      const ctx = createGridContext(
        this as GridEngine<unknown>,
        registerCellRenderer,
        registerRowModelStage,
      );
      this.moduleContexts.push(ctx);
      mod.onGridCreate?.(ctx);
    }

    this.rowModelStages = [...stages].sort((left, right) => left.order - right.order);
    this.rowModel.setPipelineStages(this.rowModelStages);
  }

  private destroyModules(): void {
    for (let index = this.moduleContexts.length - 1; index >= 0; index--) {
      const mod = this.activeModules[index];
      const ctx = this.moduleContexts[index];
      if (mod && ctx) {
        mod.onGridDestroy?.(ctx);
      }
    }
    this.moduleContexts = [];
    this.activeModules = [];
    this.sortController = null;
    this.filterController = null;
  }


  getRowHeight(): number {
    return this.rowHeight;
  }

  /** Same virtual range math as refresh(), for renderer scroll fast-path. */
  computeVirtualRangeForScrollTop(
    scrollTop?: number,
    overscanOverride?: { overscanBefore?: number; overscanAfter?: number },
  ): RowVirtualRange {
    const state = this.store.getState();
    const top = scrollTop ?? state.scrollTop;
    const directional = overscanOverride ?? this.resolveDirectionalOverscan(top);
    return computeRowVirtualRange({
      rowCount: this.rowModel.getRowCount(),
      rowHeight: this.rowHeight,
      scrollTop: top,
      viewportHeight: state.viewportHeight,
      overscanBefore: directional.overscanBefore,
      overscanAfter: directional.overscanAfter,
    });
  }

  /**
   * Pre-mount rows for an expanded virtual range at the current scroll position.
   * Used before scrollTop changes (wheel / scrollbar mousedown) to keep the pool warm.
   */
  warmSyncRowsAtScrollTop(
    scrollTop: number,
    overscan?: { overscanBefore: number; overscanAfter: number },
  ): void {
    if (!this.renderer || this.destroyed) return;

    const state = this.store.getState();
    const directional = overscan ?? this.resolveDirectionalOverscan(scrollTop);
    const virtualRange = computeRowVirtualRange({
      rowCount: this.rowModel.getRowCount(),
      rowHeight: this.rowHeight,
      scrollTop,
      viewportHeight: state.viewportHeight,
      overscanBefore: directional.overscanBefore,
      overscanAfter: directional.overscanAfter,
    });

    const frame = this.buildRenderFrame(state, virtualRange);
    this.lastFrame = frame;
    this.renderer.renderFrame(frame);
  }

  getLastFrame(): RenderFrame | null {
    return this.lastFrame;
  }

  getSelectedRows(): TData[] {
    const selection = this.store.getState().selection;
    if (!selection) return [];

    const rows: TData[] = [];
    for (const rowId of selection.selectedRowIds) {
      const node = this.rowModel.getRowById(rowId);
      if (node?.data !== undefined) rows.push(node.data);
    }
    return rows;
  }

  setOption<K extends keyof GridOptions<TData>>(
    key: K,
    value: GridOptions<TData>[K],
  ): void {
    (this.options as GridOptions<TData>)[key] = value;

    if (key === "rowData" && Array.isArray(value)) {
      this.rowModel.setRowData(value);
      this.rebuildRowModel();
      this.store.batch(() => {
        this.store.dispatch({ type: "SET_ROW_COUNT", rowCount: this.rowModel.getRowCount() });
        this.store.dispatch({ type: "BUMP_ROW_DATA_VERSION" });
      });
      this.options.onRowDataUpdated?.({ api: this.api });
      return;
    }

    if (key === "columnDefs" && Array.isArray(value)) {
      const mergedColumnDefs = this.getMergedColumnDefs(value as ColumnDef<TData>[]);
      const columns = applyInitialSortModel(
        columnDefsToState(mergedColumnDefs),
        readSortModel(this.store.getState().columns),
      );
      this.columnModel.setColumnDefs(mergedColumnDefs);
      this.columnModel.setColumnState(columns);
      this.store.dispatch({ type: "SET_COLUMNS", columns });
      this.rebuildRowModel(columns);
      return;
    }

    if (key === "defaultColDef") {
      const mergedColumnDefs = this.getMergedColumnDefs();
      const columns = applyInitialSortModel(
        columnDefsToState(mergedColumnDefs),
        readSortModel(this.store.getState().columns),
      );
      this.columnModel.setColumnDefs(mergedColumnDefs);
      this.columnModel.setColumnState(columns);
      this.store.dispatch({ type: "SET_COLUMNS", columns });
      this.rebuildRowModel(columns);
      return;
    }

    if (key === "sortModel" && Array.isArray(value)) {
      this.setSortModel(value as SortModel, "api");
      return;
    }

    if (key === "rowHeight" && typeof value === "number") {
      this.rowHeight = value;
      this.refresh();
      return;
    }

    if (key === "rowSelection") {
      this.applyRowSelectionOption(value as GridOptions<TData>["rowSelection"]);
      return;
    }

    if (key === "getRowId" && typeof value === "function") {
      const getRowId = value as (params: GetRowIdParams<TData>) => string;
      this.rowModel.setGetRowId(getRowId);
      this.rowModel.setRowData(this.options.rowData ?? []);
      this.rebuildRowModel();
      this.store.dispatch({
        type: "SET_ROW_COUNT",
        rowCount: this.rowModel.getRowCount(),
      });
      return;
    }

    if (key === "quickFilterText" && typeof value === "string") {
      this.setQuickFilterText(value);
      return;
    }

    if (key === "filterModel" && value && typeof value === "object") {
      this.setFilterModel(value as Record<string, unknown>);
    }
  }

  setFilterModel(model: Record<string, unknown> | null): void {
    if (this.filterController) {
      this.filterController.setFilterModel(model, "api");
      return;
    }
    const next = model ? { ...model } : {};
    this.options.filterModel = next;
    this.store.dispatch({ type: "SET_FILTER_MODEL", filterModel: next });
    this.rebuildRowModel();
    this.options.onFilterChanged?.({ api: this.api, source: "api" });
  }

  getFilterModel(): Record<string, unknown> {
    return this.filterController?.getFilterModel() ?? this.store.getState().filterModel;
  }

  destroyFilter(colKey: string): void {
    if (this.filterController) {
      this.filterController.destroyFilter(colKey);
      return;
    }
    const next = { ...this.getFilterModel() };
    delete next[colKey];
    this.setFilterModel(next);
  }

  openColumnFilter(colId: string): void {
    if (this.filterController) {
      this.filterController.openFilter(colId);
      return;
    }
    this.store.dispatch({ type: "SET_OPEN_FILTER", openFilterColId: colId });
  }

  closeColumnFilter(): void {
    if (this.filterController) {
      this.filterController.closeFilter();
      return;
    }
    this.store.dispatch({ type: "SET_OPEN_FILTER", openFilterColId: null });
  }

  applyColumnFilterFromUi(
    colId: string,
    model: unknown,
    source: "ui" | "floating" = "ui",
  ): void {
    if (this.filterController) {
      this.filterController.setColumnFilter(colId, model, source);
      return;
    }
  }

  getColumnFilterType(colId: string): "text" | "number" | "date" | null {
    return this.filterController?.getFilterTypeForColumn(colId) ?? null;
  }

  getDefaultColumnFilterModel(colId: string): unknown {
    return this.filterController?.getDefaultModelForColumn(colId) ?? null;
  }

  hasFloatingFilters(): boolean {
    return this.filterController?.hasFloatingFilters() ?? false;
  }

  setQuickFilterText(text: string): void {
    this.options.quickFilterText = text;
    this.rowModel.setQuickFilterText(text);
    this.rebuildRowModel();
    this.store.dispatch({ type: "SET_QUICK_FILTER", quickFilterText: text });
    this.options.onFilterChanged?.({ api: this.api, source: "quickFilter" });
  }

  setFocusedCell(rowIndex: number, colId: string): void {
    const rowCount = this.rowModel.getRowCount();
    if (rowCount === 0) return;

    const clampedRow = Math.max(0, Math.min(rowIndex, rowCount - 1));
    const columns = this.getNavigableColumns();
    const colIndex = columns.findIndex((col) => col.colId === colId);
    const targetCol = colIndex >= 0 ? colId : columns[0]?.colId;
    if (!targetCol) return;

    const focusedCell: CellPosition = { rowIndex: clampedRow, colId: targetCol };
    this.store.batch(() => {
      this.store.dispatch({ type: "SET_FOCUSED_CELL", focusedCell });
      if (this.store.getState().focusedHeaderColId) {
        this.store.dispatch({ type: "SET_FOCUSED_HEADER", focusedHeaderColId: null });
      }
    });
    this.syncSelectionFocusedCell(focusedCell);
    this.renderer?.syncScrollFromViewport?.();
    this.ensureIndexVisible(clampedRow);
  }

  getFocusedCell(): CellPosition | null {
    return this.store.getState().focusedCell;
  }

  clearFocusedCell(): void {
    if (!this.store.getState().focusedCell) return;

    this.store.dispatch({ type: "SET_FOCUSED_CELL", focusedCell: null });

    const selection = this.store.getState().selection;
    if (selection?.focusedCell) {
      this.store.dispatch({
        type: "SET_SELECTION",
        selection: { ...selection, focusedCell: null },
      });
    }
  }

  ensureIndexVisible(
    rowIndex: number,
    position?: "top" | "middle" | "bottom",
  ): void {
    const rowCount = this.rowModel.getRowCount();
    if (rowCount === 0) return;

    const state = this.store.getState();
    const viewportHeight = state.viewportHeight;
    if (viewportHeight <= 0) return;

    const clampedIndex = Math.max(0, Math.min(rowIndex, rowCount - 1));
    const rowTop = clampedIndex * this.rowHeight;
    const rowBottom = rowTop + this.rowHeight;
    const maxScrollTop = Math.max(0, rowCount * this.rowHeight - viewportHeight);
    const viewportBottom = state.scrollTop + viewportHeight;

    let scrollTop: number;
    if (position === undefined) {
      if (rowTop >= state.scrollTop - 0.5 && rowBottom <= viewportBottom + 0.5) {
        return;
      }
      scrollTop =
        rowTop < state.scrollTop
          ? rowTop
          : rowBottom - viewportHeight;
    } else {
      switch (position) {
        case "top":
          scrollTop = rowTop;
          break;
        case "bottom":
          scrollTop = rowTop - viewportHeight + this.rowHeight;
          break;
        case "middle":
        default:
          scrollTop = rowTop - (viewportHeight - this.rowHeight) / 2;
          break;
      }
    }

    scrollTop = Math.max(0, Math.min(scrollTop, maxScrollTop));
    if (state.scrollTop === scrollTop) return;

    this.store.dispatch({
      type: "SET_SCROLL",
      scrollTop,
      scrollLeft: state.scrollLeft,
    });
  }

  moveFocusedCell(deltaRow: number, deltaCol: number): void {
    const state = this.store.getState();
    const columns = this.getNavigableColumns();
    if (columns.length === 0) return;

    const rowCount = this.rowModel.getRowCount();
    if (rowCount === 0) return;

    const current = state.focusedCell ?? { rowIndex: 0, colId: columns[0]!.colId };
    const colIndex = Math.max(
      0,
      columns.findIndex((col) => col.colId === current.colId),
    );
    const nextColIndex = Math.max(0, Math.min(columns.length - 1, colIndex + deltaCol));
    const nextRowIndex = Math.max(0, Math.min(rowCount - 1, current.rowIndex + deltaRow));

    this.setFocusedCell(nextRowIndex, columns[nextColIndex]!.colId);
  }

  moveFocusedCellToColumn(edge: "first" | "last"): void {
    const columns = this.getNavigableColumns();
    if (columns.length === 0) return;

    const state = this.store.getState();
    const current = state.focusedCell ?? { rowIndex: 0, colId: columns[0]!.colId };
    const colId = edge === "first" ? columns[0]!.colId : columns[columns.length - 1]!.colId;
    this.setFocusedCell(current.rowIndex, colId);
  }

  pageFocusedCell(direction: "up" | "down"): void {
    const state = this.store.getState();
    const viewportRows = Math.max(1, Math.floor(state.viewportHeight / this.rowHeight));
    const delta = direction === "down" ? viewportRows : -viewportRows;
    this.moveFocusedCell(delta, 0);
  }

  tabNavigate(forward: boolean): void {
    const columns = this.getNavigableColumns();
    if (columns.length === 0) return;
    const rowCount = this.rowModel.getRowCount();
    if (rowCount === 0) return;

    const current = this.store.getState().focusedCell;
    if (!current) {
      const row = forward ? 0 : rowCount - 1;
      const col = forward ? columns[0]!.colId : columns[columns.length - 1]!.colId;
      this.setFocusedCell(row, col);
      return;
    }

    const colIndex = Math.max(
      0,
      columns.findIndex((col) => col.colId === current.colId),
    );
    let nextRow = current.rowIndex;
    let nextCol = colIndex + (forward ? 1 : -1);

    if (nextCol >= columns.length) {
      nextCol = 0;
      nextRow += 1;
      if (nextRow >= rowCount) nextRow = 0;
    } else if (nextCol < 0) {
      nextCol = columns.length - 1;
      nextRow -= 1;
      if (nextRow < 0) nextRow = rowCount - 1;
    }

    this.setFocusedCell(nextRow, columns[nextCol]!.colId);
  }

  setFocusedHeader(colId: string | null): void {
    if (colId !== null) {
      const columns = this.getNavigableColumns();
      const exists = columns.some((col) => col.colId === colId);
      if (!exists) return;
    }
    this.store.batch(() => {
      if (colId !== null) {
        const currentBodyCell = this.store.getState().focusedCell;
        if (currentBodyCell) {
          this.lastBodyFocusedCell = { ...currentBodyCell };
        } else {
          this.lastBodyFocusedCell = null;
        }
      }
      this.store.dispatch({ type: "SET_FOCUSED_HEADER", focusedHeaderColId: colId });
      if (colId !== null) {
        this.store.dispatch({ type: "SET_FOCUSED_CELL", focusedCell: null });
      }
    });
  }

  focusBodyFromHeader(): void {
    const columns = this.getNavigableColumns();
    if (columns.length === 0) return;

    const rowCount = this.rowModel.getRowCount();
    if (rowCount === 0) return;

    if (this.lastBodyFocusedCell && this.isValidBodyCell(this.lastBodyFocusedCell)) {
      this.setFocusedCell(
        this.lastBodyFocusedCell.rowIndex,
        this.lastBodyFocusedCell.colId,
      );
      return;
    }

    const state = this.store.getState();
    const firstVisibleRow = getFirstVisibleRowIndex(state.scrollTop, this.rowHeight);
    const rowIndex = Math.min(firstVisibleRow, rowCount - 1);
    this.setFocusedCell(rowIndex, columns[0]!.colId);
  }

  private isValidBodyCell(cell: CellPosition): boolean {
    const rowCount = this.rowModel.getRowCount();
    if (cell.rowIndex < 0 || cell.rowIndex >= rowCount) return false;
    return this.getNavigableColumns().some((col) => col.colId === cell.colId);
  }

  getFocusedHeader(): string | null {
    return this.store.getState().focusedHeaderColId ?? null;
  }

  moveHeaderFocus(delta: number): void {
    const columns = this.getNavigableColumns();
    if (columns.length === 0) return;

    const current = this.store.getState().focusedHeaderColId;
    const currentIndex = current
      ? Math.max(0, columns.findIndex((col) => col.colId === current))
      : -1;
    const nextIndex = Math.max(0, Math.min(columns.length - 1, currentIndex + delta));
    this.setFocusedHeader(columns[nextIndex]!.colId);
  }

  getColumnState(): ColumnState[] {
    return this.columnModel.getColumnState().map((col) => ({ ...col }));
  }

  applyColumnState(params: ApplyColumnStateParams): boolean {
    const currentState = this.store.getState().columns;
    const { columns, success } = mergeColumnState(currentState, params);

    if (params.applyOrder && params.state?.length) {
      const orderedIds = params.state.map((col) => col.colId);
      const mergedColumnDefs = this.reorderColumnDefs(this.getMergedColumnDefs(), orderedIds);
      this.options.columnDefs = mergedColumnDefs;
      this.columnModel.setColumnDefs(mergedColumnDefs);
    }

    this.columnModel.setColumnState(columns);
    this.rebuildRowModel(columns);
    this.store.dispatch({ type: "SET_COLUMNS", columns });
    return success;
  }

  private reorderColumnDefs(
    columnDefs: ColumnDef<TData>[],
    orderedIds: string[],
  ): ColumnDef<TData>[] {
    const byId = new Map(columnDefs.map((def, index) => [resolveColId(def, index), def]));
    const ordered = orderedIds
      .map((colId) => byId.get(colId))
      .filter((def): def is ColumnDef<TData> => def !== undefined);
    const remaining = columnDefs.filter((def, index) => !orderedIds.includes(resolveColId(def, index)));
    return [...ordered, ...remaining];
  }

  startEditingCell(rowIndex: number, colId: string): boolean {
    const node = this.rowModel.getRowAt(rowIndex);
    const column = this.columnModel.getByColId(colId);
    if (!node || !column || column.isSelectionColumn) return false;

    if (!isCellEditable(column.def, node, this.api, this.options.context ?? null)) {
      return false;
    }

    const value = getCellValue(node, column.def, this.api, this.options.context ?? null);
    const editValue =
      value === null || value === undefined ? "" : String(value);

    this.store.batch(() => {
      this.store.dispatch({
        type: "SET_FOCUSED_CELL",
        focusedCell: { rowIndex, colId },
      });
      this.store.dispatch({
        type: "SET_EDITING",
        editing: { activeCell: { rowIndex, colId }, editValue },
      });
    });
    this.syncSelectionFocusedCell({ rowIndex, colId });
    return true;
  }

  updateEditValue(value: string): void {
    const editing = this.store.getState().editing;
    if (!editing) return;
    this.store.dispatch({
      type: "SET_EDITING",
      editing: { ...editing, editValue: value },
    });
  }

  stopEditing(cancel = false): boolean {
    const editing = this.store.getState().editing;
    if (!editing) return true;

    if (cancel) {
      this.store.dispatch({ type: "SET_EDITING", editing: null });
      return true;
    }

    const committed = this.commitEdit(editing.activeCell, editing.editValue);
    if (committed) {
      this.store.dispatch({ type: "SET_EDITING", editing: null });
    }
    return committed;
  }

  stopEditingAndMoveToNextEditable(forward: boolean): boolean {
    const editing = this.store.getState().editing;
    if (!editing) return false;

    const committed = this.commitEdit(editing.activeCell, editing.editValue);
    if (!committed) return false;

    this.store.dispatch({ type: "SET_EDITING", editing: null });

    const next = findNextEditableCell(
      editing.activeCell,
      forward,
      this.getNavigableColumns(),
      (rowIndex) => this.rowModel.getRowAt(rowIndex),
      this.rowModel.getRowCount(),
      this.api,
      this.options.context ?? null,
    );
    if (!next) return true;

    return this.startEditingCell(next.rowIndex, next.colId);
  }

  shouldStopEditingWhenCellsLoseFocus(): boolean {
    return this.options.stopEditingWhenCellsLoseFocus !== false;
  }

  commitFocusedCellEdit(): boolean {
    const editing = this.store.getState().editing;
    if (!editing) return true;
    const committed = this.commitEdit(editing.activeCell, editing.editValue);
    if (committed) {
      this.store.dispatch({ type: "SET_EDITING", editing: null });
    }
    return committed;
  }

  resizeColumn(colId: string, width: number, finished: boolean): void {
    const columns = this.columnModel.setColumnWidth(colId, width);
    this.store.dispatch({ type: "SET_COLUMNS", columns });
    this.options.onColumnResized?.({
      colId,
      width: this.columnModel.getByColId(colId)?.width ?? width,
      api: this.api,
      finished,
    });
  }

  autoSizeColumn(colId: string): void {
    const column = this.columnModel.getByColId(colId);
    if (!column || column.isSelectionColumn) return;

    const cellValues: string[] = [];
    const frame = this.lastFrame;
    if (frame) {
      for (const row of frame.rows) {
        const cell = row.cells.find((c) => c.colId === colId);
        if (cell) cellValues.push(cell.value);
      }
    }

    this.rowModel.forEachNode((node) => {
      const value = formatCellValue(
        getCellValue(node, column.def, this.api, this.options.context ?? null),
        node,
        column.def,
        this.api,
        this.options.context ?? null,
      );
      cellValues.push(value);
    });

    const width = computeAutoColumnWidth(
      column.def.headerName ?? column.colId,
      cellValues,
      column.def.sortable !== false,
    );
    this.resizeColumn(colId, width, true);
  }

  exportDataAsCsv(params?: { fileName?: string; columnSeparator?: string }): void {
    const rows = this.rowModel.getAllFilteredNodes();
    const csv = generateCsv(
      rows,
      this.getMergedColumnDefs(),
      this.api,
      this.options.context ?? null,
      { columnSeparator: params?.columnSeparator },
    );
    downloadCsvContent(csv, params?.fileName ?? "export.csv");
  }

  mount(host: HTMLElement, renderer: RendererAdapter): void {
    if (this.destroyed) {
      throw new Error("Cannot mount a destroyed grid");
    }
    this.host = host;
    this.renderer = renderer;
    this.storeUnsubscribe = this.store.subscribe(() => this.refresh());
    renderer.mount(host, this as GridEngine);
    this.fireGridReady();
    this.refresh();
  }

  unmount(): void {
    this.storeUnsubscribe?.();
    this.storeUnsubscribe = null;
    this.renderer?.unmount();
    this.renderer = null;
    this.host = null;
    this.lastFrame = null;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unmount();
    this.destroyModules();
    this.eventBus.clear();
  }

  toggleColumnSort(colId: string): void {
    if (this.sortController) {
      this.sortController.toggleColumnSort(colId);
      return;
    }
  }

  getSortModel(): SortModel {
    return this.sortController?.getSortModel() ?? readSortModel(this.store.getState().columns);
  }

  setSortModel(model: SortModel, source: "api" | "uiColumnSorted" = "api"): void {
    if (this.sortController) {
      this.sortController.setSortModel(model, source);
      return;
    }
  }

  handleRowClick(rowId: string, event: Pick<MouseEvent, "metaKey" | "ctrlKey">): void {
    const selection = this.store.getState().selection;
    if (!selection) return;

    const prev = selection;
    const next = handleRowClickSelection(selection, {
      rowId,
      multiSelect: event.metaKey || event.ctrlKey,
    });

    if (!selectionChanged(prev, next)) return;

    this.store.dispatch({ type: "SET_SELECTION", selection: next });
    this.options.onSelectionChanged?.({ api: this.api, source: "rowClicked" });
  }

  toggleRowCheckbox(rowId: string): void {
    const selection = this.store.getState().selection;
    if (!selection || selection.mode !== "multiRow") return;

    const prev = selection;
    const next = toggleRowSelection(selection, rowId);
    if (!selectionChanged(prev, next)) return;

    this.store.dispatch({ type: "SET_SELECTION", selection: next });
    this.options.onSelectionChanged?.({ api: this.api, source: "checkboxClicked" });
  }

  toggleHeaderCheckbox(): void {
    const selection = this.store.getState().selection;
    if (!selection || selection.mode !== "multiRow") return;

    const rowIds = this.getDisplayedRowIds();
    const prev = selection;
    const next = toggleSelectAll(selection, rowIds);
    if (!selectionChanged(prev, next)) return;

    this.store.dispatch({ type: "SET_SELECTION", selection: next });
    this.options.onSelectionChanged?.({ api: this.api, source: "headerCheckboxClicked" });
  }

  selectAll(): void {
    const selection = this.store.getState().selection;
    if (!selection || selection.mode !== "multiRow") return;

    const prev = selection;
    const next = selectAllRows(selection, this.getDisplayedRowIds());
    if (!selectionChanged(prev, next)) return;

    this.store.dispatch({ type: "SET_SELECTION", selection: next });
    this.options.onSelectionChanged?.({ api: this.api, source: "selectAll" });
  }

  deselectAll(): void {
    const selection = this.store.getState().selection;
    if (!selection) return;

    const prev = selection;
    const next = deselectAllRows(selection);
    if (!selectionChanged(prev, next)) return;

    this.store.dispatch({ type: "SET_SELECTION", selection: next });
    this.options.onSelectionChanged?.({ api: this.api, source: "deselectAll" });
  }

  private getDisplayedRowIds(): string[] {
    const rowIds: string[] = [];
    this.rowModel.forEachNode((node) => rowIds.push(node.id));
    return rowIds;
  }

  getNavigableColumns(): NormalizedColumn<TData>[] {
    return this.columnModel.getColumns().filter((col) => !col.isSelectionColumn);
  }

  private commitEdit(cell: CellPosition, rawValue: string): boolean {
    const node = this.rowModel.getRowAt(cell.rowIndex);
    const column = this.columnModel.getByColId(cell.colId);
    if (!node || !column) return false;

    const result = commitCellEdit(
      node,
      column.def,
      rawValue,
      this.api,
      this.options.context ?? null,
    );
    if (!result.committed) return false;

    if (result.oldValue !== result.newValue) {
      this.rowModel.updateNodeData(node);
      this.options.onCellValueChanged?.({
        oldValue: result.oldValue,
        newValue: result.newValue,
        data: node.data as TData,
        node,
        colDef: column.def,
        api: this.api,
        context: this.options.context ?? null,
      });
      this.store.dispatch({ type: "BUMP_ROW_DATA_VERSION" });
    }

    return true;
  }

  private syncSelectionFocusedCell(focusedCell: CellPosition): void {
    const selection = this.store.getState().selection;
    if (!selection) return;
    if (
      selection.focusedCell?.rowIndex === focusedCell.rowIndex &&
      selection.focusedCell?.colId === focusedCell.colId
    ) {
      return;
    }
    this.store.dispatch({
      type: "SET_SELECTION",
      selection: { ...selection, focusedCell },
    });
  }

  private applyRowSelectionOption(rowSelection: GridOptions<TData>["rowSelection"]): void {
    this.syncSelectionColumn();
    const mode = rowSelectionToMode(rowSelection);
    if (!mode) {
      this.refresh();
      return;
    }

    const current = this.store.getState().selection;
    const next: SelectionState = {
      ...createSelectionState(mode),
      selectedRowIds: new Set(current?.selectedRowIds ?? []),
      focusedCell: this.store.getState().focusedCell,
    };
    this.store.dispatch({ type: "SET_SELECTION", selection: next });
    this.refresh();
  }

  private syncSelectionColumn(): void {
    this.columnModel.setIncludeSelectionColumn(this.options.rowSelection === "multiple");
  }

  private getMergedColumnDefs(columnDefs = this.options.columnDefs ?? []): ColumnDef<TData>[] {
    return mergeColumnDefs(columnDefs, this.options.defaultColDef);
  }

  private fireGridReady(): void {
    this.options.onGridReady?.({
      api: this.api,
      columnApi: null,
      context: this.options.context ?? null,
    });
  }

  private resolveDirectionalOverscan(scrollTop: number): {
    overscanBefore: number;
    overscanAfter: number;
  } {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const prevTime = this.scrollOverscanState.lastMovementTime;
    const deltaMs = prevTime > 0 ? now - prevTime : undefined;
    const result = computeDirectionalOverscan(
      scrollTop,
      this.scrollOverscanState,
      now,
      this.rowHeight,
      deltaMs,
    );
    this.scrollOverscanState = result.nextState;
    return {
      overscanBefore: result.overscanBefore,
      overscanAfter: result.overscanAfter,
    };
  }

  private refresh(): void {
    if (!this.renderer || this.destroyed) return;

    const state = this.store.getState();
    this.columnModel.setViewportWidth(state.viewportWidth);
    this.columnModel.setColumnState(state.columns);
    this.syncSelectionColumn();

    const directional = this.resolveDirectionalOverscan(state.scrollTop);
    const virtualRange = computeRowVirtualRange({
      rowCount: this.rowModel.getRowCount(),
      rowHeight: this.rowHeight,
      scrollTop: state.scrollTop,
      viewportHeight: state.viewportHeight,
      overscanBefore: directional.overscanBefore,
      overscanAfter: directional.overscanAfter,
    });

    const frame = this.buildRenderFrame(state, virtualRange);

    const rangeChanged =
      !this.lastFrame ||
      this.lastFrame.virtualRange.rowStart !== frame.virtualRange.rowStart ||
      this.lastFrame.virtualRange.rowEnd !== frame.virtualRange.rowEnd ||
      this.lastFrame.rowOffset !== frame.rowOffset ||
      this.lastFrame.totalHeight !== frame.totalHeight ||
      this.lastFrame.totalWidth !== frame.totalWidth ||
      this.lastFrame.renderWidth !== frame.renderWidth;

    this.lastFrame = frame;
    this.renderer.renderFrame(frame);

    if (rangeChanged) {
      this.eventBus.emit("viewportChanged", frame.virtualRange);
    }
  }

  private buildRenderFrame(
    state: ReturnType<GridStore["getState"]>,
    virtualRange: RowVirtualRange,
  ): RenderFrame {
    const filterModel = state.filterModel;
    const defaultColDef = this.options.defaultColDef;
    const pinnedLeftColumns = this.columnModel
      .getPinnedLeftColumns()
      .map((column) => toRenderColumn(column, filterModel, defaultColDef));
    const centerColumns = this.columnModel
      .getCenterColumns()
      .map((column) => toRenderColumn(column, filterModel, defaultColDef));
    const pinnedRightColumns = this.columnModel
      .getPinnedRightColumns()
      .map((column) => toRenderColumn(column, filterModel, defaultColDef));
    const columns = [...pinnedLeftColumns, ...centerColumns, ...pinnedRightColumns];
    const showFloatingFilters =
      this.filterController?.hasFloatingFilters() ??
      columns.some((column) => column.floatingFilter);

    const selectedRowIds = state.selection ? [...state.selection.selectedRowIds] : [];

    const displayedRowIds = this.getDisplayedRowIds();
    const headerCheckboxState =
      state.selection?.mode === "multiRow"
        ? getHeaderCheckboxState(state.selection, displayedRowIds)
        : undefined;

    const rows: RenderFrame["rows"] = [];
    if (virtualRange.rowEnd >= virtualRange.rowStart) {
      for (let rowIndex = virtualRange.rowStart; rowIndex <= virtualRange.rowEnd; rowIndex++) {
        const node = this.rowModel.getRowAt(rowIndex);
        if (!node) continue;
        rows.push(this.buildRenderRow(node, columns, selectedRowIds, state.editing));
      }
    }

    return {
      virtualRange: {
        rowStart: virtualRange.rowStart,
        rowEnd: virtualRange.rowEnd,
        colStart: 0,
        colEnd: Math.max(0, columns.length - 1),
      },
      rowHeight: this.rowHeight,
      rowOffset: virtualRange.rowOffset,
      totalHeight: virtualRange.totalHeight,
      totalWidth: this.columnModel.getTotalWidth(),
      renderWidth: this.columnModel.getRenderWidth(),
      pinnedLeftWidth: this.columnModel.getPinnedLeftWidth(),
      centerWidth: this.columnModel.getCenterWidth(),
      centerViewportWidth: this.columnModel.getCenterViewportWidth(),
      pinnedRightWidth: this.columnModel.getPinnedRightWidth(),
      columns,
      pinnedLeftColumns,
      centerColumns,
      pinnedRightColumns,
      selectedRowIds,
      headerCheckboxState,
      rows,
      focusedCell: state.focusedCell,
      focusedHeaderColId: state.focusedHeaderColId ?? null,
      editing: state.editing,
      filterModel,
      openFilterColId: state.openFilterColId,
      showFloatingFilters,
    };
  }

  private buildRenderRow(
    node: RowNode<TData>,
    columns: RenderFrame["columns"],
    selectedRowIds: readonly string[],
    editing: RenderFrame["editing"],
  ): RenderFrame["rows"][number] {
    const selected = selectedRowIds.includes(node.id);
    const cells = columns.map((column) => {
      if (column.isSelectionColumn) {
        return {
          colId: column.colId,
          value: "",
          isSelectionColumn: true,
          selected,
        };
      }

      const colDef = this.columnModel.getByColId(column.colId)?.def;
      if (!colDef) {
        return { colId: column.colId, value: "" };
      }

      const isEditing =
        editing?.activeCell.rowIndex === node.rowIndex &&
        editing.activeCell.colId === column.colId;

      const value = getCellValue(node, colDef, this.api, this.options.context ?? null);
      const renderer = colDef.cellRenderer;
      const useFrameworkRenderer =
        this.options.frameworkCellRenderers === true && typeof renderer === "function";

      return {
        colId: column.colId,
        value: isEditing
          ? editing.editValue
          : formatCellValue(value, node, colDef, this.api, this.options.context ?? null),
        editable: isCellEditable(colDef, node, this.api, this.options.context ?? null),
        useFrameworkRenderer,
        frameworkRenderer: useFrameworkRenderer ? renderer : undefined,
        cellRenderer: useFrameworkRenderer
          ? undefined
          : (renderer as RenderFrame["rows"][number]["cells"][number]["cellRenderer"]),
        cellRendererParams: colDef.cellRendererParams,
      } satisfies RenderFrame["rows"][number]["cells"][number];
    });

    return {
      id: node.id,
      rowIndex: node.rowIndex,
      selected,
      cells,
    };
  }
}

export function createGridEngine<TData>(
  options: GridOptions<TData> = {},
): GridEngine<TData> {
  return new GridEngine(options);
}
