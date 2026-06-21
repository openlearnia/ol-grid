import type { RenderColumn } from "@ol-grid/core";
import { createFilterIcon } from "./icons.js";

type FilterType = "text" | "number" | "date";

interface FilterModelEntry {
  filterType: FilterType;
  type: string;
  filter?: string | number | null;
  filterTo?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

const TEXT_OPTIONS = [
  ["contains", "Contains"],
  ["notContains", "Not contains"],
  ["equals", "Equals"],
  ["notEqual", "Not equal"],
  ["startsWith", "Starts with"],
  ["endsWith", "Ends with"],
] as const;

const NUMBER_OPTIONS = [
  ["equals", "Equals"],
  ["notEqual", "Not equal"],
  ["lessThan", "Less than"],
  ["lessThanOrEqual", "Less than or equal"],
  ["greaterThan", "Greater than"],
  ["greaterThanOrEqual", "Greater than or equal"],
  ["inRange", "In range"],
] as const;

const DATE_OPTIONS = [
  ["equals", "Equals"],
  ["notEqual", "Not equal"],
  ["lessThan", "Before"],
  ["greaterThan", "After"],
  ["inRange", "In range"],
] as const;

/** Debounce for text filter value inputs (popup + floating). */
const FILTER_INPUT_DEBOUNCE_MS = 400;

function modelToApply(model: FilterModelEntry): FilterModelEntry | null {
  if (readPrimaryValue(model) === "") return null;
  return model;
}

function cloneModel(model: FilterModelEntry): FilterModelEntry {
  return { ...model };
}

function defaultModel(filterType: FilterType): FilterModelEntry {
  switch (filterType) {
    case "number":
      return { filterType: "number", type: "equals", filter: null };
    case "date":
      return { filterType: "date", type: "equals", dateFrom: null };
    default:
      return { filterType: "text", type: "contains", filter: "" };
  }
}

function modelFromState(
  filterType: FilterType,
  existing: unknown,
): FilterModelEntry {
  if (existing && typeof existing === "object" && (existing as FilterModelEntry).filterType === filterType) {
    return cloneModel(existing as FilterModelEntry);
  }
  return defaultModel(filterType);
}

function readPrimaryValue(model: FilterModelEntry): string {
  if (model.filterType === "text") return String(model.filter ?? "");
  if (model.filterType === "number") {
    return model.filter == null ? "" : String(model.filter);
  }
  return model.dateFrom ?? "";
}

function readSecondaryValue(model: FilterModelEntry): string {
  if (model.filterType === "number" && model.type === "inRange") {
    return model.filterTo == null ? "" : String(model.filterTo);
  }
  if (model.filterType === "date" && model.type === "inRange") {
    return model.dateTo ?? "";
  }
  return "";
}

function writePrimaryValue(model: FilterModelEntry, value: string): FilterModelEntry {
  const next = cloneModel(model);
  if (next.filterType === "text") {
    next.filter = value;
    return next;
  }
  if (next.filterType === "number") {
    next.filter = value === "" ? null : Number(value);
    return next;
  }
  next.dateFrom = value || null;
  return next;
}

function writeSecondaryValue(model: FilterModelEntry, value: string): FilterModelEntry {
  const next = cloneModel(model);
  if (next.filterType === "number") {
    next.filterTo = value === "" ? null : Number(value);
    return next;
  }
  next.dateTo = value || null;
  return next;
}

function needsSecondaryInput(model: FilterModelEntry): boolean {
  return model.type === "inRange";
}

function primaryInputType(model: FilterModelEntry): string {
  if (model.filterType === "number") return "number";
  if (model.filterType === "date") return "date";
  return "text";
}

function operatorOptions(filterType: FilterType): readonly (readonly [string, string])[] {
  switch (filterType) {
    case "number":
      return NUMBER_OPTIONS;
    case "date":
      return DATE_OPTIONS;
    default:
      return TEXT_OPTIONS;
  }
}

export function createFilterButton(colId: string, active: boolean): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ol-grid__filter-button";
  button.dataset.filterButton = "true";
  button.dataset.colId = colId;
  button.setAttribute("aria-label", "Open filter");
  button.title = "Filter";
  button.replaceChildren(createFilterIcon());
  button.classList.toggle("ol-grid__filter-button--active", active);
  return button;
}

export interface FilterPopupOptions {
  colId: string;
  headerName: string;
  filterType: FilterType;
  model: unknown;
  anchor: HTMLElement;
  host: HTMLElement;
  onApply: (model: FilterModelEntry | null) => void;
  onClose: () => void;
}

