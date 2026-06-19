import { describe, expect, it, beforeEach } from "vitest";
import { ModuleRegistry } from "./module-registry.js";

const TestModuleA = {
  name: "TestModuleA",
  version: "0.0.0",
};

const TestModuleB = {
  name: "TestModuleB",
  version: "0.0.0",
  dependencies: ["TestModuleA"],
};

describe("ModuleRegistry", () => {
  beforeEach(() => {
    ModuleRegistry.reset();
  });

  it("registers and resolves modules", () => {
    ModuleRegistry.register(TestModuleA);
    expect(ModuleRegistry.has("TestModuleA")).toBe(true);
    expect(ModuleRegistry.getModule("TestModuleA")).toBe(TestModuleA);
  });

  it("skips duplicate global registration", () => {
    ModuleRegistry.register(TestModuleA);
    ModuleRegistry.register({ ...TestModuleA, version: "9.9.9" });
    expect(ModuleRegistry.get("TestModuleA")?.version).toBe("0.0.0");
  });

  it("resolves dependencies in topological order", () => {
    ModuleRegistry.register(TestModuleB, TestModuleA);
    const resolved = ModuleRegistry.resolve();
    expect(resolved.map((mod) => mod.name)).toEqual(["TestModuleA", "TestModuleB"]);
  });

  it("throws on circular dependencies", () => {
    ModuleRegistry.register({
      name: "CycleA",
      version: "0.0.0",
      dependencies: ["CycleB"],
    });
    ModuleRegistry.register({
      name: "CycleB",
      version: "0.0.0",
      dependencies: ["CycleA"],
    });

    expect(() => ModuleRegistry.resolve()).toThrow(/Circular module dependency/);
  });

  it("merges per-grid modules with global registry", () => {
    ModuleRegistry.register(TestModuleA);
    const perGrid = {
      name: "PerGridModule",
      version: "0.0.0",
    };
    const resolved = ModuleRegistry.resolve([perGrid]);
    expect(resolved.map((mod) => mod.name)).toEqual(["TestModuleA", "PerGridModule"]);
  });
});
