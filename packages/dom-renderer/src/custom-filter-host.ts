import type {
  CustomFilterModel,
  FilterComponent,
  FilterComponentFactory,
  FilterDisplayParams,
} from "@ol-grid/core";
import { filterPopupClearTestId, filterPopupTestId } from "./test-ids.js";

export interface CustomFilterPopupOptions {
  colId: string;
  headerName: string;
  model: unknown;
  anchor: HTMLElement;
  host: HTMLElement;
  filterParams?: Record<string, unknown>;
  createComponent: FilterComponentFactory;
  onApply: (model: CustomFilterModel | null) => void;
  onClose: () => void;
}

export function mountCustomFilterPopup(options: CustomFilterPopupOptions): () => void {
  let currentModel: CustomFilterModel | null =
    options.model &&
    typeof options.model === "object" &&
    (options.model as CustomFilterModel).filterType === "custom"
      ? { ...(options.model as CustomFilterModel) }
      : { filterType: "custom" };

  const popup = document.createElement("div");
  popup.className = "ol-grid__filter-popup ol-grid__filter-popup--custom";
  popup.dataset.filterPopup = "true";
  popup.dataset.colId = options.colId;
  popup.dataset.testid = filterPopupTestId(options.colId);
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", `Filter ${options.headerName}`);

  const title = document.createElement("div");
  title.className = "ol-grid__filter-popup-title";
  title.textContent = options.headerName;

  const body = document.createElement("div");
  body.className = "ol-grid__filter-popup-body";
  body.dataset.filterPopupControl = "true";

  const actions = document.createElement("div");
  actions.className = "ol-grid__filter-popup-actions";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "ol-grid__filter-popup-clear";
  clearBtn.dataset.testid = filterPopupClearTestId(options.colId);
  clearBtn.textContent = "Clear";

  actions.append(clearBtn);
  popup.append(title, body, actions);
  options.host.appendChild(popup);

  const rect = options.anchor.getBoundingClientRect();
  const hostRect = options.host.getBoundingClientRect();
  popup.style.left = `${rect.left - hostRect.left}px`;
  popup.style.top = `${rect.bottom - hostRect.top + 4}px`;
  popup.style.minWidth = `${Math.max(rect.width, 180)}px`;

  let component: FilterComponent | null = null;

  const commit = () => {
    const next = component?.getModel() ?? null;
    options.onApply(next && component?.isFilterActive() ? next : null);
  };

  const displayParams: FilterDisplayParams = {
    colDef: { field: options.colId, headerName: options.headerName },
    colId: options.colId,
    api: null,
    context: null,
    filterParams: options.filterParams,
    filterChangedCallback: () => commit(),
    getModel: () => currentModel,
    setModel: (model) => {
      currentModel = model;
    },
  };

  component = options.createComponent(displayParams);
  component.init(displayParams);
  component.setModel(currentModel);
  body.replaceChildren(component.getGui());

  clearBtn.addEventListener("click", () => {
    component?.setModel({ filterType: "custom" });
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

  const focusable = body.querySelector<HTMLElement>(
    "input, select, button, textarea, [tabindex]:not([tabindex='-1'])",
  );
  focusable?.focus();

  return () => {
    component?.destroy?.();
    document.removeEventListener("mousedown", onDocumentMouseDown);
    document.removeEventListener("keydown", onDocumentKeyDown);
    popup.remove();
  };
}
