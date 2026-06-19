import { describe, expect, it } from "vitest";
import { generateCsv } from "./csv-export.js";
import type { ColumnDef } from "../types/column.js";
import type { RowNode } from "../types/row.js";

interface Row {
  name: string;
  amount: number;
}

function node(data: Row, index: number): RowNode<Row> {
  return {
    id: String(index),
    data,
    rowIndex: index,
    level: 0,
    expanded: false,
    selected: false,
    group: false,
  };
}

const columnDefs: ColumnDef<Row>[] = [
  { field: "name", headerName: "Name" },
  { field: "amount", headerName: "Amount" },
];

describe("generateCsv", () => {
  it("generates header and data rows", () => {
    const rows = [
      node({ name: "Alice", amount: 10 }, 0),
      node({ name: "Bob", amount: 20 }, 1),
    ];

    const csv = generateCsv(rows, columnDefs, null, null);
    expect(csv).toBe("Name,Amount\r\nAlice,10\r\nBob,20");
  });

  it("escapes fields containing separators and quotes", () => {
    const rows = [node({ name: 'Say "Hi", there', amount: 1 }, 0)];
    const csv = generateCsv(rows, columnDefs, null, null);
    expect(csv).toBe('Name,Amount\r\n"Say ""Hi"", there",1');
  });

  it("uses custom column separator", () => {
    const rows = [node({ name: "Alice", amount: 10 }, 0)];
    const csv = generateCsv(rows, columnDefs, null, null, { columnSeparator: ";" });
    expect(csv).toBe("Name;Amount\r\nAlice;10");
  });

  it("omits headers when includeHeaders is false", () => {
    const rows = [node({ name: "Alice", amount: 10 }, 0)];
    const csv = generateCsv(rows, columnDefs, null, null, { includeHeaders: false });
    expect(csv).toBe("Alice,10");
  });
});
