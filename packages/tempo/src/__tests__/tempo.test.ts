import { describe, expect, it } from "vitest";
import { addDay, dayEnd, dayStart, diffDays, format, parse, sameDay } from "../index.js";

describe("@ol-grid/tempo smoke", () => {
  it("parses and formats ISO dates", () => {
    const d = parse("2020-06-15", "YYYY-MM-DD");
    expect(format(d, "YYYY-MM-DD")).toBe("2020-06-15");
  });

  it("compares same calendar day", () => {
    const d = parse("2020-06-15T14:30:00", "YYYY-MM-DDTHH:mm:ss");
    expect(sameDay(d, dayStart(d))).toBe(true);
    expect(sameDay(d, dayEnd(d))).toBe(true);
  });

  it("diffs days across boundaries", () => {
    const earlier = parse("2020-06-15", "YYYY-MM-DD");
    const later = addDay(earlier, 3);
    expect(diffDays(later, earlier)).toBe(3);
  });
});
