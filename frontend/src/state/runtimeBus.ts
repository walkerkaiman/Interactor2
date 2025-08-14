// Lightweight runtime update bus for module runtime-only fields
// Provides: onUpdate(cb), offUpdate(cb), emit(update), getLatest(moduleId)

export interface RuntimeUpdate {
  moduleId: string;
  runtimeData: Record<string, any>;
  timestamp?: number;
}

type Listener = (update: RuntimeUpdate) => void;

class RuntimeBus {
  private listeners: Set<Listener> = new Set();
  private latestByModuleId: Map<string, Record<string, any>> = new Map();

  public onUpdate(listener: Listener): void {
    this.listeners.add(listener);
  }

  public offUpdate(listener: Listener): void {
    this.listeners.delete(listener);
  }

  public emit(update: RuntimeUpdate): void {
    const existing = this.latestByModuleId.get(update.moduleId) || {};
    const merged = { ...existing, ...update.runtimeData };
    this.latestByModuleId.set(update.moduleId, merged);
    this.listeners.forEach(l => l(update));
  }

  public getLatest(moduleId: string): Record<string, any> {
    return this.latestByModuleId.get(moduleId) || {};
  }
}

export const runtimeBus = new RuntimeBus();



