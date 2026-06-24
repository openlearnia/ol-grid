const ACCENTED_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function compareStringsCodePoint(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function compareSortKeys(a: string, b: string, accentedSort = false): number {
  return accentedSort ? ACCENTED_COLLATOR.compare(a, b) : compareStringsCodePoint(a, b);
}

export function compareValues(a: unknown, b: unknown, accentedSort = false): number {
  if (a === b) return 0;
  // Null/undefined sort before any value — consistent across column types.
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  const left = String(a);
  const right = String(b);
  // `accentedSort` uses locale-aware collation; default is fast code-point order.
  return accentedSort ? ACCENTED_COLLATOR.compare(left, right) : compareStringsCodePoint(left, right);
}
