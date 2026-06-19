import {
  createGridEngine,
  ModuleRegistry,
  type GridApi,
  type GridEngine,
  type GridOptions,
} from "@ol-grid/core";
import { SortModule } from "@ol-grid/sort";
import { createDomRenderer } from "@ol-grid/dom-renderer";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useCellRendererPortals } from "./cell-renderer-portals.js";

let sortModuleRegistered = false;

function ensureSortModuleRegistered(): void {
  if (sortModuleRegistered) return;
  ModuleRegistry.register(SortModule);
  sortModuleRegistered = true;
}

export interface OlGridHandle<TData = unknown> {
  api: GridApi<TData>;
  grid: GridEngine<TData>;
}

export interface UseOlGridResult<TData> {
  grid: GridEngine<TData>;
  api: GridApi<TData>;
}

export interface OlGridProps<TData> extends GridOptions<TData> {
  className?: string;
  style?: CSSProperties;
}

const GRID_OPTION_KEYS = [
  "columnDefs",
  "rowData",
  "rowHeight",
  "rowSelection",
  "getRowId",
  "context",
  "quickFilterText",
  "sortModel",
  "defaultColDef",
] as const satisfies readonly (keyof GridOptions<unknown>)[];

type SyncedGridOptions<TData> = Partial<Pick<GridOptions<TData>, (typeof GRID_OPTION_KEYS)[number]>>;

function syncGridOptions<TData>(
  engine: GridEngine<TData>,
  options: GridOptions<TData>,
  synced: SyncedGridOptions<TData>,
): void {
  for (const key of GRID_OPTION_KEYS) {
    const value = options[key];
    if (value !== undefined && value !== synced[key]) {
      engine.setOption(key, value as GridOptions<TData>[typeof key]);
      (synced as Record<typeof key, unknown>)[key] = value;
    }
  }
}

function createEngine<TData>(options: GridOptions<TData>): GridEngine<TData> {
  ensureSortModuleRegistered();
  return createGridEngine({
    ...options,
    frameworkCellRenderers: true,
    modules: [...(options.modules ?? []), SortModule],
  });
}

export function useOlGrid<TData>(options: GridOptions<TData>): UseOlGridResult<TData> {
  const engineRef = useRef<GridEngine<TData> | null>(null);
  const aliveRef = useRef(false);
  const syncedOptionsRef = useRef<SyncedGridOptions<TData>>({});

  if (!engineRef.current) {
    engineRef.current = createEngine(options);
  }

  const engine = engineRef.current;

  useSyncExternalStore(
    (onStoreChange) => engine.getStore().subscribe(onStoreChange),
    () => engine.getStore().getState(),
    () => engine.getStore().getState(),
  );

  useEffect(() => {
    syncGridOptions(engine, options, syncedOptionsRef.current);
  });

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      queueMicrotask(() => {
        if (!aliveRef.current) {
          engine.destroy();
          engineRef.current = null;
          syncedOptionsRef.current = {};
        }
      });
    };
  }, [engine]);

  return {
    grid: engine,
    api: engine.getApi(),
  };
}

export const OlGrid = forwardRef(function OlGrid<TData>(
  { className, style, ...options }: OlGridProps<TData>,
  ref: React.ForwardedRef<OlGridHandle<TData>>,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ReturnType<typeof createDomRenderer> | null>(null);
  const engineRef = useRef<GridEngine<TData> | null>(null);
  const aliveRef = useRef(false);
  const syncedOptionsRef = useRef<SyncedGridOptions<TData>>({});

  if (!engineRef.current) {
    engineRef.current = createEngine(options);
  }

  const engine = engineRef.current;
  const cellPortals = useCellRendererPortals(engine, rendererRef.current);

  useImperativeHandle(ref, () => ({
    api: engine.getApi(),
    grid: engine,
  }));

  useSyncExternalStore(
    (onStoreChange) => engine.getStore().subscribe(onStoreChange),
    () => engine.getStore().getState(),
    () => engine.getStore().getState(),
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    aliveRef.current = true;
    const renderer = createDomRenderer();
    rendererRef.current = renderer;
    engine.mount(host, renderer);

    return () => {
      aliveRef.current = false;
      engine.unmount();
      rendererRef.current = null;
    };
  }, [engine]);

  useEffect(() => {
    syncGridOptions(engine, options, syncedOptionsRef.current);

    const opts = engine.getOptions() as GridOptions<TData>;
    opts.onSelectionChanged = options.onSelectionChanged;
    opts.onSortChanged = options.onSortChanged;
    opts.onRowDataUpdated = options.onRowDataUpdated;
    opts.onFilterChanged = options.onFilterChanged;
    opts.onColumnResized = options.onColumnResized;
    opts.onCellValueChanged = options.onCellValueChanged;
  });

  useEffect(() => {
    return () => {
      queueMicrotask(() => {
        if (!aliveRef.current) {
          engine.destroy();
          engineRef.current = null;
          syncedOptionsRef.current = {};
        }
      });
    };
  }, [engine]);

  return (
    <>
      <div
        ref={hostRef}
        className={className ? `ol-grid-host ${className}` : "ol-grid-host"}
        style={style}
      />
      {cellPortals.map((entry) => entry.portal)}
    </>
  );
}) as <TData>(
  props: OlGridProps<TData> & { ref?: React.ForwardedRef<OlGridHandle<TData>> },
) => React.ReactElement;
