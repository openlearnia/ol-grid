/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import {
  resolveColumnDropIndex,
} from "../column-header-drag.js";

function mockHeaderLayout(
  container: HTMLElement,
  layout: Record<string, { left: number; width: number }>,
): void {
  for (const [colId, rect] of Object.entries(layout)) {
    const header = document.createElement("div");
    header.dataset.colId = colId;
    header.setAttribute("role", "columnheader");
    container.appendChild(header);
    const left = rect.left;
    const width = rect.width;
    const box = {
      left,
      top: 0,
      width,
      height: 32,
      right: left + width,
      bottom: 32,
      x: left,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
    header.getBoundingClientRect = () => box;
  }
}

describe("resolveColumnDropIndex", () => {
  it("returns index before midpoint of first matching header", () => {
    const container = document.createElement("div");
    mockHeaderLayout(container, {
      name: { left: 200, width: 160 },
      role: { left: 360, width: 160 },
    });

    const index = resolveColumnDropIndex({
      clientX: 250,
      region: "center",
      regionContainer: container,
      regionColumns: [{ colId: "name" }, { colId: "role" }],
    });

    expect(index).toBe(0);
  });

  it("returns last index when pointer is past all midpoints", () => {
    const container = document.createElement("div");
    mockHeaderLayout(container, {
      name: { left: 200, width: 160 },
      role: { left: 360, width: 160 },
    });

    const index = resolveColumnDropIndex({
      clientX: 500,
      region: "center",
      regionContainer: container,
      regionColumns: [{ colId: "name" }, { colId: "role" }],
    });

    expect(index).toBe(1);
  });

  it("uses column-model order when DOM order differs", () => {
    const container = document.createElement("div");
    // DOM: status before role; model order: role, department, status
    mockHeaderLayout(container, {
      status: { left: 880, width: 120 },
      role: { left: 320, width: 120 },
      department: { left: 440, width: 130 },
    });

    const index = resolveColumnDropIndex({
      clientX: 470,
      region: "center",
      regionContainer: container,
      regionColumns: [{ colId: "role" }, { colId: "department" }, { colId: "status" }],
      sourceColId: "role",
    });

    expect(index).toBe(1);
  });

  it("swaps adjacent columns when dragging the right column onto the left column's right half", () => {
    const container = document.createElement("div");
    mockHeaderLayout(container, {
      manager: { left: 900, width: 120 },
      project: { left: 1020, width: 120 },
    });

    const index = resolveColumnDropIndex({
      clientX: 980,
      region: "center",
      regionContainer: container,
      regionColumns: [{ colId: "manager" }, { colId: "project" }],
      sourceColId: "project",
    });

    expect(index).toBe(0);
  });

  it("swaps adjacent columns when dragging the left column onto its own right half", () => {
    const container = document.createElement("div");
    mockHeaderLayout(container, {
      manager: { left: 900, width: 120 },
      project: { left: 1020, width: 120 },
    });

    const index = resolveColumnDropIndex({
      clientX: 980,
      region: "center",
      regionContainer: container,
      regionColumns: [{ colId: "manager" }, { colId: "project" }],
      sourceColId: "manager",
    });

    expect(index).toBe(1);
  });
});
