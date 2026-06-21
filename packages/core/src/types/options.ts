import type { ColumnDef } from "./column.js";
import type { GridEvents } from "./events.js";
import type { GridModule } from "../modules/module-registry.js";
import type { RowModelType } from "./row.js";

export interface GetRowIdParams<TData = unknown> {
  data: TData;
  index: number;
}

export type RowSelectionOption = "single" | "multiple";

export type SortModel = Array<{ colId: string; sort: "asc" | "desc" }>;

export interface GridOptions<TData = unknown> extends GridEvents<TData> {
  columnDefs?: ColumnDef<TData>[];
  defaultColDef?: Partial<ColumnDef<TData>>;
  sortModel?: SortModel;
  rowData?: TData[];
  rowModelType?: RowModelType;
  rowHeight?: number;
  rowSelection?: RowSelectionOption;
  getRowId?: (params: GetRowIdParams<TData>) => string;
  context?: unknown;
  gridId?: string;
  quickFilterText?: string;
  filterModel?: Record<string, unknown>;
  /** When true (default), blur / click outside commits the active edit. When false, cancels. */
  stopEditingWhenCellsLoseFocus?: boolean;
  modules?: GridModule[];
  /** Set by @ol-grid/react so function cellRenderer values use framework portals. */
  frameworkCellRenderers?: boolean;
}
