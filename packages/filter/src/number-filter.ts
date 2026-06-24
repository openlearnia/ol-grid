import type { NumberFilterModel } from "./types.js";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function doesNumberFilterPass(value: unknown, model: NumberFilterModel): boolean {
  const numeric = toNumber(value);
  const filter = model.filter;
  const filterTo = model.filterTo ?? null;

  if (filter === null && model.type !== "inRange") {
    return true;
  }

  if (numeric === null) {
    // Non-numeric cell values never pass an active number filter.
    return false;
  }

  switch (model.type) {
    case "equals":
      return filter !== null && numeric === filter;
    case "notEqual":
      return filter !== null && numeric !== filter;
    case "lessThan":
      return filter !== null && numeric < filter;
    case "lessThanOrEqual":
      return filter !== null && numeric <= filter;
    case "greaterThan":
      return filter !== null && numeric > filter;
    case "greaterThanOrEqual":
      return filter !== null && numeric >= filter;
    case "inRange":
      if (filter === null || filterTo === null) return true;
      return numeric >= filter && numeric <= filterTo;
    default:
      return true;
  }
}

export const NUMBER_FILTER_OPTIONS: NumberFilterModel["type"][] = [
  "equals",
  "notEqual",
  "lessThan",
  "lessThanOrEqual",
  "greaterThan",
  "greaterThanOrEqual",
  "inRange",
];

export const NUMBER_FILTER_LABELS: Record<NumberFilterModel["type"], string> = {
  equals: "Equals",
  notEqual: "Not equal",
  lessThan: "Less than",
  lessThanOrEqual: "Less than or equal",
  greaterThan: "Greater than",
  greaterThanOrEqual: "Greater than or equal",
  inRange: "In range",
};
