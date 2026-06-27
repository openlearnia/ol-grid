import { describe, expect, it } from "vitest";
import type { CellEditor, CellEditorParams } from "@ol-grid/core";
import { createGridEngine } from "@ol-grid/core";
import { mountCustomCellEditor } from "../custom-cell-editor.js";

class UppercaseEditor implements CellEditor<{ name: string }> {
  private input: HTMLInputElement | null = null;

  init(params: CellEditorParams<{ name: string }>): void {
    this.input = document.createElement("input");
    this.input.className = "uppercase-editor";
    this.input.value = String(params.value ?? "");
    this.input.addEventListener("input", () => {
      params.onValueChange?.(this.input?.value.toUpperCase());
    });
  }

  getGui(): HTMLElement {
    return this.input!;
  }

  getValue(): unknown {
    return (this.input?.value ?? "").toUpperCase();
  }
}

describe("mountCustomCellEditor", () => {
  it("mounts a registered CellEditor and syncs value changes", () => {
    const engine = createGridEngine({
      columnDefs: [{ field: "name", editable: true, cellEditor: "uppercaseEditor" }],
      rowData: [{ name: "alice" }],
    });

    engine.registerCellEditor("uppercaseEditor", {
      create: () => new UppercaseEditor(),
    });

    const changes: string[] = [];
    const mount = mountCustomCellEditor(
      engine,
      { field: "name", editable: true, cellEditor: "uppercaseEditor" },
      "name",
      0,
      "alice",
      (value) => changes.push(value),
      () => {},
    );

    expect(mount).not.toBeNull();
    expect(mount!.element.classList.contains("ol-grid__cell-editor--custom")).toBe(true);

    const input =
      mount!.element instanceof HTMLInputElement
        ? mount!.element
        : mount!.element.querySelector<HTMLInputElement>(".uppercase-editor");
    expect(input).not.toBeNull();
    input!.value = "bob";
    input!.dispatchEvent(new Event("input"));

    expect(changes.at(-1)).toBe("BOB");
    expect(mount!.editor.getValue()).toBe("BOB");

    mount!.destroy();
    engine.destroy();
  });
});
