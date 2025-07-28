interface ConnectionState {
  sourceNodeId: string;
  sourceHandleId: string;
  targetNodeId: string;
  targetHandleId: string;
  connectionType: string;
}

class ConnectionStateTracker {
  private static instance: ConnectionStateTracker;
  private connections: Map<string, ConnectionState> = new Map();
  private listeners: Map<string, Set<() => void>> = new Map();

  private constructor() {}

  public static getInstance(): ConnectionStateTracker {
    if (!ConnectionStateTracker.instance) {
      ConnectionStateTracker.instance = new ConnectionStateTracker();
    }
    return ConnectionStateTracker.instance;
  }

  /**
   * Add a connection
   */
  public addConnection(
    sourceNodeId: string,
    sourceHandleId: string,
    targetNodeId: string,
    targetHandleId: string,
    connectionType: string
  ): void {
    const connectionKey = `${sourceNodeId}:${sourceHandleId}:${targetNodeId}:${targetHandleId}`;
    this.connections.set(connectionKey, {
      sourceNodeId,
      sourceHandleId,
      targetNodeId,
      targetHandleId,
      connectionType
    });
    this.emit('connectionChanged');
  }

  /**
   * Remove a connection
   */
  public removeConnection(
    sourceNodeId: string,
    sourceHandleId: string,
    targetNodeId: string,
    targetHandleId: string
  ): void {
    const connectionKey = `${sourceNodeId}:${sourceHandleId}:${targetNodeId}:${targetHandleId}`;

    this.connections.delete(connectionKey);
    this.emit('connectionChanged');
  }

  /**
   * Update an existing connection's type
   */
  public updateConnection(
    sourceNodeId: string,
    sourceHandleId: string,
    targetNodeId: string,
    targetHandleId: string,
    newConnectionType: string
  ): void {
    const connectionKey = `${sourceNodeId}:${sourceHandleId}:${targetNodeId}:${targetHandleId}`;
    const existingConnection = this.connections.get(connectionKey);
    
    if (existingConnection && existingConnection.connectionType !== newConnectionType) {
      this.connections.set(connectionKey, {
        ...existingConnection,
        connectionType: newConnectionType
      });
      this.emit('connectionChanged');
    }
  }

  /**
   * Get connection type for a specific handle
   */
  public getConnectionType(sourceNodeId: string, sourceHandleId: string): string | null {
    for (const [key, connection] of this.connections) {
      if (connection.sourceNodeId === sourceNodeId && connection.sourceHandleId === sourceHandleId) {
        return connection.connectionType;
      }
    }
    return null;
  }

  /**
   * Get all connections for a node
   */
  public getConnectionsForNode(nodeId: string): ConnectionState[] {
    return Array.from(this.connections.values()).filter(
      connection => connection.sourceNodeId === nodeId || connection.targetNodeId === nodeId
    );
  }

  /**
   * Clear all connections
   */
  public clear(): void {
    this.connections.clear();
  }

  /**
   * Get all connections
   */
  public getAllConnections(): ConnectionState[] {
    return Array.from(this.connections.values());
  }

  /**
   * Subscribe to connection state changes
   */
  public on(event: string, callback: () => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from connection state changes
   */
  public off(event: string, callback: () => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  /**
   * Emit connection state change event
   */
  private emit(event: string): void {
    const eventListeners = this.listeners.get(event);

    if (eventListeners) {
      eventListeners.forEach(callback => callback());
    }
  }
}

export const connectionStateTracker = ConnectionStateTracker.getInstance();
export type { ConnectionState }; 