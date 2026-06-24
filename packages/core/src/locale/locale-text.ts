export interface LocaleText {
  noRowsToShow?: string;
  loadingOoo?: string;
  errorLoading?: string;
  page?: string;
  pageSize?: string;
  of?: string;
  to?: string;
  more?: string;
  selectAll?: string;
  selectRow?: string;
  deselectAll?: string;
  sortAscending?: string;
  sortDescending?: string;
  sortUnSort?: string;
  filterOoo?: string;
  equals?: string;
  notEqual?: string;
  contains?: string;
  notContains?: string;
  startsWith?: string;
  endsWith?: string;
  lessThan?: string;
  greaterThan?: string;
  inRange?: string;
  applyFilter?: string;
  resetFilter?: string;
  clearFilter?: string;
  cancel?: string;
  save?: string;
  copy?: string;
  paste?: string;
  ctrlC?: string;
  ctrlV?: string;
  export?: string;
  csvExport?: string;
  excelExport?: string;
  openFilter?: string;
  floatingFilter?: string;
}

export type LocaleTextKey = keyof LocaleText;

/** Minimal English defaults used when no locale package is loaded. */
export const DEFAULT_LOCALE_TEXT: Required<LocaleText> = {
  noRowsToShow: "No Rows To Show",
  loadingOoo: "Loading...",
  errorLoading: "Error loading rows",
  page: "Page",
  pageSize: "Page Size",
  of: "of",
  to: "to",
  more: "More",
  selectAll: "Select All",
  selectRow: "Select Row",
  deselectAll: "Deselect All",
  sortAscending: "Sorted Ascending",
  sortDescending: "Sorted Descending",
  sortUnSort: "Unsorted",
  filterOoo: "Filter...",
  equals: "Equals",
  notEqual: "Not equal",
  contains: "Contains",
  notContains: "Not contains",
  startsWith: "Starts with",
  endsWith: "Ends with",
  lessThan: "Less than",
  greaterThan: "Greater than",
  inRange: "In range",
  applyFilter: "Apply",
  resetFilter: "Reset",
  clearFilter: "Clear",
  cancel: "Cancel",
  save: "Save",
  copy: "Copy",
  paste: "Paste",
  ctrlC: "Ctrl+C",
  ctrlV: "Ctrl+V",
  export: "Export",
  csvExport: "CSV Export",
  excelExport: "Excel Export",
  openFilter: "Open filter",
  floatingFilter: "Floating filter",
};
