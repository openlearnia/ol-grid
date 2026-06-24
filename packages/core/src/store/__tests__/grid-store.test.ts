import { describe, expect, it } from "vitest";
import { createGridStore } from "../grid-store.js";

describe("createGridStore", () => {
  it("dispatches actions and notifies subscribers", () => {
    const store = createGridStore("test-grid");
    let notifyCount = 0;

    store.subscribe(() => {
      notifyCount++;
    });

    store.dispatch({ type: "SET_ROW_COUNT", rowCount: 42 });

    expect(store.getState().rowCount).toBe(42);
    expect(notifyCount).toBe(1);
  });

  it("batches notifications", () => {
    const store = createGridStore("test-grid");
    let notifyCount = 0;

    store.subscribe(() => {
      notifyCount++;
    });

    store.batch(() => {
      store.dispatch({ type: "SET_ROW_COUNT", rowCount: 1 });
      store.dispatch({ type: "SET_ROW_COUNT", rowCount: 2 });
    });

    expect(store.getState().rowCount).toBe(2);
    expect(notifyCount).toBe(1);
  });
});
