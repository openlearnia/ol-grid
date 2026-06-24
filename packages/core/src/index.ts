import { createGridEngine, GridEngine } from "./engine/grid-engine.js";
import { EventBus } from "./events/event-bus.js";
import { ModuleRegistry } from "./modules/module-registry.js";
import { createGridStore } from "./store/grid-store.js";

export type { GridApi, CsvExportParams, StartEditingCellParams, ProcessCellForExportParams, ProcessHeaderForExportParams, RowDataTransaction, RowDataTransactionResult } from "./types/api.js";
export type {
  ColumnDef,
  ColumnState,
  ColumnGroupState,
  ApplyColumnStateParams,
  SortComparatorFn,
  ValueGetterParams,
  ValueParserParams,
  ValueSetterParams,
  ValueFormatterParams,
  EditableCallbackParams,
} from "./types/column.js";
export type { CellRendererParams, CellRendererFn } from "./types/cell-renderer.js";
export type {
  GridReadyEvent,
  CellClickedEvent,
  SelectionChangedEvent,
  SortChangedEvent,
  FilterChangedEvent,
  FilterOpenedEvent,
  DisplayedColumnsChangedEvent,
  CellValueChangedEvent,
  ColumnResizedEvent,
  RowDataUpdatedEvent,
  GridEvents,
} from "./types/events.js";
export type { GridOptions, GetRowIdParams, RowSelectionOption, SortModel, InfiniteDatasource, InfiniteGetRowsParams } from "./types/options.js";
export type { LocaleText, LocaleTextKey } from "./locale/locale-text.js";
export { DEFAULT_LOCALE_TEXT } from "./locale/locale-text.js";
export { mergeLocaleText } from "./locale/merge-locale-text.js";
export { createLocaleResolver } from "./locale/get-locale-text.js";
export { flattenColumnDefs, isColumnGroup } from "./column/flatten-column-defs.js";
export { buildHeaderRows, hasColumnGroups } from "./column/build-header-rows.js";
export type { RenderHeaderCell, RenderHeaderRow, HeaderRowsResult } from "./column/build-header-rows.js";
export type {
  RendererAdapter,
  RenderFrame,
  RenderColumn,
  RenderRow,
  RenderCell,
} from "./types/renderer.js";
export type { RowNode, RowModelType, RowModelMeta } from "./types/row.js";
export type { GridState, SelectionState, SortingState, CellPosition, EditingState } from "./types/state.js";
export type { GridStore, GridAction, StoreListener, Unsubscribe, StateSelector } from "./store/grid-store.js";
export type { GridModule, RowModelStage, RowModelStageContext } from "./modules/module-registry.js";
export type { GridContext } from "./modules/grid-context.js";

export { GridEngine, createGridEngine };
export { EventBus };
export { OlGridError, requireGridModule } from "./errors/ol-grid-error.js";
export type { GridEventMap, GridEventType } from "./events/grid-events.js";
export { ModuleRegistry };
export { createGridStore };
export { createGridContext } from "./modules/grid-context.js";
export {
  createSelectionState,
  deselectAllRows,
  getHeaderCheckboxState,
  handleRowClickSelection,
  isRowSelected,
  rowSelectionToMode,
  selectAllRows,
  selectRowRange,
  toggleRowSelection,
  toggleSelectAll,
} from "./selection/selection-manager.js";
export type { HeaderCheckboxState } from "./selection/selection-manager.js";
export { SELECTION_COLUMN_ID } from "./column/column-model.js";
export { resolveColId } from "./column/resolve-col-id.js";
export { normalizeQuickFilterText, rowMatchesQuickFilter, filterRowsByQuickFilter } from "./filter/quick-filter.js";
export { generateCsv, downloadCsvContent, resolveCsvExportOptions } from "./export/csv-export.js";
export { applyRowDataTransaction } from "./row/apply-transaction.js";
export { isCellEditable } from "./row/is-cell-editable.js";
export { setCellValue } from "./row/set-cell-value.js";
export { commitCellEdit } from "./row/commit-cell-edit.js";
export type { CommitCellEditResult } from "./row/commit-cell-edit.js";
export { findNextEditableCell } from "./row/find-next-editable-cell.js";
export { getCellValue, formatCellValue } from "./row/get-cell-value.js";
export {
  computeRowVirtualRange,
  computeVelocityOverscanBoost,
  computeDirectionalOverscan,
  overscanForScrollIntent,
  DEFAULT_OVERSCAN_ROW_COUNT,
  DIRECTIONAL_SCROLL_BUFFER_ROWS,
  SCROLL_SETTLE_MS,
  DIRECTIONAL_VELOCITY_MAX_BOOST,
  getFirstVisibleRowIndex,
} from "./virtualizer/compute-row-range.js";
export type {
  RowVirtualRange,
  RowVirtualRangeInput,
  ScrollDirection,
  ScrollOverscanState,
  DirectionalOverscanResult,
} from "./virtualizer/compute-row-range.js";

/** Primary entry point — alias for createGridEngine. */
export function createGrid<TData>(options: Parameters<typeof createGridEngine<TData>>[0] = {}) {
  return createGridEngine(options);
}
