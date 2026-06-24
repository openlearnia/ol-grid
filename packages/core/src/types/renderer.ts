import type { GridEngine } from "../engine/grid-engine.js";
import type { RenderHeaderRow } from "../column/build-header-rows.js";

export interface CellPosition {
  rowIndex: number;
  colId: string;
}

export interface RenderColumn {
  colId: string;
  headerName: string;
  width: number;
  left: number;
  sort: "asc" | "desc" | null;
  sortIndex?: number | null;
  sortable: boolean;
  pinned: "left" | "right" | null;
  isSelectionColumn?: boolean;
  filterType?: "text" | "number" | "date" | null;
  filterActive?: boolean;
  floatingFilter?: boolean;
  filterParams?: Record<string, unknown>;
}

import type { CellRendererFn } from "./cell-renderer.js";

export interface RenderCell {
  colId: string;
  value: string;
  isSelectionColumn?: boolean;
  selected?: boolean;
  editable?: boolean;
  isStub?: boolean;
  stubFailed?: boolean;
  useFrameworkRenderer?: boolean;
  frameworkRenderer?: unknown;
  cellRenderer?: string | CellRendererFn;
  cellRendererParams?: Record<string, unknown>;
}

export interface RenderRow {
  id: string;
  rowIndex: number;
  selected: boolean;
  cells: RenderCell[];
}

export type HeaderCheckboxState = "checked" | "unchecked" | "indeterminate";

export interface RenderFrame {
  virtualRange: {
    rowStart: number;
    rowEnd: number;
    colStart: number;
    colEnd: number;
  };
  rowHeight: number;
  rowOffset: number;
  totalHeight: number;
  totalWidth: number;
  renderWidth: number;
  pinnedLeftWidth: number;
  centerWidth: number;
  centerViewportWidth: number;
  pinnedRightWidth: number;
  columns: RenderColumn[];
  pinnedLeftColumns: RenderColumn[];
  centerColumns: RenderColumn[];
  pinnedRightColumns: RenderColumn[];
  selectedRowIds: readonly string[];
  headerCheckboxState?: HeaderCheckboxState;
  rows: RenderRow[];
  focusedCell: CellPosition | null;
  focusedHeaderColId: string | null;
  editing: { activeCell: CellPosition; editValue: string } | null;
  filterModel: Record<string, unknown>;
  openFilterColId: string | null;
  showFloatingFilters: boolean;
  overlayLoading?: boolean;
  overlayNoRows?: boolean;
  overlayError?: string | null;
  overlayLoadingTemplate?: string;
  overlayNoRowsTemplate?: string;
  overlayErrorTemplate?: string;
  headerRowCount: number;
  headerHeight: number;
  pinnedLeftHeaderRows: RenderHeaderRow[];
  centerHeaderRows: RenderHeaderRow[];
  pinnedRightHeaderRows: RenderHeaderRow[];
  localeText: Record<string, string>;
  pagination?: {
    enabled: boolean;
    page: number;
    pageSize: number;
    totalPages: number;
    totalRows: number;
    pageSizeSelector: number[];
    autoPageSize: boolean;
    suppressPanel: boolean;
  };
}

export interface RendererAdapter {
  readonly type: "dom" | "canvas";
  mount(host: HTMLElement, engine: GridEngine): void;
  unmount(): void;
  renderFrame(frame: RenderFrame): void;
  /** Sync live DOM scroll into store before ensureIndexVisible (keyboard nav). */
  syncScrollFromViewport?(): void;
  reportRowHeight(index: number, height: number): void;
  reportColumnWidth(index: number, width: number): void;
  getCellHost(position: CellPosition): HTMLElement;
  getEditorHost(): HTMLElement;
}
