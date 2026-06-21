import type {
  GetRowIdParams,
  InfiniteDatasource,
  InfiniteGetRowsParams,
  RowNode,
  SortModel,
} from "@ol-grid/core";

type BlockState = "loading" | "loaded" | "failed";

interface Block<TData> {
  blockIndex: number;
  startRow: number;
  state: BlockState;
  nodes: RowNode<TData>[];
  requestId?: number;
}

export interface InfiniteRowModelConfig<TData> {
  datasource: InfiniteDatasource<TData>;
  getRowId: (params: GetRowIdParams<TData>) => string;
  cacheBlockSize?: number;
  maxBlocksInCache?: number;
  infiniteInitialRowCount?: number;
  context?: unknown;
}

export interface InfiniteRowModelCallbacks {
  onRowCountChanged?: (rowCount: number) => void;
  onMetaChanged?: (meta: { loading?: boolean; error?: string | null; failedBlocks?: number[] }) => void;
  onBlocksLoaded?: () => void;
}

export class InfiniteRowModel<TData = unknown> {
  private readonly datasource: InfiniteDatasource<TData>;
  private readonly getRowIdFn: (params: GetRowIdParams<TData>) => string;
  private readonly cacheBlockSize: number;
  private readonly maxBlocksInCache: number;
  private readonly context: unknown;
  private blocks = new Map<number, Block<TData>>();
  private rowById = new Map<string, RowNode<TData>>();
  private rowCount: number;
  private lastRowIndexKnown = false;
  private requestSequence = 0;
  private inFlightBlocks = new Set<number>();
  private failedBlocks = new Set<number>();
  private lruOrder: number[] = [];
  private sortModel: SortModel = [];
  private filterModel: Record<string, unknown> = {};
  private quickFilterText = "";
  private callbacks: InfiniteRowModelCallbacks = {};

  constructor(config: InfiniteRowModelConfig<TData>) {
    this.datasource = config.datasource;
    this.getRowIdFn = config.getRowId;
    this.cacheBlockSize = config.cacheBlockSize ?? 100;
    this.maxBlocksInCache = config.maxBlocksInCache ?? 10;
    this.context = config.context ?? null;
    this.rowCount = config.infiniteInitialRowCount ?? 1;
  }

  setCallbacks(callbacks: InfiniteRowModelCallbacks): void {
    this.callbacks = callbacks;
  }

  setSortModel(sortModel: SortModel): void {
    this.sortModel = [...sortModel];
  }

  setFilterModel(filterModel: Record<string, unknown>): void {
    this.filterModel = { ...filterModel };
  }

  setQuickFilterText(text: string): void {
    this.quickFilterText = text;
  }

  getRowCount(): number {
    return this.rowCount;
  }

  isLastRowIndexKnown(): boolean {
    return this.lastRowIndexKnown;
  }

  getRowAt(index: number): RowNode<TData> | undefined {
    if (index < 0 || index >= this.rowCount) return undefined;

    const blockIndex = this.getBlockIndex(index);
    const block = this.blocks.get(blockIndex);
    if (block?.state === "loaded") {
      const localIndex = index - block.startRow;
      return block.nodes[localIndex];
    }

    if (block?.state === "failed" || this.failedBlocks.has(blockIndex)) {
      return this.createStubNode(index, true);
    }

    return this.createStubNode(index, false);
  }

  getRowById(id: string): RowNode<TData> | undefined {
    return this.rowById.get(id);
  }

  forEachNode(callback: (node: RowNode<TData>) => void): void {
    for (let index = 0; index < this.rowCount; index++) {
      const node = this.getRowAt(index);
      if (node && !node.stub) callback(node);
    }
  }

  getAllFilteredNodes(): RowNode<TData>[] {
    const nodes: RowNode<TData>[] = [];
    this.forEachNode((node) => nodes.push(node));
    return nodes;
  }

  getLoadingState(): boolean {
    return this.inFlightBlocks.size > 0;
  }

  getErrorState(): string | null {
    return this.failedBlocks.size > 0 ? "Error loading rows" : null;
  }

  getFailedBlocks(): number[] {
    return [...this.failedBlocks];
  }

  purgeCache(): void {
    this.blocks.clear();
    this.rowById.clear();
    this.inFlightBlocks.clear();
    this.failedBlocks.clear();
    this.lruOrder = [];
    this.requestSequence++;
    this.lastRowIndexKnown = false;
    this.rowCount = 1;
    this.callbacks.onRowCountChanged?.(this.rowCount);
    this.updateMeta();
  }

  refreshCache(): void {
    this.purgeCache();
    this.ensureRangeLoaded(0, this.cacheBlockSize);
  }

  onSortOrFilterChanged(sortModel: SortModel, filterModel: Record<string, unknown>, quickFilterText: string): void {
    this.sortModel = [...sortModel];
    this.filterModel = { ...filterModel };
    this.quickFilterText = quickFilterText;
    this.purgeCache();
  }

