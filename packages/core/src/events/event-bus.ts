export type EventHandler = (...args: unknown[]) => void;
export type EventUnsubscribe = () => void;

export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): EventUnsubscribe {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  emit(event: string, ...args: unknown[]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      handler(...args);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
