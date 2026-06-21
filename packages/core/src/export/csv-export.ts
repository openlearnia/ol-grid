import type { ColumnDef } from "../types/column.js";
import type { RowNode } from "../types/row.js";
import { formatCellValue, getCellValue } from "../row/get-cell-value.js";
import { resolveColId } from "../column/resolve-col-id.js";
import { SELECTION_COLUMN_ID } from "../column/column-model.js";
import type {
  CsvExportParams,
  ProcessCellForExportParams,
  ProcessHeaderForExportParams,
} from "../types/api.js";

export interface CsvExportOptions<TData = unknown> {
  columnSeparator?: string;
  includeHeaders?: boolean;
  processCellCallback?: (params: ProcessCellForExportParams<TData>) => string;
  processHeaderCallback?: (params: ProcessHeaderForExportParams<TData>) => string;
}

function escapeCsvField(value: string, separator: string): string {
  if (value.includes('"') || value.includes(separator) || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function resolveExportColumns<TData>(
  columnDefs: ColumnDef<TData>[],
): ColumnDef<TData>[] {
  return columnDefs.filter((def, index) => {
    if (def.hide) return false;
    const colId = resolveColId(def, index);
    return colId !== SELECTION_COLUMN_ID;
  });
}

export function generateCsv<TData>(
  rows: RowNode<TData>[],
  columnDefs: ColumnDef<TData>[],
  api: unknown,
  context: unknown,
  options: CsvExportOptions = {},
): string {
  const separator = options.columnSeparator ?? ",";
  const includeHeaders = options.includeHeaders ?? true;
  const visibleColumns = resolveExportColumns(columnDefs);

  const lines: string[] = [];

  if (includeHeaders) {
    const headers = visibleColumns.map((def, index) => {
      const headerText = def.headerName ?? resolveColId(def, index);
      if (options.processHeaderCallback) {
        const params: ProcessHeaderForExportParams<TData> = {
          column: def,
          colDef: def,
          api: api as ProcessHeaderForExportParams<TData>["api"],
          context,
        };
        return escapeCsvField(
          (options.processHeaderCallback as (params: ProcessHeaderForExportParams<TData>) => string)(params),
          separator,
        );
      }
      return escapeCsvField(headerText, separator);
    });
    lines.push(headers.join(separator));
  }

  for (const node of rows) {
    const fields = visibleColumns.map((colDef) => {
      const value = getCellValue(node, colDef, api, context);
      let display: string;
      if (options.processCellCallback) {
        const params: ProcessCellForExportParams<TData> = {
          value,
          node,
          column: colDef,
          colDef,
          api: api as ProcessCellForExportParams<TData>["api"],
          context,
        };
        display = (options.processCellCallback as (params: ProcessCellForExportParams<TData>) => string)(params);
      } else {
        display = formatCellValue(value, node, colDef, api, context);
      }
      return escapeCsvField(display, separator);
    });
    lines.push(fields.join(separator));
  }

  return lines.join("\r\n");
}

export function resolveCsvExportOptions<TData = unknown>(params?: CsvExportParams): CsvExportOptions<TData> {
  return {
    columnSeparator: params?.columnSeparator,
    includeHeaders: params?.includeHeaders,
    processCellCallback: params?.processCellCallback as CsvExportOptions<TData>["processCellCallback"],
    processHeaderCallback: params?.processHeaderCallback as CsvExportOptions<TData>["processHeaderCallback"],
  };
}

export function downloadCsvContent(csv: string, fileName: string): void {
  if (typeof document === "undefined") return;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
