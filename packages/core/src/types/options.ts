import type { ColumnDef } from "./column.js";
import type { LocaleText } from "../locale/locale-text.js";
import type { GridEvents } from "./events.js";
import type { GridModule } from "../modules/module-registry.js";
import type { RowModelType } from "./row.js";

export interface GetRowIdParams<TData = unknown> {
  data: TData;
  index: number;
}

export type RowSelectionOption = "single" | "multiple";

export type SortModel = Array<{ colId: string; sort: "asc" | "desc" }>;

export interface InfiniteGetRowsParams<TData = unknown> {
  startRow: number;
  endRow: number;
  sortModel: SortModel;
  filterModel: Record<string, unknown>;
  context: unknown;
  success: (result: { rows: TData[]; rowCount?: number }) => void;
  fail: () => void;
  requestId: number;
}

export interface InfiniteDatasource<TData = unknown> {
  getRows(params: InfiniteGetRowsParams<TData>): void | Promise<void>;
  destroy?(): void;
}

export interface GridOptions<TData = unknown> extends GridEvents<TData> {
  columnDefs?: ColumnDef<TData>[];
  defaultColDef?: Partial<ColumnDef<TData>>;
  sortModel?: SortModel;
  rowData?: TData[];
  rowModelType?: RowModelType;
  datasource?: InfiniteDatasource<TData>;
  cacheBlockSize?: number;
  maxBlocksInCache?: number;
  infiniteInitialRowCount?: number;
  overlayLoadingTemplate?: string;
  overlayNoRowsTemplate?: string;
  overlayErrorTemplate?: string;
  rowHeight?: number;
  rowSelection?: RowSelectionOption;
  getRowId?: (params: GetRowIdParams<TData>) => string;
  context?: unknown;
  gridId?: string;
  quickFilterText?: string;
  filterModel?: Record<string, unknown>;
  /** Controlled selection: row ids currently selected. Omit for uncontrolled selection state. */
  selectedRowIds?: string[];
  /** When true (default), blur / click outside commits the active edit. When false, cancels. */
  stopEditingWhenCellsLoseFocus?: boolean;
  modules?: GridModule[];
  /** Set by @ol-grid/react so function cellRenderer values use framework portals. */
  frameworkCellRenderers?: boolean;
  /** BCP 47 locale tag for formatting and built-in UI strings. */
  locale?: string;
  /** Partial override of built-in UI strings (deep-merged over locale bundle). */
  localeText?: Partial<LocaleText>;
  /** Active locale bundle merged before localeText overrides. */
  localeBundle?: Partial<LocaleText>;
  /** Visual theme: light, dark, system (prefers-color-scheme), or custom data-ol-theme value. */
  theme?: "light" | "dark" | "system" | string;
}
