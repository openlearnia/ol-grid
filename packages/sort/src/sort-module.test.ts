import { describe, expect, it } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { SortModule } from "@ol-grid/sort";

interface Row {
  name: string;
}

describe("SortModule integration", () => {
  it("registers sort pipeline stage via ModuleRegistry", () => {
    const engine = createGridEngine<Row>({
      modules: [SortModule],
      columnDefs: [{ field: "name", headerName: "Name", width: 120 }],
      rowData: [{ name: "Charlie" }, { name: "Alice" }, { name: "Bob" }],
    });

    engine.getApi().setSortModel([{ colId: "name", sort: "asc" }]);

    const names: string[] = [];
    engine.getRowModel().forEachNode((node) => {
      names.push(node.data?.name ?? "");
    });

    expect(names).toEqual(["Alice", "Bob", "Charlie"]);
    engine.destroy();
  });
});
