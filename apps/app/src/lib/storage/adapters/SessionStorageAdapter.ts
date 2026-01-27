/**
 * Browser Storage Adapter
 * Handles localStorage and sessionStorage with consistent API
 */

import { IBrowserStorageAdapter } from "./types";
import { logError } from "@/lib/errors/errors";

export class BrowserStorageAdapter<T = string> implements IBrowserStorageAdapter<T> {
  constructor(private storage: Storage) {}

  async get(key: string): Promise<T | null> {
    const value = this.storage.getItem(key);
    if (value === null) return null;

    // Try to parse as JSON, fallback to raw string
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async set(key: string, value: T): Promise<void> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    this.storage.setItem(key, serialized);
  }

  async remove(key: string): Promise<void> {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      // Best-effort cleanup - log but don't throw
      logError(error, { action: "removeFromStorage", key });
    }
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async has(key: string): Promise<boolean> {
    return this.storage.getItem(key) !== null;
  }

  async keys(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  }
}

// Concrete implementations for localStorage and sessionStorage
// Use lazy initialization to avoid SSR issues
export const sessionStorageAdapter = new BrowserStorageAdapter<unknown>(
  typeof window !== "undefined" ? sessionStorage : ({} as Storage)
);
