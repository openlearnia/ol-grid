import type { GridEngine } from "../engine/grid-engine.js";

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
  sortable: boolean;
  pinned: "left" | "right" | null;
  isSelectionColumn?: boolean;
}

import type { CellRendererFn } from "./cell-renderer.js";

export interface RenderCell {
  colId: string;
  value: string;
  isSelectionColumn?: boolean;
  selected?: boolean;
  editable?: boolean;
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
  pinnedLeftWidth: number;
  centerWidth: number;
  pinnedRightWidth: number;
  columns: RenderColumn[];
  pinnedLeftColumns: RenderColumn[];
  centerColumns: RenderColumn[];
  pinnedRightColumns: RenderColumn[];
  selectedRowIds: readonly string[];
  headerCheckboxState?: HeaderCheckboxState;
  rows: RenderRow[];
  focusedCell: CellPosition | null;
  editing: { activeCell: CellPosition; editValue: string } | null;
}

export interface RendererAdapter {
  readonly type: "dom" | "canvas";
  mount(host: HTMLElement, engine: GridEngine): void;
  unmount(): void;
  renderFrame(frame: RenderFrame): void;
  reportRowHeight(index: number, height: number): void;
  reportColumnWidth(index: number, width: number): void;
  getCellHost(position: CellPosition): HTMLElement;
  getEditorHost(): HTMLElement;
}
