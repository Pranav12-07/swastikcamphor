declare module 'cloudflare:sockets' {
  export interface SocketOptions {
    secureTransport?: 'off' | 'on' | 'starttls'
    allowHalfOpen?: boolean
  }
  export interface Socket {
    readable: ReadableStream<Uint8Array>
    writable: WritableStream<Uint8Array>
    closed: Promise<void>
    close(): Promise<void>
    startTls(): Socket
  }
  export function connect(
    address: { hostname: string; port: number } | string,
    options?: SocketOptions
  ): Socket
}
