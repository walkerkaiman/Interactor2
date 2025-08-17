export interface RuntimeUpdate {
  moduleId: string;
  runtimeData: Record<string, any>;
  timestamp?: number;
  newChanges?: boolean;
}

export class RuntimeBus {
  private listeners: Set<(update: RuntimeUpdate) => void> = new Set();
  private latestData: Map<string, Record<string, any>> = new Map();

  public onUpdate(callback: (update: RuntimeUpdate) => void): void {
    this.listeners.add(callback);
  }

  public offUpdate(callback: (update: RuntimeUpdate) => void): void {
    this.listeners.delete(callback);
  }

  public emit(update: RuntimeUpdate): void {
    // Store latest data for each module
    this.latestData.set(update.moduleId, update.runtimeData);
    
    // Notify all listeners
    this.listeners.forEach(l => l(update));
  }

  public getLatest(moduleId: string): Record<string, any> {
    return this.latestData.get(moduleId) || {};
  }

  public clear(): void {
    this.latestData.clear();
    this.listeners.clear();
  }
}

export const runtimeBus = new RuntimeBus();



