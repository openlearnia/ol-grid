import type { ColumnDef } from "../types/column.js";

export interface ColumnMoveOptions {
  suppressColumnMove?: boolean;
}

export function isColumnMovable(
  def: Pick<ColumnDef, "suppressMovable" | "lockPosition">,
  options: ColumnMoveOptions = {},
): boolean {
  if (options.suppressColumnMove) return false;
  if (def.suppressMovable || def.lockPosition) return false;
  return true;
}
