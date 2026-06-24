import type { GridApi, GridEngine, GridOptions } from "@ol-grid/core";
import { createDomRenderer } from "@ol-grid/dom-renderer";
import {
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  toRaw,
  watch,
  type Ref,
  type ShallowRef,
} from "vue";
import {
  createAdapterEngine,
  GRID_API_INJECTION_KEY,
  syncEventHandlers,
  syncGridOptions,
} from "./engine-setup.js";

export { GRID_API_INJECTION_KEY };

export interface UseOlGridResult<TData> {
  api: ShallowRef<GridApi<TData> | null>;
  grid: ShallowRef<GridEngine<TData> | null>;
  hostRef: Ref<HTMLDivElement | null>;
  storeVersion: Ref<number>;
}

export function useOlGrid<TData>(
  options: GridOptions<TData> | Ref<GridOptions<TData>>,
): UseOlGridResult<TData> {
  const hostRef = ref<HTMLDivElement | null>(null);
  const grid = shallowRef<GridEngine<TData> | null>(null);
  const api = shallowRef<GridApi<TData> | null>(null);
  const storeVersion = ref(0);
  const syncedOptions = ref<Record<string, unknown>>({});
  let unsubscribe: (() => void) | null = null;

  provide(GRID_API_INJECTION_KEY, api);

  onMounted(() => {
    // toRaw strips Vue proxies before passing options into the imperative engine.
    const initialOptions = toRaw("value" in options ? options.value : options) as GridOptions<TData>;
    const engine = createAdapterEngine(initialOptions);
    grid.value = engine;
    api.value = engine.getApi();

    const host = hostRef.value;
    if (!host) return;

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    syncGridOptions(engine, initialOptions, syncedOptions.value);
    syncEventHandlers(engine, initialOptions);
    initialOptions.onGridReady?.({
      api: engine.getApi(),
      columnApi: null,
      context: initialOptions.context ?? null,
    });

    unsubscribe = engine.getStore().subscribe(() => {
      storeVersion.value++;
    });
  });

  watch(
    () => ("value" in options ? options.value : options),
    (next) => {
      const engine = grid.value;
      if (!engine) return;
      const raw = toRaw(next) as GridOptions<TData>;
      syncGridOptions(engine, raw, syncedOptions.value);
      syncEventHandlers(engine, raw);
    },
    { deep: true, flush: "post" },
  );

  onBeforeUnmount(() => {
    unsubscribe?.();
    grid.value?.destroy();
    grid.value = null;
    api.value = null;
    syncedOptions.value = {};
  });

  return { api, grid, hostRef, storeVersion };
}
