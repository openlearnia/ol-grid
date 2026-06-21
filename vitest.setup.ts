import { beforeEach } from "vitest";
import { ModuleRegistry } from "@ol-grid/core";
import { SortModule } from "@ol-grid/sort";
import { FilterModule } from "@ol-grid/filter";

beforeEach(() => {
  ModuleRegistry.reset();
  ModuleRegistry.register(SortModule, FilterModule);
});
