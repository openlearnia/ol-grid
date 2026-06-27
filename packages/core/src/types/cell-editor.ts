import type { GridApi } from "./api.js";
import type { ColumnDef } from "./column.js";
import type { RowNode } from "./row.js";

export interface CellEditorParams<TData = unknown> {
  value: unknown;
  data: TData;
  node: RowNode<TData>;
  colDef: ColumnDef<TData>;
  colId: string;
  api: GridApi<TData>;
  context: unknown;
  rowIndex: number;
  stopEditing: (cancel?: boolean) => void;
  onValueChange?: (value: unknown) => void;
  eventKey: string | null;
  cellEditorParams?: Record<string, unknown>;
}

export interface CellEditor<TData = unknown> {
  init(params: CellEditorParams<TData>): void;
  getValue(): unknown;
  isCancelBeforeStart?(): boolean;
  isCancelAfterEnd?(): boolean;
  destroy?(): void;
  afterGuiAttached?(): void;
  getGui?(): HTMLElement;
}

export type CellEditorFactory<TData = unknown> = (
  params: CellEditorParams<TData>,
) => CellEditor<TData>;

export interface CellEditorRegistration<TData = unknown> {
  create: CellEditorFactory<TData>;
}

export const PROVIDED_CELL_EDITOR_TYPES = [
  "text",
  "number",
  "select",
  "date",
  "largeText",
] as const;

export type ProvidedCellEditorType = (typeof PROVIDED_CELL_EDITOR_TYPES)[number];

export function isProvidedCellEditorType(
  value: unknown,
): value is ProvidedCellEditorType {
  return (
    value === "text" ||
    value === "number" ||
    value === "select" ||
    value === "date" ||
    value === "largeText"
  );
}

/** True when cellEditor is a framework component (function) and portals are enabled. */
export function isFrameworkCellEditor(
  colDef: Pick<ColumnDef, "cellEditor">,
  frameworkCellEditors?: boolean,
): boolean {
  return frameworkCellEditors === true && typeof colDef.cellEditor === "function";
}

/** True when cellEditor is a registered string key (not a built-in provided type). */
export function isRegisteredCellEditorKey(
  colDef: Pick<ColumnDef, "cellEditor">,
): boolean {
  const editor = colDef.cellEditor;
  return typeof editor === "string" && !isProvidedCellEditorType(editor);
}
