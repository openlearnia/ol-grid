export interface RowVirtualRangeInput {
  rowCount: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
  overscanRowCount?: number;
}

export interface RowVirtualRange {
  rowStart: number;
  rowEnd: number;
  rowOffset: number;
  totalHeight: number;
}

export function computeRowVirtualRange(input: RowVirtualRangeInput): RowVirtualRange {
  const { rowCount, rowHeight, scrollTop, viewportHeight } = input;
  const overscan = input.overscanRowCount ?? 5;
  const totalHeight = rowCount * rowHeight;

  if (rowCount === 0 || rowHeight <= 0) {
    return { rowStart: 0, rowEnd: -1, rowOffset: 0, totalHeight: 0 };
  }

  const firstVisible = Math.floor(scrollTop / rowHeight);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + 1;
  const rowStart = Math.max(0, firstVisible - overscan);
  const rowEnd = Math.min(rowCount - 1, firstVisible + visibleCount + overscan);
  const rowOffset = rowStart * rowHeight;

  return { rowStart, rowEnd, rowOffset, totalHeight };
}
