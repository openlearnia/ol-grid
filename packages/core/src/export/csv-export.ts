import type { ColumnDef } from "../types/column.js";
import type { RowNode } from "../types/row.js";
import { formatCellValue, getCellValue } from "../row/get-cell-value.js";
import { resolveColId } from "../column/resolve-col-id.js";

export interface CsvExportOptions {
  columnSeparator?: string;
  includeHeaders?: boolean;
}

function escapeCsvField(value: string, separator: string): string {
  if (value.includes('"') || value.includes(separator) || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
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
  const visibleColumns = columnDefs.filter((def) => !def.hide);

  const lines: string[] = [];

  if (includeHeaders) {
    const headers = visibleColumns.map((def, index) =>
      escapeCsvField(def.headerName ?? resolveColId(def, index), separator),
    );
    lines.push(headers.join(separator));
  }

  for (const node of rows) {
    const fields = visibleColumns.map((colDef) => {
      const value = getCellValue(node, colDef, api, context);
      const display = formatCellValue(value, node, colDef, api, context);
      return escapeCsvField(display, separator);
    });
    lines.push(fields.join(separator));
  }

  return lines.join("\r\n");
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
