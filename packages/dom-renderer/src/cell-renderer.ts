import type { CellRendererFn, CellRendererParams } from "@ol-grid/core";

export function resolveCellRenderer<TData>(
  cellRenderer: string | CellRendererFn<TData> | undefined,
  registry: Map<string, CellRendererFn<TData>>,
): CellRendererFn<TData> | undefined {
  if (!cellRenderer) return undefined;
  if (typeof cellRenderer === "string") {
    return registry.get(cellRenderer);
  }
  return cellRenderer;
}

export function renderCellContent<TData>(
  cellEl: HTMLElement,
  params: CellRendererParams<TData>,
  cellRenderer: string | CellRendererFn<TData> | undefined,
  registry: Map<string, CellRendererFn<TData>>,
  fallbackValue: string,
): void {
  const renderer = resolveCellRenderer(cellRenderer, registry);
  if (!renderer) {
    cellEl.textContent = fallbackValue;
    return;
  }

  const result = renderer(params);
  if (typeof result === "string") {
    cellEl.textContent = result;
    return;
  }
  // HTMLElement results replace cell contents — used by custom DOM renderers.
  if (result instanceof HTMLElement) {
    cellEl.replaceChildren(result);
    return;
  }
  cellEl.textContent = fallbackValue;
}
