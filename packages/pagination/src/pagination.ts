export function computeAutoPageSize(viewportHeight: number, rowHeight: number): number {
  if (rowHeight <= 0 || viewportHeight <= 0) return 1;
  return Math.max(1, Math.floor(viewportHeight / rowHeight));
}

export function computeTotalPages(totalRows: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  // Always at least one page so nav controls stay enabled when row count is 0.
  return Math.max(1, Math.ceil(totalRows / pageSize));
}

export function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 0) return 0;
  return Math.max(0, Math.min(page, totalPages - 1));
}

export function slicePageRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = page * pageSize;
  return rows.slice(start, start + pageSize);
}

export function normalizePageSize(size: number): number {
  return Math.max(1, Math.floor(size));
}
