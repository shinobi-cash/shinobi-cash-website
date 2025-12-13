/**
 * Buffer polyfill type declarations
 */

declare global {
  interface Window {
    Buffer?: {
      from(data: string | ArrayBuffer | Uint8Array, encoding?: string): Uint8Array;
      isBuffer(obj: unknown): boolean;
    };
  }

  var Buffer: {
    from(data: string | ArrayBuffer | Uint8Array, encoding?: string): Uint8Array;
    isBuffer(obj: unknown): boolean;
  };
}

export {};
