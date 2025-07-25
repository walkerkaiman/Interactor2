declare module 'osc' {
  export interface UDPPortOptions {
    localAddress?: string;
    localPort?: number;
    remoteAddress?: string;
    remotePort?: number;
    metadata?: boolean;
  }

  export interface OscMessage {
    address: string;
    args?: any[];
    oscType?: string;
  }

  export class UDPPort {
    constructor(options: UDPPortOptions);
    
    on(event: 'ready', callback: () => void): this;
    on(event: 'message', callback: (message: OscMessage) => void): this;
    on(event: 'error', callback: (error: Error) => void): this;
    on(event: string, callback: (...args: any[]) => void): this;
    
    open(): void;
    close(): void;
    send(message: OscMessage): void;
  }
} 