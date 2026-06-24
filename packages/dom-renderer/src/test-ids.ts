/** Stable `data-testid` values for grid DOM automation (Playwright, OLTestStack, etc.). */
export const gridTestId = "ol-grid";
export const bodyViewportTestId = "ol-grid-body-viewport";
export const centerViewportTestId = "ol-grid-center-viewport";
export const headerCheckboxTestId = "ol-grid-header-checkbox";

export function headerCellTestId(colId: string): string {
  return `ol-grid-header-${colId}`;
}

export function headerGroupTestId(groupId: string): string {
  return `ol-grid-header-group-${groupId}`;
}

export function bodyCellTestId(rowIndex: number, colId: string): string {
  return `ol-grid-cell-${rowIndex}-${colId}`;
}

export function rowCheckboxTestId(rowIndex: number): string {
  return `ol-grid-row-checkbox-${rowIndex}`;
}

export function rowTestId(rowIndex: number): string {
  return `ol-grid-row-${rowIndex}`;
}

export function floatingFilterTestId(colId: string): string {
  return `ol-grid-floating-filter-${colId}`;
}

export function filterButtonTestId(colId: string): string {
  return `ol-grid-filter-button-${colId}`;
}

export function filterPopupTestId(colId: string): string {
  return `ol-grid-filter-popup-${colId}`;
}

export function filterPopupOperatorTestId(colId: string): string {
  return `ol-grid-filter-operator-${colId}`;
}

export function filterPopupInputTestId(colId: string): string {
  return `ol-grid-filter-input-${colId}`;
}

export function filterPopupInputSecondaryTestId(colId: string): string {
  return `ol-grid-filter-input-secondary-${colId}`;
}

export function filterPopupClearTestId(colId: string): string {
  return `ol-grid-filter-clear-${colId}`;
}

export function sortIndicatorTestId(colId: string): string {
  return `ol-grid-sort-${colId}`;
}
