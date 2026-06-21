import type { DateFilterModel } from "./types.js";

function toTimestamp(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? null : parsed;
}

function parseDateInput(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export function doesDateFilterPass(value: unknown, model: DateFilterModel): boolean {
  const cellTime = toTimestamp(value);
  const fromTime = parseDateInput(model.dateFrom);
  const toTime = parseDateInput(model.dateTo ?? null);

  if (fromTime === null && model.type !== "inRange") {
    return true;
  }

  if (cellTime === null) {
    return false;
  }

  switch (model.type) {
    case "equals":
      return fromTime !== null && cellTime >= startOfDay(fromTime) && cellTime <= endOfDay(fromTime);
    case "notEqual":
      return fromTime !== null && (cellTime < startOfDay(fromTime) || cellTime > endOfDay(fromTime));
    case "lessThan":
      return fromTime !== null && cellTime < startOfDay(fromTime);
    case "greaterThan":
      return fromTime !== null && cellTime > endOfDay(fromTime);
    case "inRange":
      if (fromTime === null || toTime === null) return true;
      return cellTime >= startOfDay(fromTime) && cellTime <= endOfDay(toTime);
    default:
      return true;
  }
}

export const DATE_FILTER_OPTIONS: DateFilterModel["type"][] = [
  "equals",
  "notEqual",
  "lessThan",
  "greaterThan",
  "inRange",
];

export const DATE_FILTER_LABELS: Record<DateFilterModel["type"], string> = {
  equals: "Equals",
  notEqual: "Not equal",
  lessThan: "Before",
  greaterThan: "After",
  inRange: "In range",
};