  ensureRangeLoaded(startRow: number, endRow: number): void {
    if (endRow <= startRow) return;
    const firstBlock = this.getBlockIndex(Math.max(0, startRow));
    const lastBlock = this.getBlockIndex(Math.max(0, endRow - 1));
    for (let blockIndex = firstBlock; blockIndex <= lastBlock; blockIndex++) {
      this.loadBlock(blockIndex);
    }
  }

  retryFailedBlock(blockIndex: number): void {
    this.failedBlocks.delete(blockIndex);
    this.blocks.delete(blockIndex);
    this.loadBlock(blockIndex);
  }

  destroy(): void {
    this.requestSequence++;
    this.blocks.clear();
    this.datasource.destroy?.();
  }

  private getBlockIndex(rowIndex: number): number {
    return Math.floor(rowIndex / this.cacheBlockSize);
  }

  private createStubNode(index: number, failed: boolean): RowNode<TData> {
    return {
      id: `stub-${index}`,
      data: undefined,
      rowIndex: index,
      level: 0,
      expanded: false,
      selected: false,
      group: false,
      stub: true,
      ...(failed ? { aggData: { failed: true } } : {}),
    };
  }

  private loadBlock(blockIndex: number): void {
    const existing = this.blocks.get(blockIndex);
    if (existing?.state === "loaded" || existing?.state === "loading") return;
    if (this.inFlightBlocks.has(blockIndex)) return;

    const startRow = blockIndex * this.cacheBlockSize;
    const endRow = startRow + this.cacheBlockSize;
    const requestId = ++this.requestSequence;

    const block: Block<TData> = {
      blockIndex,
      startRow,
      state: "loading",
      nodes: [],
      requestId,
    };
    this.blocks.set(blockIndex, block);
    this.inFlightBlocks.add(blockIndex);
    this.updateMeta();

    const params: InfiniteGetRowsParams<TData> = {
      startRow,
      endRow,
      sortModel: this.sortModel,
      filterModel: { ...this.filterModel, quickFilterText: this.quickFilterText },
      context: this.context,
      requestId,
      success: (result) => this.handleSuccess(blockIndex, requestId, startRow, result),
      fail: () => this.handleFail(blockIndex, requestId),
    };

    try {
      const maybePromise = this.datasource.getRows(params);
      if (maybePromise && typeof (maybePromise as Promise<void>).then === "function") {
        (maybePromise as Promise<void>).catch(() => this.handleFail(blockIndex, requestId));
      }
    } catch {
      this.handleFail(blockIndex, requestId);
    }
  }

  private handleSuccess(
    blockIndex: number,
    requestId: number,
    startRow: number,
    result: { rows: TData[]; rowCount?: number },
  ): void {
    if (requestId !== this.requestSequence) return;

    const block = this.blocks.get(blockIndex);
    if (!block || block.requestId !== requestId) return;

    this.inFlightBlocks.delete(blockIndex);
    this.failedBlocks.delete(blockIndex);

    const nodes = result.rows.map((data, offset) => {
      const rowIndex = startRow + offset;
      const id = this.getRowIdFn({ data, index: rowIndex });
      const node: RowNode<TData> = {
        id,
        data,
        rowIndex,
        level: 0,
        expanded: false,
        selected: false,
        group: false,
      };
      this.rowById.set(id, node);
      return node;
    });

    block.state = "loaded";
    block.nodes = nodes;
    this.touchBlock(blockIndex);

    if (result.rowCount != null) {
      this.rowCount = result.rowCount;
      this.lastRowIndexKnown = true;
      this.callbacks.onRowCountChanged?.(this.rowCount);
    } else if (startRow + result.rows.length > this.rowCount) {
      this.rowCount = startRow + result.rows.length + this.cacheBlockSize;
      this.lastRowIndexKnown = false;
      this.callbacks.onRowCountChanged?.(this.rowCount);
    }

    this.evictIfNeeded();
    this.updateMeta();
    this.callbacks.onBlocksLoaded?.();
  }

  private handleFail(blockIndex: number, requestId: number): void {
    if (requestId !== this.requestSequence) return;

    const block = this.blocks.get(blockIndex);
    if (!block || block.requestId !== requestId) return;

    this.inFlightBlocks.delete(blockIndex);
    this.failedBlocks.add(blockIndex);
    block.state = "failed";
    this.updateMeta();
    this.callbacks.onBlocksLoaded?.();
  }

  private touchBlock(blockIndex: number): void {
    const index = this.lruOrder.indexOf(blockIndex);
    if (index >= 0) this.lruOrder.splice(index, 1);
    this.lruOrder.push(blockIndex);
  }

  private evictIfNeeded(): void {
    while (this.lruOrder.length > this.maxBlocksInCache) {
      const evictIndex = this.lruOrder.shift();
      if (evictIndex == null) break;
      const block = this.blocks.get(evictIndex);
      if (block?.state === "loaded") {
        for (const node of block.nodes) {
          this.rowById.delete(node.id);
        }
      }
      this.blocks.delete(evictIndex);
      this.failedBlocks.delete(evictIndex);
    }
  }

  private updateMeta(): void {
    this.callbacks.onMetaChanged?.({
      loading: this.getLoadingState(),
      error: this.getErrorState(),
      failedBlocks: this.getFailedBlocks(),
    });
  }
}
