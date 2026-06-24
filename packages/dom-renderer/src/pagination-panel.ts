import type { RenderFrame } from "@ol-grid/core";

export function createPaginationPanel(
  frame: RenderFrame,
  handlers: {
    onFirst: () => void;
    onPrevious: () => void;
    onNext: () => void;
    onLast: () => void;
    onPageSizeChange: (size: number) => void;
  },
): HTMLElement | null {
  const pagination = frame.pagination;
  if (!pagination?.enabled || pagination.suppressPanel) return null;

  const nav = document.createElement("nav");
  nav.className = "ol-grid__pagination";
  nav.setAttribute("role", "navigation");
  nav.setAttribute("aria-label", frame.localeText.page ?? "Pagination");

  const summary = document.createElement("span");
  summary.className = "ol-grid__pagination-summary";
  // Runtime page is 0-based; UI shows 1-based page numbers.
  summary.textContent = `${frame.localeText.page ?? "Page"} ${pagination.page + 1} ${frame.localeText.of ?? "of"} ${pagination.totalPages} (${pagination.totalRows})`;

  const controls = document.createElement("div");
  controls.className = "ol-grid__pagination-controls";

  const first = document.createElement("button");
  first.type = "button";
  first.className = "ol-grid__pagination-button";
  first.textContent = "«";
  first.setAttribute("aria-label", "First page");
  first.disabled = pagination.page <= 0;
  first.addEventListener("click", handlers.onFirst);

  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "ol-grid__pagination-button";
  previous.textContent = "‹";
  previous.setAttribute("aria-label", "Previous page");
  previous.disabled = pagination.page <= 0;
  previous.addEventListener("click", handlers.onPrevious);

  const pageIndicator = document.createElement("span");
  pageIndicator.className = "ol-grid__pagination-page";
  pageIndicator.setAttribute("aria-current", "page");
  pageIndicator.textContent = String(pagination.page + 1);

  const next = document.createElement("button");
  next.type = "button";
  next.className = "ol-grid__pagination-button";
  next.textContent = "›";
  next.setAttribute("aria-label", "Next page");
  next.disabled = pagination.page >= pagination.totalPages - 1;
  next.addEventListener("click", handlers.onNext);

  const last = document.createElement("button");
  last.type = "button";
  last.className = "ol-grid__pagination-button";
  last.textContent = "»";
  last.setAttribute("aria-label", "Last page");
  last.disabled = pagination.page >= pagination.totalPages - 1;
  last.addEventListener("click", handlers.onLast);

  controls.append(first, previous, pageIndicator, next, last);

  const sizeLabel = document.createElement("label");
  sizeLabel.className = "ol-grid__pagination-size";
  if (!pagination.autoPageSize && pagination.pageSizeSelector.length > 0) {
    const sizeText = document.createElement("span");
    sizeText.textContent = frame.localeText.pageSize ?? "Page Size";
    const sizeSelect = document.createElement("select");
    sizeSelect.className = "ol-grid__pagination-size-select";
    for (const size of pagination.pageSizeSelector) {
      const option = document.createElement("option");
      option.value = String(size);
      option.textContent = String(size);
      option.selected = size === pagination.pageSize;
      sizeSelect.appendChild(option);
    }
    sizeSelect.addEventListener("change", () => {
      handlers.onPageSizeChange(Number(sizeSelect.value));
    });
    sizeLabel.append(sizeText, sizeSelect);
    nav.append(summary, controls, sizeLabel);
  } else {
    nav.append(summary, controls);
  }

  return nav;
}
