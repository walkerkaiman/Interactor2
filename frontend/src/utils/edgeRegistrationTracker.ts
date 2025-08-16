import { InteractionConfig } from '@interactor/shared';

export interface EdgeRegistrationTracker {
  registeredEdges: Set<string>;
  unregisteredEdges: Set<string>;
  isEdgeRegistered: (edgeId: string) => boolean;
  registerEdge: (edgeId: string) => void;
  unregisterEdge: (edgeId: string) => void;
  updateFromInteractions: (registeredInteractions: InteractionConfig[], localInteractions: InteractionConfig[]) => void;
  registerNewBackendEdges: (registeredInteractions: InteractionConfig[]) => void;
  clear: () => void;
  on: (event: string, callback: (edgeId: string) => void) => void;
  off: (event: string, callback: (edgeId: string) => void) => void;
}

class EdgeRegistrationTrackerImpl implements EdgeRegistrationTracker {
  private static instance: EdgeRegistrationTrackerImpl;
  public registeredEdges: Set<string> = new Set();
  public unregisteredEdges: Set<string> = new Set();
  private listeners: Map<string, Set<(edgeId: string) => void>> = new Map();

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): EdgeRegistrationTrackerImpl {
    if (!EdgeRegistrationTrackerImpl.instance) {
      EdgeRegistrationTrackerImpl.instance = new EdgeRegistrationTrackerImpl();
    }
    return EdgeRegistrationTrackerImpl.instance;
  }

  isEdgeRegistered(edgeId: string): boolean {
    const isRegistered = this.registeredEdges.has(edgeId);
    return isRegistered;
  }

  registerEdge(edgeId: string): void {
    this.registeredEdges.add(edgeId);
    this.unregisteredEdges.delete(edgeId);
    this.emit('registrationChanged', edgeId);
  }

  unregisterEdge(edgeId: string): void {
    this.unregisteredEdges.add(edgeId);
    this.registeredEdges.delete(edgeId);
    this.emit('registrationChanged', edgeId);
  }

  updateFromInteractions(registeredInteractions: InteractionConfig[], localInteractions: InteractionConfig[]): void {
    // Clear current state
    this.registeredEdges.clear();
    this.unregisteredEdges.clear();

    // Process backend interactions (registered edges - animated)
    registeredInteractions.forEach(interaction => {
      interaction.routes?.forEach(route => {
        const edgeId = this.getEdgeIdFromRoute(route);
        this.registeredEdges.add(edgeId);
        this.emit('registrationChanged', edgeId);
      });
    });

    // Process local interactions (unregistered edges - static)
    localInteractions.forEach(interaction => {
      interaction.routes?.forEach(route => {
        const edgeId = this.getEdgeIdFromRoute(route);
        this.unregisteredEdges.add(edgeId);
        this.emit('registrationChanged', edgeId);
      });
    });
  }

  registerNewBackendEdges(registeredInteractions: InteractionConfig[]): void {
    // Only register new edges from backend, don't clear existing states
    registeredInteractions.forEach(interaction => {
      interaction.routes?.forEach(route => {
        const edgeId = this.getEdgeIdFromRoute(route);
        // Only register if not already tracked
        if (!this.registeredEdges.has(edgeId) && !this.unregisteredEdges.has(edgeId)) {
          this.registeredEdges.add(edgeId);
          this.emit('registrationChanged', edgeId);
        }
      });
    });
  }

  clear(): void {
    this.registeredEdges.clear();
    this.unregisteredEdges.clear();
  }

  on(event: string, callback: (edgeId: string) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (edgeId: string) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, edgeId: string): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(edgeId));
    }
  }

  // Helper methods


  private getEdgeIdFromRoute(route: any): string {
    return route.id || `${route.source}-${route.target}`;
  }
}

export const edgeRegistrationTracker = EdgeRegistrationTrackerImpl.getInstance(); 