export function mountFilterPopup(options: FilterPopupOptions): () => void {
  let draft = modelFromState(options.filterType, options.model);

  const popup = document.createElement("div");
  popup.className = "ol-grid__filter-popup";
  popup.dataset.filterPopup = "true";
  popup.dataset.colId = options.colId;
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", `Filter ${options.headerName}`);

  const title = document.createElement("div");
  title.className = "ol-grid__filter-popup-title";
  title.textContent = options.headerName;

  const operator = document.createElement("select");
  operator.className = "ol-grid__filter-popup-operator";
  operator.tabIndex = 0;
  operator.dataset.filterPopupControl = "true";
  operator.setAttribute("aria-label", "Filter operator");
  for (const [value, label] of operatorOptions(options.filterType)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    operator.appendChild(option);
  }
  operator.value = draft.type;

  const primary = document.createElement("input");
  primary.className = "ol-grid__filter-popup-input";
  primary.type = primaryInputType(draft);
  primary.value = readPrimaryValue(draft);
  primary.tabIndex = 0;
  primary.dataset.filterPopupControl = "true";
  primary.setAttribute("aria-label", "Filter value");

  const secondary = document.createElement("input");
  secondary.className = "ol-grid__filter-popup-input ol-grid__filter-popup-input--secondary";
  secondary.type = primaryInputType(draft);
  secondary.value = readSecondaryValue(draft);
  secondary.tabIndex = 0;
  secondary.dataset.filterPopupControl = "true";
  secondary.setAttribute("aria-label", "Filter second value");
  secondary.hidden = !needsSecondaryInput(draft);

  const actions = document.createElement("div");
  actions.className = "ol-grid__filter-popup-actions";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "ol-grid__filter-popup-clear";
  clearBtn.textContent = "Clear";

  actions.append(clearBtn);
  popup.append(title, operator, primary, secondary, actions);
  options.host.appendChild(popup);

  const rect = options.anchor.getBoundingClientRect();
  const hostRect = options.host.getBoundingClientRect();
  popup.style.left = `${rect.left - hostRect.left}px`;
  popup.style.top = `${rect.bottom - hostRect.top + 4}px`;
  popup.style.minWidth = `${Math.max(rect.width, 180)}px`;

  let timer: ReturnType<typeof setTimeout> | null = null;

  const commit = () => {
    options.onApply(modelToApply(draft));
  };

  const commitImmediate = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    commit();
  };

  const scheduleCommit = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(commit, FILTER_INPUT_DEBOUNCE_MS);
  };

  const syncSecondary = () => {
    secondary.hidden = !needsSecondaryInput(draft);
  };

  operator.addEventListener("change", () => {
    draft = { ...draft, type: operator.value };
    syncSecondary();
    commitImmediate();
  });

  primary.addEventListener("input", () => {
    draft = writePrimaryValue(draft, primary.value);
    if (options.filterType === "text") {
      scheduleCommit();
    } else {
      commitImmediate();
    }
  });

  secondary.addEventListener("input", () => {
    draft = writeSecondaryValue(draft, secondary.value);
    commitImmediate();
  });

  clearBtn.addEventListener("click", () => {
    if (timer) clearTimeout(timer);
    timer = null;
    options.onApply(null);
    options.onClose();
  });

  const onDocumentMouseDown = (event: MouseEvent) => {
    const target = event.target as Node | null;
    if (!target) return;
    if (popup.contains(target) || options.anchor.contains(target)) return;
    options.onClose();
  };

  const onDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      options.onClose();
    }
  };

  document.addEventListener("mousedown", onDocumentMouseDown);
  document.addEventListener("keydown", onDocumentKeyDown);
  primary.focus();

  return () => {
    if (timer) clearTimeout(timer);
    document.removeEventListener("mousedown", onDocumentMouseDown);
    document.removeEventListener("keydown", onDocumentKeyDown);
    popup.remove();
  };
}

export function createFloatingFilterInput(
  column: RenderColumn,
  model: unknown,
  onChange: (model: FilterModelEntry | null) => void,
): HTMLElement {
  const filterType = column.filterType ?? "text";
  let draft = modelFromState(filterType, model);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const wrapper = document.createElement("div");
  wrapper.className = "ol-grid__floating-filter-cell";
  wrapper.dataset.colId = column.colId;

  const input = document.createElement("input");
  input.className = "ol-grid__floating-filter-input";
  input.type = primaryInputType(draft);
  input.placeholder = `Filter ${column.headerName}`;
  input.value = readPrimaryValue(draft);
  input.tabIndex = 0;
  input.dataset.floatingFilterInput = "true";
  input.setAttribute("aria-label", `Floating filter ${column.headerName}`);

  const scheduleApply = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      onChange(modelToApply(draft));
    }, FILTER_INPUT_DEBOUNCE_MS);
  };

  input.addEventListener("input", () => {
    draft = writePrimaryValue(draft, input.value);
    scheduleApply();
  });

  wrapper.appendChild(input);
  return wrapper;
}

/** Sync floating filter input from store when it is not actively focused. */
export function syncFloatingFilterInputValue(
  input: HTMLInputElement,
  column: RenderColumn,
  model: unknown,
): void {
  if (document.activeElement === input) return;
  const filterType = column.filterType ?? "text";
  const draft = modelFromState(filterType, model);
  const nextValue = readPrimaryValue(draft);
  if (input.value !== nextValue) {
    input.value = nextValue;
  }
}

export type { FilterModelEntry, FilterType };
