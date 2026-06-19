import { beforeEach } from "vitest";
import { ModuleRegistry } from "@ol-grid/core";
import { SortModule } from "@ol-grid/sort";

beforeEach(() => {
  ModuleRegistry.reset();
  ModuleRegistry.register(SortModule);
});
