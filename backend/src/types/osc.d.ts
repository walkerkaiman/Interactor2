declare module 'osc' {
  export interface OscMessage {
    address: string;
    args: any[];
  }

  export interface OscBundle {
    timeTag: number;
    packets: (OscMessage | OscBundle)[];
  }

  export interface OscPort {
    on(event: string, callback: (message: OscMessage, timeTag: number, info: any) => void): void;
    send(message: OscMessage, address?: string, port?: number): void;
    open(): void;
    close(): void;
  }

  export function udpPort(options: {
    localAddress?: string;
    localPort?: number;
    remoteAddress?: string;
    remotePort?: number;
  }): OscPort;

  export class UDPPort extends OscPort {}

  export function tcpPort(options: {
    localAddress?: string;
    localPort?: number;
    remoteAddress?: string;
    remotePort?: number;
  }): OscPort;

  export function serialPort(options: {
    deviceId?: string;
    baudRate?: number;
  }): OscPort;
} 