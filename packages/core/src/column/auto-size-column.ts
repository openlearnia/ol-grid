const CELL_PADDING = 24;
const HEADER_PADDING = 24;
const SORT_INDICATOR_WIDTH = 16;
const MIN_AUTO_WIDTH = 50;

let measureCanvas: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!measureCanvas) {
    const canvas = document.createElement("canvas");
    measureCanvas = canvas.getContext("2d");
    if (measureCanvas) {
      measureCanvas.font = "600 13px system-ui, sans-serif";
    }
  }
  return measureCanvas;
}

function measureTextWidth(text: string, bold = false): number {
  const ctx = getMeasureContext();
  if (!ctx) return text.length * 8;
  ctx.font = bold ? "600 13px system-ui, sans-serif" : "13px system-ui, sans-serif";
  return ctx.measureText(text).width;
}

export function computeAutoColumnWidth(
  headerName: string,
  cellValues: readonly string[],
  sortable = false,
): number {
  let maxWidth = measureTextWidth(headerName, true) + HEADER_PADDING;
  if (sortable) maxWidth += SORT_INDICATOR_WIDTH;

  for (const value of cellValues) {
    const width = measureTextWidth(value) + CELL_PADDING;
    if (width > maxWidth) maxWidth = width;
  }

  return Math.max(MIN_AUTO_WIDTH, Math.ceil(maxWidth));
}
