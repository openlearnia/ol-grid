/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import {
  createCellEditorElement,
  readEditorValue,
  resolveCellEditorType,
} from "../cell-editors.js";

describe("cell-editors", () => {
  it("resolves date and largeText editor types", () => {
    expect(resolveCellEditorType({ cellEditor: "date" })).toBe("date");
    expect(resolveCellEditorType({ cellEditor: "largeText" })).toBe("largeText");
  });

  it("creates native date input editor", () => {
    const editor = createCellEditorElement({
      value: "2020-05-01",
      colDef: { cellEditor: "date" },
      onValueChange: () => {},
      onStopEditing: () => {},
      onTab: () => {},
    });

    expect(editor.tagName).toBe("INPUT");
    expect((editor as HTMLInputElement).type).toBe("date");
    expect(readEditorValue(editor)).toBe("2020-05-01");
  });

  it("creates textarea largeText editor", () => {
    const editor = createCellEditorElement({
      value: "line one",
      colDef: { cellEditor: "largeText", cellEditorParams: { rows: 4 } },
      onValueChange: () => {},
      onStopEditing: () => {},
      onTab: () => {},
    });

    expect(editor.tagName).toBe("TEXTAREA");
    expect(Number((editor as HTMLTextAreaElement).rows)).toBe(4);
    expect(readEditorValue(editor)).toBe("line one");
  });
});
