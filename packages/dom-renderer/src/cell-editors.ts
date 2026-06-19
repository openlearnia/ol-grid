import type { ColumnDef } from "@ol-grid/core";

export type ProvidedCellEditorType = "text" | "number" | "select";

export interface CellEditorParams {
  value: string;
  colDef: ColumnDef;
  onValueChange: (value: string) => void;
  onStopEditing: (cancel: boolean) => void;
  onTab: (shiftKey: boolean) => void;
}

export function resolveCellEditorType(colDef: ColumnDef): ProvidedCellEditorType {
  const editor = colDef.cellEditor;
  if (editor === "number" || editor === "select") return editor;
  return "text";
}

function attachEditorKeyHandlers(
  element: HTMLElement,
  params: CellEditorParams,
): void {
  element.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      params.onStopEditing(true);
    } else if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      params.onStopEditing(false);
    } else if (event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      params.onTab(event.shiftKey);
    }
  });
}

export function createCellEditorElement(params: CellEditorParams): HTMLElement {
  const type = resolveCellEditorType(params.colDef);
  const editorParams = params.colDef.cellEditorParams ?? {};

  if (type === "select") {
    const select = document.createElement("select");
    select.className = "ol-grid__cell-editor";
    const values = Array.isArray(editorParams.values)
      ? (editorParams.values as unknown[])
      : [];
    for (const optionValue of values) {
      const option = document.createElement("option");
      option.value = String(optionValue);
      option.textContent = String(optionValue);
      select.appendChild(option);
    }
    select.value = params.value;
    select.addEventListener("change", () => {
      params.onValueChange(select.value);
    });
    attachEditorKeyHandlers(select, params);
    return select;
  }

  const input = document.createElement("input");
  input.className = "ol-grid__cell-editor";
  input.type = type === "number" ? "number" : "text";
  input.value = params.value;
  if (type === "number") {
    if (typeof editorParams.min === "number") input.min = String(editorParams.min);
    if (typeof editorParams.max === "number") input.max = String(editorParams.max);
    if (typeof editorParams.step === "number") input.step = String(editorParams.step);
  }
  input.addEventListener("input", () => {
    params.onValueChange(input.value);
  });
  attachEditorKeyHandlers(input, params);
  return input;
}

export function readEditorValue(element: HTMLElement): string {
  if (element instanceof HTMLSelectElement) {
    return element.value;
  }
  if (element instanceof HTMLInputElement) {
    return element.value;
  }
  return element.textContent ?? "";
}
