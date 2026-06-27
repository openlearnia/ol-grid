import type {
  CellEditor,
  CellEditorParams,
  ColumnDef,
  GridEngine,
  ProvidedCellEditorType,
} from "@ol-grid/core";
import { isProvidedCellEditorType } from "@ol-grid/core";

export type { ProvidedCellEditorType };

export interface DomCellEditorParams {
  value: string;
  colDef: ColumnDef;
  onValueChange: (value: string) => void;
  onStopEditing: (cancel: boolean) => void;
  onTab: (shiftKey: boolean) => void;
}

export function resolveCellEditorType(colDef: ColumnDef): ProvidedCellEditorType {
  const editor = colDef.cellEditor;
  if (isProvidedCellEditorType(editor)) {
    return editor;
  }
  return "text";
}

export function usesCustomCellEditor(colDef: ColumnDef, engine: GridEngine): boolean {
  const editor = colDef.cellEditor;
  if (typeof editor === "function") return false;
  if (typeof editor === "string" && !isProvidedCellEditorType(editor)) {
    return !!engine.resolveCellEditorFactory(colDef);
  }
  return false;
}

function attachEditorKeyHandlers(
  element: HTMLElement,
  params: DomCellEditorParams,
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

export function createCellEditorElement(params: DomCellEditorParams): HTMLElement {
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

  if (type === "largeText") {
    const textarea = document.createElement("textarea");
    textarea.className = "ol-grid__cell-editor ol-grid__cell-editor--large-text";
    textarea.value = params.value;
    if (typeof editorParams.maxLength === "number") {
      textarea.maxLength = editorParams.maxLength;
    }
    if (typeof editorParams.rows === "number") {
      textarea.rows = editorParams.rows;
    }
    textarea.addEventListener("input", () => {
      params.onValueChange(textarea.value);
    });
    attachEditorKeyHandlers(textarea, params);
    return textarea;
  }

  const input = document.createElement("input");
  input.className = "ol-grid__cell-editor";
  input.type = type === "number" ? "number" : type === "date" ? "date" : "text";
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
  if (element instanceof HTMLTextAreaElement) {
    return element.value;
  }
  if (element instanceof HTMLInputElement) {
    return element.value;
  }
  return element.textContent ?? "";
}

export interface CustomCellEditorMount {
  editor: CellEditor;
  element: HTMLElement;
  destroy: () => void;
}

function formatEditorValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Mount a registered CellEditor instance into the edit cell. */
export function mountCustomCellEditor<TData>(
  engine: GridEngine<TData>,
  colDef: ColumnDef<TData>,
  colId: string,
  rowIndex: number,
  editValue: string,
  onValueChange: (value: string) => void,
  onStopEditing: (cancel: boolean) => void,
): CustomCellEditorMount | null {
  const factory = engine.resolveCellEditorFactory(colDef);
  if (!factory) return null;

  const node = engine.getRowModel().getRowAt(rowIndex);
  if (!node) return null;

  let currentValue: unknown = editValue;
  const params: CellEditorParams<TData> = {
    value: editValue,
    data: node.data as TData,
    node,
    colDef,
    colId,
    api: engine.getApi(),
    context: engine.getOptions().context ?? null,
    rowIndex,
    eventKey: null,
    cellEditorParams: colDef.cellEditorParams,
    stopEditing: (cancel = false) => {
      if (!cancel) {
        const next = editor.getValue();
        onValueChange(formatEditorValue(next));
      }
      onStopEditing(cancel);
    },
    onValueChange: (value) => {
      currentValue = value;
      onValueChange(formatEditorValue(value));
    },
  };

  const editor = factory(params);
  editor.init(params);

  if (editor.isCancelBeforeStart?.()) {
    editor.destroy?.();
    onStopEditing(true);
    return null;
  }

  const gui = editor.getGui?.();
  const element = gui ?? document.createElement("div");
  element.classList.add("ol-grid__cell-editor", "ol-grid__cell-editor--custom");
  if (!gui) {
    element.textContent = formatEditorValue(currentValue);
  }

  editor.afterGuiAttached?.();

  return {
    editor,
    element,
    destroy: () => {
      editor.destroy?.();
    },
  };
}

export function readCustomCellEditorValue(editor: CellEditor): string {
  return formatEditorValue(editor.getValue());
}
