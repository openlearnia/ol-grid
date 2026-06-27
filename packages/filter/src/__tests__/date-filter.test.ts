import { describe, expect, it } from "vitest";
import { doesDateFilterPass } from "../date-filter.js";

describe("doesDateFilterPass", () => {
  const base = { filterType: "date" as const };

  it("passes when filter date is empty (non-range)", () => {
    expect(doesDateFilterPass("2020-06-15", { ...base, type: "equals", dateFrom: null })).toBe(
      true,
    );
  });

  it("matches equals on same calendar day regardless of time", () => {
    expect(
      doesDateFilterPass("2020-06-15T14:00:00", {
        ...base,
        type: "equals",
        dateFrom: "2020-06-15",
      }),
    ).toBe(true);
    expect(
      doesDateFilterPass("2020-06-16T00:00:01", {
        ...base,
        type: "equals",
        dateFrom: "2020-06-15",
      }),
    ).toBe(false);
  });

  it("matches notEqual across day boundaries", () => {
    expect(
      doesDateFilterPass("2020-06-16", {
        ...base,
        type: "notEqual",
        dateFrom: "2020-06-15",
      }),
    ).toBe(true);
    expect(
      doesDateFilterPass("2020-06-15T23:59:59", {
        ...base,
        type: "notEqual",
        dateFrom: "2020-06-15",
      }),
    ).toBe(false);
  });

  it("matches lessThan before start of filter day", () => {
    expect(
      doesDateFilterPass("2020-06-14T23:59:59", {
        ...base,
        type: "lessThan",
        dateFrom: "2020-06-15",
      }),
    ).toBe(true);
    expect(
      doesDateFilterPass("2020-06-15T00:00:00", {
        ...base,
        type: "lessThan",
        dateFrom: "2020-06-15",
      }),
    ).toBe(false);
  });

  it("matches greaterThan after end of filter day", () => {
    expect(
      doesDateFilterPass("2020-06-16T00:00:00", {
        ...base,
        type: "greaterThan",
        dateFrom: "2020-06-15",
      }),
    ).toBe(true);
    expect(
      doesDateFilterPass("2020-06-15T23:59:59", {
        ...base,
        type: "greaterThan",
        dateFrom: "2020-06-15",
      }),
    ).toBe(false);
  });

  it("matches inRange inclusively across day boundaries", () => {
    expect(
      doesDateFilterPass("2020-06-15T08:00:00", {
        ...base,
        type: "inRange",
        dateFrom: "2020-06-15",
        dateTo: "2020-06-20",
      }),
    ).toBe(true);
    expect(
      doesDateFilterPass("2020-06-20T23:59:59", {
        ...base,
        type: "inRange",
        dateFrom: "2020-06-15",
        dateTo: "2020-06-20",
      }),
    ).toBe(true);
    expect(
      doesDateFilterPass("2020-06-21T00:00:00", {
        ...base,
        type: "inRange",
        dateFrom: "2020-06-15",
        dateTo: "2020-06-20",
      }),
    ).toBe(false);
  });

  it("passes inRange when either bound is missing", () => {
    expect(
      doesDateFilterPass("2020-06-15", {
        ...base,
        type: "inRange",
        dateFrom: null,
        dateTo: "2020-06-20",
      }),
    ).toBe(true);
  });

  it("rejects null or invalid cell values", () => {
    expect(
      doesDateFilterPass(null, { ...base, type: "equals", dateFrom: "2020-06-15" }),
    ).toBe(false);
    expect(
      doesDateFilterPass("not-a-date", { ...base, type: "equals", dateFrom: "2020-06-15" }),
    ).toBe(false);
  });

  it("accepts Date instances and numeric timestamps", () => {
    expect(
      doesDateFilterPass(new Date("2020-06-15T12:00:00"), {
        ...base,
        type: "equals",
        dateFrom: "2020-06-15",
      }),
    ).toBe(true);
    expect(
      doesDateFilterPass(new Date("2020-06-15T12:00:00").getTime(), {
        ...base,
        type: "equals",
        dateFrom: "2020-06-15",
      }),
    ).toBe(true);
  });
});
