export interface TriggerEvent {
  moduleId: string;
  timestamp: number;
  source: string;
}

// Simple event emitter for browser environment
class EventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: Function): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(...args));
    }
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}

class TriggerEventTracker extends EventEmitter {
  private static instance: TriggerEventTracker;
  private activePulses: Set<string> = new Set();

  private constructor() {
    super();
  }

  public static getInstance(): TriggerEventTracker {
    if (!TriggerEventTracker.instance) {
      TriggerEventTracker.instance = new TriggerEventTracker();
    }
    return TriggerEventTracker.instance;
  }

  /**
   * Record a trigger event and emit it to listeners
   */
  public recordTriggerEvent(moduleId: string, source: string = 'unknown'): void {
    const event: TriggerEvent = {
      moduleId,
      timestamp: Date.now(),
      source
    };

    // Add to active pulses
    this.activePulses.add(moduleId);
    
    // Emit the event
    this.emit('triggerEvent', event);
    
    // Remove from active pulses after animation duration
    setTimeout(() => {
      this.activePulses.delete(moduleId);
      this.emit('pulseEnded', moduleId);
    }, 600); // Match the CSS animation duration
  }

  /**
   * Check if a module is currently pulsing
   */
  public isPulsing(moduleId: string): boolean {
    return this.activePulses.has(moduleId);
  }

  /**
   * Get all currently pulsing modules
   */
  public getActivePulses(): string[] {
    return Array.from(this.activePulses);
  }

  /**
   * Clear all active pulses
   */
  public clearAllPulses(): void {
    this.activePulses.clear();
    this.emit('allPulsesCleared');
  }
}

export const triggerEventTracker = TriggerEventTracker.getInstance(); 