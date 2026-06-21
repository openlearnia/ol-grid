import type { FilterChangedEvent, SelectionChangedEvent, SortChangedEvent } from "../types/events.js";

export interface DisplayedColumnsChangedEvent {
  api: import("../types/api.js").GridApi;
  source: string;
}

export interface FilterOpenedEvent {
  api: import("../types/api.js").GridApi;
  colId: string;
  column: unknown;
}

export type GridEventType =
  | "filterChanged"
  | "selectionChanged"
  | "sortChanged"
  | "displayedColumnsChanged"
  | "filterOpened";

export interface GridEventMap {
  filterChanged: FilterChangedEvent;
  selectionChanged: SelectionChangedEvent;
  sortChanged: SortChangedEvent;
  displayedColumnsChanged: DisplayedColumnsChangedEvent;
  filterOpened: FilterOpenedEvent;
}
