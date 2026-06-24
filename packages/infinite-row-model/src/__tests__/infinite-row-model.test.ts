import { describe, expect, it } from "vitest";
import { InfiniteRowModel } from "../infinite-row-model.js";
import type { InfiniteDatasource } from "@ol-grid/core";

interface Row {
  id: number;
  name: string;
}

function createMockDatasource(
  totalRows: number,
  delayMs = 0,
): InfiniteDatasource<Row> {
  return {
    getRows(params) {
      const rows: Row[] = [];
      for (let i = params.startRow; i < params.endRow && i < totalRows; i++) {
        rows.push({ id: i + 1, name: `User ${i + 1}` });
      }
      const finish = () => params.success({ rows, rowCount: totalRows });
      if (delayMs > 0) {
        setTimeout(finish, delayMs);
      } else {
        finish();
      }
    },
  };
}

describe("InfiniteRowModel", () => {
  it("loads block on ensureRangeLoaded", async () => {
    const model = new InfiniteRowModel<Row>({
      datasource: createMockDatasource(500),
      getRowId: ({ data }) => String(data.id),
      cacheBlockSize: 100,
    });

    model.ensureRangeLoaded(0, 100);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const node = model.getRowAt(0);
    expect(node?.data?.name).toBe("User 1");
    expect(node?.stub).toBeFalsy();
    expect(model.getRowCount()).toBe(500);
  });

  it("returns stub nodes before block loads", () => {
    const model = new InfiniteRowModel<Row>({
      datasource: createMockDatasource(500),
      getRowId: ({ data }) => String(data.id),
      cacheBlockSize: 100,
      infiniteInitialRowCount: 500,
    });

    const stub = model.getRowAt(50);
    expect(stub?.stub).toBe(true);
    expect(stub?.data).toBeUndefined();
  });

  it("purges cache on sort change", async () => {
    const model = new InfiniteRowModel<Row>({
      datasource: createMockDatasource(200),
      getRowId: ({ data }) => String(data.id),
      cacheBlockSize: 50,
    });

    model.ensureRangeLoaded(0, 50);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(model.getRowAt(0)?.data).toBeDefined();

    model.onSortOrFilterChanged([{ colId: "name", sort: "asc" }], {}, "");
    expect(model.getRowAt(0)?.stub).toBe(true);
  });

  it("discards stale responses after purge", async () => {
    let callCount = 0;
    const datasource: InfiniteDatasource<Row> = {
      getRows(params) {
        callCount++;
        if (callCount === 1) {
          setTimeout(() => {
            params.success({ rows: [{ id: 1, name: "Stale" }], rowCount: 1 });
          }, 50);
          return;
        }
        params.success({
          rows: [{ id: 1, name: "Fresh" }],
          rowCount: 100,
        });
      },
    };

    const model = new InfiniteRowModel<Row>({
      datasource,
      getRowId: ({ data }) => String(data.id),
      cacheBlockSize: 100,
    });

    model.ensureRangeLoaded(0, 100);
    model.purgeCache();
    model.ensureRangeLoaded(0, 100);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(model.getRowAt(0)?.data?.name).toBe("Fresh");
    expect(model.getRowCount()).toBe(100);
  });
});
