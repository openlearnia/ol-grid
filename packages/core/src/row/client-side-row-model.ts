import type { ColumnDef } from "../types/column.js";
import type { RowNode } from "../types/row.js";
import type { GetRowIdParams } from "../types/options.js";
import type { RowModelStage, RowModelStageContext } from "../modules/module-registry.js";
import { filterRowsByQuickFilter } from "../filter/quick-filter.js";
import {
  applyRowDataTransaction,
  type RowDataTransaction,
  type RowDataTransactionResult,
} from "./apply-transaction.js";

export class ClientSideRowModel<TData = unknown> {
  private rowNodes: RowNode<TData>[] = [];
  private rowById = new Map<string, RowNode<TData>>();
  private sourceData: TData[] = [];
  private filteredNodes: RowNode<TData>[] = [];
  private quickFilterText = "";
  private filterModel: Record<string, unknown> = {};
  private sortModel: Array<{ colId: string; sort: "asc" | "desc" }> = [];
  private pipelineStages: RowModelStage[] = [];
  private paginationContext: RowModelStageContext["pagination"] = undefined;
  private getRowIdFn: (params: GetRowIdParams<TData>) => string = ({ index }) =>
    String(index);

  setGetRowId(getRowId: ((params: GetRowIdParams<TData>) => string) | undefined): void {
    this.getRowIdFn = getRowId ?? (({ index }) => String(index));
  }

  setRowData(rowData: TData[]): void {
    this.sourceData = rowData;
  }

  setQuickFilterText(text: string): void {
    this.quickFilterText = text;
  }

  getQuickFilterText(): string {
    return this.quickFilterText;
  }

  setFilterModel(model: Record<string, unknown>): void {
    this.filterModel = { ...model };
  }

  getFilterModel(): Record<string, unknown> {
    return this.filterModel;
  }

  setPipelineStages(stages: RowModelStage[]): void {
    this.pipelineStages = [...stages].sort((left, right) => left.order - right.order);
  }

  setPaginationContext(pagination: RowModelStageContext["pagination"]): void {
    this.paginationContext = pagination;
  }

  getRowCount(): number {
    return this.rowNodes.length;
  }

  getRowAt(index: number): RowNode<TData> | undefined {
    return this.rowNodes[index];
  }

  getRowById(id: string): RowNode<TData> | undefined {
    return this.rowById.get(id);
  }

  forEachNode(callback: (node: RowNode<TData>) => void): void {
    for (const node of this.rowNodes) {
      callback(node);
    }
  }

  getAllFilteredNodes(): RowNode<TData>[] {
    return this.filteredNodes;
  }

  getSourceData(): TData[] {
    return this.sourceData;
  }

  applyTransaction(transaction: RowDataTransaction<TData>): RowDataTransactionResult<TData> {
    const { sourceData, result } = applyRowDataTransaction(
      this.sourceData,
      transaction,
      this.getRowIdFn,
      this.rowById,
    );
    this.sourceData = sourceData;
    return result;
  }

  updateNodeData(node: RowNode<TData>): void {
    this.rowById.set(node.id, node);
    const index = this.rowNodes.findIndex((n) => n.id === node.id);
    if (index >= 0) {
      this.rowNodes[index] = node;
    }
    const filteredIndex = this.filteredNodes.findIndex((n) => n.id === node.id);
    if (filteredIndex >= 0) {
      this.filteredNodes[filteredIndex] = node;
    }
    const sourceIndex = this.sourceData.findIndex((_, i) => {
      const id = this.getRowIdFn({ data: this.sourceData[i]!, index: i });
      return id === node.id;
    });
    if (sourceIndex >= 0 && node.data !== undefined) {
      this.sourceData[sourceIndex] = node.data;
    }
  }

  rebuild(
    sortModel: Array<{ colId: string; sort: "asc" | "desc" }>,
    filterModel: Record<string, unknown>,
    columnDefs: ColumnDef<TData>[],
    api: unknown,
    context: unknown,
  ): void {
    this.sortModel = sortModel;
    this.filterModel = { ...filterModel };
    this.applyPipeline(columnDefs, api, context);
  }

  private applyPipeline(
    columnDefs: ColumnDef<TData>[],
    api: unknown,
    context: unknown,
  ): void {
    const baseNodes = this.sourceData.map((data, index) => this.createNode(data, index));
    this.filteredNodes = filterRowsByQuickFilter(
      baseNodes,
      columnDefs,
      this.quickFilterText,
      api,
      context,
    );

    const stageContext: RowModelStageContext = {
      columnDefs: columnDefs as RowModelStageContext["columnDefs"],
      api,
      context,
      sortModel: this.sortModel,
      filterModel: this.filterModel,
      pagination: this.paginationContext,
    };

    let rows: RowNode<TData>[] = this.filteredNodes;
    for (const stage of this.pipelineStages) {
      rows = stage.run(rows, stageContext) as RowNode<TData>[];
    }

    this.setNodes(rows);
  }

  private createNode(data: TData, index: number): RowNode<TData> {
    const id = this.getRowIdFn({ data, index });
    return {
      id,
      data,
      rowIndex: index,
      level: 0,
      expanded: false,
      selected: false,
      group: false,
    };
  }

  private setNodes(nodes: RowNode<TData>[]): void {
    this.rowNodes = nodes.map((node, index) => ({ ...node, rowIndex: index }));
    this.rowById = new Map(this.rowNodes.map((node) => [node.id, node]));
  }
}
