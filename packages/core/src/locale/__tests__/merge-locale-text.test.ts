import { describe, expect, it } from "vitest";
import { mergeLocaleText } from "../merge-locale-text.js";
import { DEFAULT_LOCALE_TEXT } from "../locale-text.js";

describe("mergeLocaleText", () => {
  it("deep overrides known keys while keeping defaults", () => {
    const merged = mergeLocaleText(DEFAULT_LOCALE_TEXT, { selectRow: "Zeile auswählen" });
    expect(merged.selectRow).toBe("Zeile auswählen");
    expect(merged.selectAll).toBe("Select All");
  });
});
