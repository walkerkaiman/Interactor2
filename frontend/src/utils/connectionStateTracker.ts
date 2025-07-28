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
}

export const connectionStateTracker = ConnectionStateTracker.getInstance();
export type { ConnectionState }; 